function fallbackRewrite(claim) {
  const cleanedClaim = claim.trim().replace(/[.。]+$/, '');

  return {
    rewrittenClaim: `${cleanedClaim} within the declared claim window, starting only after a live proof code is shown on stream, with timestamped video check-ins and an uncut finish clip that proves the outcome.`,
    explanation:
      'Added live-start proof, timestamped evidence, and a clear claim-window constraint.',
    source: 'rubric',
  };
}

async function rewriteWithOpenAi(claim, fallback) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallback;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CLAIM_VALIDATOR_MODEL || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Rewrite Claimroom claim titles. Return strict JSON with rewrittenClaim and explanation. Preserve the claimer intent, but make the claim specific, exciting, durable, provable, and constrained to the claim window. Include live proof, proof code or stream-start constraint, timestamped evidence, objective outcome, and deadline/window language. Keep it as one first-person claim sentence. Do not add unsafe or illegal behavior.',
          },
          {
            role: 'user',
            content: `Original claim: ${claim}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    const rewrittenClaim = String(parsed.rewrittenClaim || '').trim();

    if (!rewrittenClaim) {
      return fallback;
    }

    return {
      rewrittenClaim,
      explanation: String(parsed.explanation || fallback.explanation),
      source: 'openai',
    };
  } catch {
    return fallback;
  }
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const claim = String(request.body?.claim ?? '').trim();

  if (!claim) {
    response.status(400).json({ error: 'claim is required' });
    return;
  }

  const fallback = fallbackRewrite(claim);
  const rewrite = await rewriteWithOpenAi(claim, fallback);

  response.status(200).json(rewrite);
};
