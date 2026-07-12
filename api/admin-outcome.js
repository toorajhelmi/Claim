const { createClient } = require('@supabase/supabase-js');

function cleanText(value) {
  return String(value ?? '').trim();
}

function getBearerToken(request) {
  const header = request.headers.authorization || request.headers.Authorization || '';
  return String(header).startsWith('Bearer ') ? String(header).slice(7) : '';
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString();
}

async function getAuthedUser(request, supabaseUrl, publishableKey) {
  const token = getBearerToken(request);

  if (!token) {
    return { user: null, error: 'Sign in as an admin first.' };
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

function computeSettlement({ claim, decision, donationSetting, pledges, platformCommissionBps }) {
  const grossPledgeCents = pledges
    .filter((pledge) => ['intent', 'authorized', 'collected'].includes(pledge.status))
    .reduce((total, pledge) => total + Number(pledge.amount_cents || 0), 0);
  const commissionMultiplier = Math.max(0, 10000 - platformCommissionBps) / 10000;
  const netPledgeCents = decision === 'cancelled' ? grossPledgeCents : Math.floor(grossPledgeCents * commissionMultiplier);
  const lockedAmountCents = Number(claim.stake_amount_cents || 0);
  const netLockedAmountCents = decision === 'cancelled'
    ? lockedAmountCents
    : Math.floor(lockedAmountCents * commissionMultiplier);
  const donationCents = decision === 'declined'
    ? pledges
      .filter((pledge) => pledge.wants_donate)
      .reduce((total, pledge) => total + Number(pledge.amount_cents || 0), 0)
    : 0;
  const successDonationCents = decision === 'accepted' && donationSetting
    ? Math.floor(netPledgeCents * Number(donationSetting.success_donation_bps || 0) / 10000)
    : 0;

  return {
    donation_cents: decision === 'accepted' ? successDonationCents : donationCents,
    failure_donation_cents: donationCents,
    gross_pledge_cents: grossPledgeCents,
    locked_amount_cents: lockedAmountCents,
    net_locked_amount_cents: netLockedAmountCents,
    net_pledge_cents: netPledgeCents,
    success_donation_cents: successDonationCents,
  };
}

async function upsertCharityPaymentTasks({ claimId, decision, donationSetting, settlement, supabaseAdmin }) {
  if (!donationSetting) {
    return;
  }

  const paymentTasks = [];

  if (decision === 'accepted' && settlement.success_donation_cents > 0) {
    paymentTasks.push({
      amount_cents: settlement.success_donation_cents,
      admin_notes: null,
      claim_id: claimId,
      completed_at: null,
      invoice_url: null,
      organization_id: donationSetting.organization_id,
      payment_url: null,
      payment_reason: 'success_share',
      receipt_url: null,
      status: 'pending',
    });
  }

  if (decision === 'declined' && settlement.failure_donation_cents > 0) {
    paymentTasks.push({
      amount_cents: settlement.failure_donation_cents,
      admin_notes: null,
      claim_id: claimId,
      completed_at: null,
      invoice_url: null,
      organization_id: donationSetting.organization_id,
      payment_url: null,
      payment_reason: 'supporter_failure_donation',
      receipt_url: null,
      status: 'pending',
    });
  }

  if (paymentTasks.length > 0) {
    const { error } = await supabaseAdmin
      .from('claim_charity_payments')
      .upsert(paymentTasks, { onConflict: 'claim_id,payment_reason' });

    if (error) {
      throw error;
    }
  }

  const activeReasons = paymentTasks.map((task) => task.payment_reason);
  const { error: cancelError } = await supabaseAdmin
    .from('claim_charity_payments')
    .update({
      status: 'cancelled',
      admin_notes: 'Cancelled because the latest outcome no longer creates this charity payment.',
    })
    .eq('claim_id', claimId)
    .not('payment_reason', 'in', `(${activeReasons.map((reason) => `"${reason}"`).join(',') || '""'})`)
    .eq('status', 'pending');

  if (cancelError) {
    throw cancelError;
  }
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
    response.status(401).json({ error: authError || 'Sign in as an admin first.' });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data: adminProfile, error: adminError } = await supabaseAdmin
    .from('profiles')
    .select('display_name, platform_role')
    .eq('id', user.id)
    .single();

  if (adminError || adminProfile?.platform_role !== 'admin') {
    response.status(403).json({ error: 'Admin access is required.' });
    return;
  }

  const claimId = cleanText(request.body?.claimId);
  const decision = cleanText(request.body?.decision);
  const summary = cleanText(request.body?.summary);
  const platformCommissionBps = Math.min(10000, Math.max(0, Number(request.body?.platformCommissionBps ?? 750)));

  if (!claimId || !['accepted', 'declined', 'cancelled'].includes(decision) || !summary) {
    response.status(400).json({ error: 'claimId, decision, and summary are required.' });
    return;
  }

  const { data: claim, error: claimError } = await supabaseAdmin
    .from('claims')
    .select('id, status, stake_amount_cents')
    .eq('id', claimId)
    .single();

  if (claimError || !claim) {
    response.status(404).json({ error: claimError?.message || 'Claim not found.' });
    return;
  }

  const { data: pledges, error: pledgesError } = await supabaseAdmin
    .from('claim_pledges')
    .select('amount_cents, status, wants_donate')
    .eq('claim_id', claim.id);

  if (pledgesError) {
    response.status(400).json({ error: pledgesError.message });
    return;
  }

  const { data: donationSetting, error: donationSettingError } = await supabaseAdmin
    .from('claim_donation_settings')
    .select('claim_id, organization_id, success_donation_bps')
    .eq('claim_id', claim.id)
    .maybeSingle();

  if (donationSettingError) {
    response.status(400).json({ error: donationSettingError.message });
    return;
  }

  const now = new Date();
  const publishedAt = now.toISOString();
  const appealDeadlineAt = addHours(now, 24);
  const claimStatus = decision === 'accepted'
    ? 'verified'
    : decision === 'declined'
      ? 'not_proven'
      : 'cancelled';
  const resultStatus = decision === 'accepted'
    ? 'verified'
    : decision === 'declined'
      ? 'not_proven'
      : 'cancelled';
  const settlement = computeSettlement({
    claim,
    decision,
    donationSetting,
    pledges: pledges ?? [],
    platformCommissionBps,
  });

  const { error: decisionError } = await supabaseAdmin.from('claim_admin_decisions').insert({
    admin_id: user.id,
    claim_id: claim.id,
    decision,
    summary,
  });

  if (decisionError) {
    response.status(400).json({ error: decisionError.message });
    return;
  }

  const { error: resultError } = await supabaseAdmin.from('claim_results').upsert({
    admin_notes: summary,
    appeal_deadline_at: appealDeadlineAt,
    claim_id: claim.id,
    outcome_source: claim.status === 'verified' || claim.status === 'not_proven' || claim.status === 'cancelled'
      ? 'appeal_admin'
      : 'admin',
    published_at: publishedAt,
    reviewer_name: cleanText(adminProfile.display_name) || cleanText(user.email) || 'Klaimd admin',
    settlement_ready_at: appealDeadlineAt,
    status: resultStatus,
    summary,
    vote_deadline_at: null,
  }, { onConflict: 'claim_id' });

  if (resultError) {
    response.status(400).json({ error: resultError.message });
    return;
  }

  const { error: claimUpdateError } = await supabaseAdmin
    .from('claims')
    .update({ status: claimStatus })
    .eq('id', claim.id);

  if (claimUpdateError) {
    response.status(400).json({ error: claimUpdateError.message });
    return;
  }

  const { error: settlementError } = await supabaseAdmin.from('claim_settlements').upsert({
    ...settlement,
    claim_id: claim.id,
    notes: decision === 'accepted'
      ? 'After appeals close, net pledges can be paid to the claimer or donated when donation flow exists.'
      : decision === 'declined'
        ? 'After appeals close, net locked amount can be distributed to supporters who did not choose donation.'
        : 'Cancellation returns locked amount and supporter pledges without platform commission.',
    outcome: decision,
    platform_commission_bps: platformCommissionBps,
    ready_at: appealDeadlineAt,
    status: 'blocked_by_appeal',
  }, { onConflict: 'claim_id' });

  if (settlementError) {
    response.status(400).json({ error: settlementError.message });
    return;
  }

  try {
    await upsertCharityPaymentTasks({
      claimId: claim.id,
      decision,
      donationSetting,
      settlement,
      supabaseAdmin,
    });
  } catch (charityPaymentError) {
    response.status(400).json({ error: charityPaymentError.message });
    return;
  }

  response.status(200).json({
    appealDeadlineAt,
    decision,
    ok: true,
    settlement,
    status: claimStatus,
  });
};
