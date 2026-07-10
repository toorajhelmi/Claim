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
    return { user: null, error: null };
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error } = await supabase.auth.getUser(token);

  return { user: data.user ?? null, error: error?.message ?? null };
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

  const { claimId } = request.body ?? {};

  if (!claimId) {
    response.status(400).json({ error: 'claimId is required' });
    return;
  }

  const { user, error: authError } = await getAuthedUser(request, supabaseUrl, publishableKey);
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: claim, error: claimError } = await supabaseAdmin
    .from('claims')
    .select('id, creator_id, status, pledge_threshold_cents')
    .eq('id', claimId)
    .single();

  if (claimError || !claim) {
    response.status(404).json({ error: claimError?.message || 'Claim not found' });
    return;
  }

  const requiresPledge = Number(claim.pledge_threshold_cents || 0) > 0;
  const isSatisfiedOutcome = claim.status === 'verified';

  if (!requiresPledge || !isSatisfiedOutcome) {
    response.status(200).json({
      canViewSatisfiedOutcome: true,
      hasPledged: false,
      isOwner: Boolean(user && claim.creator_id === user.id),
      isRecorder: false,
      requiresPledgeToView: false,
    });
    return;
  }

  if (!user) {
    response.status(200).json({
      canViewSatisfiedOutcome: false,
      hasPledged: false,
      isOwner: false,
      isRecorder: false,
      requiresPledgeToView: true,
      authError,
    });
    return;
  }

  const userEmail = cleanText(user.email).toLowerCase();
  const { data: recorderInvite } = userEmail
    ? await supabaseAdmin
      .from('claim_recorder_invites')
      .select('id')
      .eq('claim_id', claim.id)
      .eq('status', 'accepted')
      .ilike('invitee_contact', userEmail)
      .limit(1)
      .maybeSingle()
    : { data: null };
  const isOwner = claim.creator_id === user.id;
  const isRecorder = Boolean(recorderInvite);

  if (isOwner || isRecorder) {
    response.status(200).json({
      canViewSatisfiedOutcome: true,
      hasPledged: false,
      isOwner,
      isRecorder,
      requiresPledgeToView: true,
    });
    return;
  }

  const { data: pledge } = userEmail
    ? await supabaseAdmin
      .from('claim_pledges')
      .select('id')
      .eq('claim_id', claim.id)
      .ilike('supporter_email', userEmail)
      .in('status', ['intent', 'authorized', 'collected'])
      .limit(1)
      .maybeSingle()
    : { data: null };

  response.status(200).json({
    canViewSatisfiedOutcome: Boolean(pledge),
    hasPledged: Boolean(pledge),
    isOwner,
    isRecorder,
    requiresPledgeToView: true,
  });
};
