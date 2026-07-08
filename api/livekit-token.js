const { AccessToken } = require('livekit-server-sdk');
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
    return { user: null, error: 'Sign in before joining a live room.' };
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

function getDisplayName({ user, claim, recorderInvite, role }) {
  if (role === 'claimer') {
    return cleanText(claim.creator_name)
      || cleanText(user.user_metadata?.display_name)
      || cleanText(user.email?.split('@')[0])
      || 'Claimer';
  }

  if (role === 'recorder') {
    return cleanText(recorderInvite?.invitee_name)
      || cleanText(user.user_metadata?.display_name)
      || cleanText(user.email?.split('@')[0])
      || 'Recorder';
  }

  return cleanText(user.user_metadata?.display_name)
    || cleanText(user.email?.split('@')[0])
    || 'Supporter';
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { claimSlug, mode = 'test' } = request.body ?? {};

  if (!claimSlug) {
    response.status(400).json({ error: 'claimSlug is required' });
    return;
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL || process.env.VITE_LIVEKIT_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_JWT || process.env.SUPABASE_SECRET_KEY;

  if (!apiKey || !apiSecret || !livekitUrl) {
    response.status(500).json({ error: 'LiveKit environment is not configured' });
    return;
  }

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    response.status(500).json({ error: 'Supabase environment is not configured' });
    return;
  }

  const { user, error: authError } = await getAuthedUser(request, supabaseUrl, publishableKey);

  if (!user) {
    response.status(401).json({ error: authError || 'Sign in before joining a live room.' });
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
    .select('id, slug, creator_id, creator_name, status')
    .eq('slug', cleanText(claimSlug))
    .single();

  if (claimError || !claim) {
    response.status(404).json({ error: claimError?.message || 'Claim not found' });
    return;
  }

  const userEmail = cleanText(user.email).toLowerCase();
  const { data: recorderInvite } = userEmail
    ? await supabaseAdmin
      .from('claim_recorder_invites')
      .select('id, invitee_name, invitee_contact, role, status')
      .eq('claim_id', claim.id)
      .eq('status', 'accepted')
      .ilike('invitee_contact', userEmail)
      .maybeSingle()
    : { data: null };

  const role = claim.creator_id === user.id
    ? 'claimer'
    : recorderInvite
      ? 'recorder'
      : 'supporter';
  const isTestMode = cleanText(mode) === 'test';
  const canPublish = role === 'claimer' || role === 'recorder';

  if (isTestMode && !canPublish) {
    response.status(403).json({ error: 'Only the claimer and accepted recorders can join the private test room.' });
    return;
  }

  if (!isTestMode && claim.status !== 'live') {
    response.status(403).json({ error: 'The official live event has not started yet.' });
    return;
  }

  const roomName = `claim-${claim.id}`;
  const { data: liveRoom, error: liveRoomError } = await supabaseAdmin
    .from('claim_live_rooms')
    .upsert({
      claim_id: claim.id,
      livekit_room_name: roomName,
    }, { onConflict: 'claim_id' })
    .select('livekit_room_name')
    .single();

  if (liveRoomError) {
    response.status(400).json({ error: liveRoomError.message });
    return;
  }

  const displayName = getDisplayName({ user, claim, recorderInvite, role });
  const identity = role === 'claimer'
    ? `claimer:${user.id}`
    : role === 'recorder'
      ? `recorder:${recorderInvite.id}`
      : `supporter:${user.id}`;
  const token = new AccessToken(apiKey, apiSecret, {
    identity: identity.slice(0, 120),
    name: displayName.slice(0, 120),
    metadata: JSON.stringify({
      claimId: claim.id,
      role,
      mode: isTestMode ? 'test' : 'official',
    }),
    attributes: {
      claimId: claim.id,
      role,
      mode: isTestMode ? 'test' : 'official',
    },
    ttl: '2h',
  });

  token.addGrant({
    room: String(liveRoom.livekit_room_name).slice(0, 160),
    roomJoin: true,
    canPublish,
    canSubscribe: true,
    canPublishData: true,
  });

  response.status(200).json({
    token: await token.toJwt(),
    livekitUrl,
    roomName: liveRoom.livekit_room_name,
    role,
    displayName,
    canPublish,
    mode: isTestMode ? 'test' : 'official',
  });
};
