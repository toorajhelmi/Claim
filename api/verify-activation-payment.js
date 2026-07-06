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

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(value));
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

function buildRecorderEmailHtml({ appName, claim, claimUrl, inviteUrl, invite }) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#05070d;color:#f8fbff;padding:32px">
      <div style="max-width:620px;margin:0 auto;background:#10141f;border:1px solid rgba(255,255,255,0.12);border-radius:24px;overflow:hidden">
        <div style="padding:24px 28px;background:linear-gradient(135deg,rgba(112,255,139,0.18),rgba(66,221,255,0.14))">
          <div style="display:inline-block;background:#111827;border-radius:999px;padding:8px 12px;font-weight:800">Claimroom</div>
          <h1 style="margin:18px 0 0;font-size:30px;line-height:1.08">You are invited to support proof for a claim.</h1>
        </div>
        <div style="padding:28px">
          <p style="color:#cbd2df;font-size:16px;line-height:1.6">
            ${claim.creator_name} activated this ${appName} claim and listed you as a proof recorder/source.
          </p>
          <h2 style="font-size:22px;line-height:1.2;margin:18px 0">${claim.title}</h2>
          <p style="color:#cbd2df;font-size:16px;line-height:1.6">
            ${cleanText(invite.responsibilities) || 'Help capture and preserve the live proof evidence for AI-assisted review.'}
          </p>
          <p style="margin:26px 0">
            <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#70ff8b,#42ddff);color:#041006;text-decoration:none;font-weight:900;border-radius:999px;padding:14px 22px">
              Review recorder instructions
            </a>
          </p>
          <p style="color:#8d96a8;font-size:13px;line-height:1.6">
            Claim page: <a href="${claimUrl}" style="color:#70ff8b">${claimUrl}</a>
          </p>
        </div>
        <div style="padding:20px 28px;border-top:1px solid rgba(255,255,255,0.1);color:#8d96a8;font-size:13px;line-height:1.6">
          Want to follow the proof live? <a href="${claimUrl}" style="color:#70ff8b;font-weight:800">Join claim</a>
        </div>
      </div>
    </div>
  `;
}

async function sendRecorderEmails({ resendApiKey, fromEmail, appName, origin, claim, invites }) {
  if (!resendApiKey) {
    return { sent: 0, skipped: invites.length, warning: 'Resend is not configured.' };
  }

  let sent = 0;
  let skipped = 0;

  for (const invite of invites) {
    if (!isEmail(invite.invitee_contact)) {
      skipped += 1;
      continue;
    }

    const claimUrl = `${origin}/claims/${claim.slug}`;
    const inviteUrl = `${origin}/recorder/invite/${invite.invite_token}`;
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [invite.invitee_contact],
        subject: `Recorder invite: ${claim.title}`,
        html: buildRecorderEmailHtml({
          appName,
          claim,
          claimUrl,
          inviteUrl,
          invite,
        }),
      }),
    });

    if (resendResponse.ok) {
      sent += 1;
    } else {
      skipped += 1;
    }
  }

  return { sent, skipped };
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

  const { user, error: authError } = await getAuthedUser(request, supabaseUrl, publishableKey);

  if (!user) {
    json(response, 401, { error: authError || 'Sign in before activation.' });
    return;
  }

  const sessionId = cleanText(request.body?.sessionId);

  if (!sessionId) {
    json(response, 400, { error: 'sessionId is required.' });
    return;
  }

  const stripe = stripeFactory(stripeSecretKey);
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') {
    json(response, 402, { error: 'Payment was not completed. Please retry.' });
    return;
  }

  const claimId = cleanText(session.metadata?.claimId);

  if (!claimId) {
    json(response, 400, { error: 'Payment session is missing claim metadata.' });
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
    .select('id, slug, creator_id, creator_name, title, status, proof_summary')
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

  if (claim.status !== 'open_for_backing') {
    const setupSummary = cleanText(session.metadata?.setupSummary);
    const proofSummary = [
      claim.proof_summary ?? '',
      setupSummary ? `Activation setup:\n${setupSummary}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    const { error: updateError } = await supabaseAdmin
      .from('claims')
      .update({
        status: 'open_for_backing',
        proof_summary: proofSummary,
      })
      .eq('id', claim.id);

    if (updateError) {
      json(response, 400, { error: updateError.message });
      return;
    }
  }

  const { data: invites } = await supabaseAdmin
    .from('claim_recorder_invites')
    .select('invite_token, invitee_contact, responsibilities')
    .eq('claim_id', claim.id)
    .eq('status', 'pending');

  const emailResult = await sendRecorderEmails({
    resendApiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'Claimroom <onboarding@resend.dev>',
    appName: process.env.VITE_APP_NAME || 'Claimroom',
    origin,
    claim,
    invites: invites ?? [],
  });

  json(response, 200, {
    ok: true,
    claimId: claim.id,
    emailResult,
  });
};
