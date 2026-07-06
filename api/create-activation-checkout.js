const { createClient } = require('@supabase/supabase-js');
const stripeFactory = require('stripe');

function json(response, status, body) {
  response.status(status).json(body);
}

function getBearerToken(request) {
  const header = request.headers.authorization || request.headers.Authorization || '';
  return String(header).startsWith('Bearer ') ? String(header).slice(7) : '';
}

function getOrigin(request) {
  const configuredOrigin = process.env.VITE_AUTH_REDIRECT_ORIGIN || process.env.APP_ORIGIN;
  const origin = request.headers.origin || configuredOrigin;
  return String(origin || '').replace(/\/$/, '');
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function isEnabled(value) {
  return value === true;
}

function buildActivationSetupSummary(setup) {
  return [
    isEnabled(setup.selfRecording)
      ? `Claimer recorder: ${cleanText(setup.selfName) || 'claimer'}${cleanText(setup.selfContact) ? ` (${cleanText(setup.selfContact)})` : ''}.`
      : '',
    isEnabled(setup.otherRecorder)
      ? `Additional recorder: ${cleanText(setup.recorderName) || 'recorder'}${cleanText(setup.recorderContact) ? ` (${cleanText(setup.recorderContact)})` : ''}. Responsibilities: ${cleanText(setup.recorderResponsibilities) || 'not provided'}.`
      : '',
    isEnabled(setup.externalProof)
      ? `External proof source: ${cleanText(setup.externalProofLabel) || 'proof source'}. ${cleanText(setup.externalProofDetails)} ${cleanText(setup.externalProofLink)}`.trim()
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function getAuthedUser(request, supabaseUrl, publishableKey) {
  const token = getBearerToken(request);

  if (!token) {
    return { user: null, error: 'Sign in before activation.' };
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error } = await supabase.auth.getUser(token);

  return { user: data.user ?? null, error: error?.message };
}

async function insertInviteIfMissing(supabaseAdmin, claimId, invite) {
  const contact = cleanText(invite.invitee_contact);

  if (contact) {
    const { data: existingInvite } = await supabaseAdmin
      .from('claim_recorder_invites')
      .select('id')
      .eq('claim_id', claimId)
      .eq('invitee_contact', contact)
      .neq('status', 'declined')
      .maybeSingle();

    if (existingInvite) {
      return;
    }
  }

  await supabaseAdmin.from('claim_recorder_invites').insert({
    claim_id: claimId,
    role: invite.role || 'recorder',
    invitee_name: cleanText(invite.invitee_name) || null,
    invitee_contact: contact || null,
    payout_share_bps: Math.max(0, Math.min(10000, Number(invite.payout_share_bps || 0))),
    responsibilities: cleanText(invite.responsibilities) || null,
    status: invite.status || 'pending',
  });
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    json(response, 405, { error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_JWT || process.env.SUPABASE_SECRET_KEY;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const origin = getOrigin(request);

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    json(response, 500, { error: 'Server Supabase configuration is incomplete.' });
    return;
  }

  if (!stripeSecretKey) {
    json(response, 500, { error: 'Stripe is not configured yet. Add STRIPE_SECRET_KEY and retry activation.' });
    return;
  }

  if (!origin) {
    json(response, 500, { error: 'App origin is not configured.' });
    return;
  }

  const { user, error: authError } = await getAuthedUser(request, supabaseUrl, publishableKey);

  if (!user) {
    json(response, 401, { error: authError || 'Sign in before activation.' });
    return;
  }

  const claimId = cleanText(request.body?.claimId);
  const setup = request.body?.setup ?? {};

  if (!claimId) {
    json(response, 400, { error: 'claimId is required.' });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data: claim, error: claimError } = await supabaseAdmin
    .from('claims')
    .select('id, slug, creator_id, creator_name, contact_email, title, stake_amount_cents, status')
    .eq('id', claimId)
    .single();

  if (claimError || !claim) {
    json(response, 404, { error: claimError?.message || 'Claim not found.' });
    return;
  }

  if (claim.creator_id !== user.id) {
    json(response, 403, { error: 'Only the claimer can activate this draft.' });
    return;
  }

  if (claim.status !== 'draft') {
    json(response, 400, { error: 'Only draft claims can be activated.' });
    return;
  }

  if (!isEnabled(setup.selfRecording) && !isEnabled(setup.otherRecorder) && !isEnabled(setup.externalProof)) {
    json(response, 400, { error: 'Enable at least one proof setup option.' });
    return;
  }

  if (isEnabled(setup.selfRecording)) {
    await insertInviteIfMissing(supabaseAdmin, claim.id, {
      role: 'recorder',
      invitee_name: cleanText(setup.selfName) || claim.creator_name,
      invitee_contact: cleanText(setup.selfContact) || claim.contact_email,
      payout_share_bps: 0,
      responsibilities: 'Claimer will record their own live proof and preserve activation evidence.',
      status: 'accepted',
    });
  }

  if (isEnabled(setup.otherRecorder)) {
    await insertInviteIfMissing(supabaseAdmin, claim.id, {
      role: 'recorder',
      invitee_name: cleanText(setup.recorderName),
      invitee_contact: cleanText(setup.recorderContact),
      payout_share_bps: setup.payoutShareBps,
      responsibilities: cleanText(setup.recorderResponsibilities),
      status: 'pending',
    });
  }

  const setupSummary = buildActivationSetupSummary(setup);
  const amountCents = Number(claim.stake_amount_cents || 0);

  if (amountCents < 50) {
    json(response, 400, { error: 'Activation charge must be at least $0.50. Edit the stake amount before activating.' });
    return;
  }

  const stripe = stripeFactory(stripeSecretKey);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    client_reference_id: claim.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: process.env.STRIPE_ACTIVATION_CURRENCY || 'usd',
          unit_amount: amountCents,
          product_data: {
            name: `Activate Claimroom claim`,
            description: claim.title.slice(0, 240),
          },
        },
      },
    ],
    metadata: {
      claimId: claim.id,
      userId: user.id,
      setupSummary: setupSummary.slice(0, 500),
    },
    success_url: `${origin}/claims/${claim.slug}?mode=activate&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/claims/${claim.slug}?mode=activate&checkout=cancel`,
  });

  json(response, 200, { url: session.url });
};
