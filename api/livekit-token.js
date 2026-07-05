const { AccessToken } = require('livekit-server-sdk');

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { roomName, identity, displayName, role } = request.body ?? {};

  if (!roomName || !identity || !displayName || !role) {
    response.status(400).json({ error: 'roomName, identity, displayName, and role are required' });
    return;
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    response.status(500).json({ error: 'LiveKit environment is not configured' });
    return;
  }

  const canPublish = role === 'challenger' || role === 'recorder' || role === 'witness';
  const token = new AccessToken(apiKey, apiSecret, {
    identity: String(identity).slice(0, 120),
    name: String(displayName).slice(0, 120),
    ttl: '2h',
  });

  token.addGrant({
    room: String(roomName).slice(0, 160),
    roomJoin: true,
    canPublish,
    canSubscribe: true,
    canPublishData: true,
  });

  response.status(200).json({ token: await token.toJwt() });
};
