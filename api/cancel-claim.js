const { createClient } = require('@supabase/supabase-js');

function cleanText(value) {
  return String(value ?? '').trim();
}

function getBearerToken(request) {
  const header = request.headers.authorization || request.headers.Authorization || '';
  return String(header).startsWith('Bearer ') ? String(header).slice(7) : '';
}

async function getAuthedUser(request, supabaseUrl, publishableKey) {
  const token = getBearerToken(request);

  if (!token) {
    return { user: null, error: 'Sign in as the claimer first.' };
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

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_JWT || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    response.status(500).json({ error: 'Supabase environment is not configured' });
    return;
  }

  const { user, error: authError } = await getAuthedUser(request, supabaseUrl, publishableKey);

  if (!user) {
    response.status(401).json({ error: authError || 'Sign in as the claimer first.' });
    return;
  }

  const claimId = cleanText(request.body?.claimId);

  if (!claimId) {
    response.status(400).json({ error: 'claimId is required.' });
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
    .select('id, creator_id, creator_name, status, stake_amount_cents')
    .eq('id', claimId)
    .single();

  if (claimError || !claim) {
    response.status(404).json({ error: claimError?.message || 'Claim not found.' });
    return;
  }

  if (claim.creator_id !== user.id) {
    response.status(403).json({ error: 'Only the claimer can cancel this claim.' });
    return;
  }

  if (['live', 'under_review', 'verified', 'not_proven', 'cancelled', 'disputed'].includes(claim.status)) {
    response.status(409).json({ error: 'This claim can no longer be cancelled through the early cancellation rule.' });
    return;
  }

  const { data: pledges, error: pledgeError } = await supabaseAdmin
    .from('claim_pledges')
    .select('amount_cents, status')
    .eq('claim_id', claim.id);

  if (pledgeError) {
    response.status(400).json({ error: pledgeError.message });
    return;
  }

  const grossPledgeCents = (pledges ?? [])
    .filter((pledge) => ['intent', 'authorized', 'collected'].includes(pledge.status))
    .reduce((total, pledge) => total + Number(pledge.amount_cents || 0), 0);
  const lockedAmountCents = Number(claim.stake_amount_cents || 0);
  const lockedMinusCommissionCents = Math.floor(lockedAmountCents * 0.925);

  if (grossPledgeCents >= lockedMinusCommissionCents) {
    response.status(409).json({ error: 'Pledges are high enough that admin review is required before cancellation.' });
    return;
  }

  const now = new Date().toISOString();
  const { error: claimUpdateError } = await supabaseAdmin
    .from('claims')
    .update({ status: 'cancelled' })
    .eq('id', claim.id);

  if (claimUpdateError) {
    response.status(400).json({ error: claimUpdateError.message });
    return;
  }

  await supabaseAdmin.from('claim_results').upsert({
    admin_notes: 'Claimer cancelled before pledge pool reached locked amount minus platform commission.',
    appeal_deadline_at: now,
    claim_id: claim.id,
    outcome_source: 'admin',
    published_at: now,
    reviewer_name: claim.creator_name,
    settlement_ready_at: now,
    status: 'cancelled',
    summary: 'Claim cancelled under the early cancellation rule. No platform commission applies.',
  }, { onConflict: 'claim_id' });

  await supabaseAdmin.from('claim_settlements').upsert({
    claim_id: claim.id,
    donation_cents: 0,
    gross_pledge_cents: grossPledgeCents,
    locked_amount_cents: lockedAmountCents,
    net_locked_amount_cents: lockedAmountCents,
    net_pledge_cents: grossPledgeCents,
    notes: 'Full locked amount and supporter pledges are refundable. No platform commission applies.',
    outcome: 'cancelled',
    platform_commission_bps: 0,
    ready_at: now,
    status: 'ready',
  }, { onConflict: 'claim_id' });

  response.status(200).json({ ok: true, status: 'cancelled' });
};
