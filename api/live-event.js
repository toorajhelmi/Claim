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
    return { user: null, error: 'Sign in before managing the live event.' };
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

async function insertProofEvent({ supabaseAdmin, claim, eventType, title, description, now }) {
  await supabaseAdmin.from('claim_proof_events').insert({
    claim_id: claim.id,
    event_type: eventType,
    title,
    description,
    event_time: now,
    source_role: 'challenger',
    source_name: claim.creator_name,
    metadata: {
      phase: 'official_event_lifecycle',
    },
  });
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { claimSlug, action } = request.body ?? {};
  const normalizedAction = cleanText(action);

  if (!claimSlug || !['start', 'end', 'reopen'].includes(normalizedAction)) {
    response.status(400).json({ error: 'claimSlug and action=start|end|reopen are required' });
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
    response.status(401).json({ error: authError || 'Sign in before managing the live event.' });
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

  if (claim.creator_id !== user.id) {
    response.status(403).json({ error: 'Only the claimer can manage the official event.' });
    return;
  }

  const now = new Date().toISOString();
  const roomName = `claim-${claim.id}`;

  if (normalizedAction === 'start') {
    if (claim.status === 'draft') {
      response.status(409).json({ error: 'Activate this claim before starting the official event.' });
      return;
    }

    if (['under_review', 'verified', 'not_proven', 'cancelled', 'disputed'].includes(claim.status)) {
      response.status(409).json({ error: 'This claim can no longer be started as a live event.' });
      return;
    }

    const { data: liveRoom, error: liveRoomError } = await supabaseAdmin
      .from('claim_live_rooms')
      .upsert({
        claim_id: claim.id,
        livekit_room_name: roomName,
        opened_at: now,
        closed_at: null,
      }, { onConflict: 'claim_id' })
      .select('*')
      .single();

    if (liveRoomError) {
      response.status(400).json({ error: liveRoomError.message });
      return;
    }

    const { data: updatedClaim, error: updateError } = await supabaseAdmin
      .from('claims')
      .update({ status: 'live' })
      .eq('id', claim.id)
      .select('id, slug, status')
      .single();

    if (updateError) {
      response.status(400).json({ error: updateError.message });
      return;
    }

    await insertProofEvent({
      supabaseAdmin,
      claim,
      eventType: 'live_room_opened',
      title: 'Official event started',
      description: 'The claimer opened the official live proof event.',
      now,
    });

    response.status(200).json({ claim: updatedClaim, liveRoom });
    return;
  }

  if (normalizedAction === 'reopen') {
    if (claim.status !== 'under_review') {
      response.status(409).json({ error: 'Only an ended event in review can be reopened.' });
      return;
    }

    const { data: liveRoom, error: liveRoomError } = await supabaseAdmin
      .from('claim_live_rooms')
      .upsert({
        claim_id: claim.id,
        livekit_room_name: roomName,
        opened_at: now,
        closed_at: null,
      }, { onConflict: 'claim_id' })
      .select('*')
      .single();

    if (liveRoomError) {
      response.status(400).json({ error: liveRoomError.message });
      return;
    }

    const { data: updatedClaim, error: updateError } = await supabaseAdmin
      .from('claims')
      .update({ status: 'live' })
      .eq('id', claim.id)
      .select('id, slug, status')
      .single();

    if (updateError) {
      response.status(400).json({ error: updateError.message });
      return;
    }

    await insertProofEvent({
      supabaseAdmin,
      claim,
      eventType: 'live_room_opened',
      title: 'Official event reopened',
      description: 'The claimer reopened the official live proof event from review.',
      now,
    });

    response.status(200).json({ claim: updatedClaim, liveRoom });
    return;
  }

  if (claim.status !== 'live') {
    response.status(409).json({ error: 'Only a live claim can be ended.' });
    return;
  }

  const { data: liveRoom, error: liveRoomError } = await supabaseAdmin
    .from('claim_live_rooms')
    .upsert({
      claim_id: claim.id,
      livekit_room_name: roomName,
      closed_at: now,
    }, { onConflict: 'claim_id' })
    .select('*')
    .single();

  if (liveRoomError) {
    response.status(400).json({ error: liveRoomError.message });
    return;
  }

  const { data: updatedClaim, error: updateError } = await supabaseAdmin
    .from('claims')
    .update({ status: 'under_review' })
    .eq('id', claim.id)
    .select('id, slug, status')
    .single();

  if (updateError) {
    response.status(400).json({ error: updateError.message });
    return;
  }

  await insertProofEvent({
    supabaseAdmin,
    claim,
    eventType: 'attempt_finished',
    title: 'Official event ended',
    description: 'The claimer ended the official live proof event and sent it to review.',
    now,
  });

  response.status(200).json({ claim: updatedClaim, liveRoom });
};
