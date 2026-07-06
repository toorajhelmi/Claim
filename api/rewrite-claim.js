function normalizeFutureClaim(claim) {
  const currentYear = new Date().getUTCFullYear();
  const cleanedClaim = claim
    .trim()
    .replace(/[.。]+$/, '')
    .replace(
      /^on\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},\s*(20\d{2}),\s*/i,
      (match, year) => (Number(year) < currentYear ? '' : match),
    )
    .replace(/,\s*(proving|proved)\s+I\s+can\b.*$/i, '')
    .replace(/\s+by\s+[A-Z][a-z]+\s+\d{1,2},\s+(20\d{2})\b/gi, (match, year) =>
      Number(year) < currentYear ? '' : match,
    )
    .replace(/\s+by\s+(20\d{2})\b/gi, (match, year) => (Number(year) < currentYear ? '' : match))
    .trim();

  if (/^i\s+will\b/i.test(cleanedClaim)) {
    return cleanedClaim.replace(/^i\s+will\b/i, 'I will');
  }

  if (/^i['’]ll\b/i.test(cleanedClaim)) {
    return cleanedClaim.replace(/^i['’]ll\b/i, 'I will');
  }

  if (/^i\s+am\s+going\s+to\b/i.test(cleanedClaim)) {
    return cleanedClaim.replace(/^i\s+am\s+going\s+to\b/i, 'I will');
  }

  if (/^i\s+(can|could)\s+/i.test(cleanedClaim)) {
    return `I will ${cleanedClaim.replace(/^i\s+(can|could)\s+/i, '')}`;
  }

  if (/^i\s+(successfully\s+)?completed\s+/i.test(cleanedClaim)) {
    return `I will complete ${cleanedClaim.replace(/^i\s+(successfully\s+)?completed\s+/i, '')}`;
  }

  if (/^i\s+finished\s+/i.test(cleanedClaim)) {
    return `I will finish ${cleanedClaim.replace(/^i\s+finished\s+/i, '')}`;
  }

  if (/^i\s+ran\s+/i.test(cleanedClaim)) {
    return `I will run ${cleanedClaim.replace(/^i\s+ran\s+/i, '')}`;
  }

  if (/^i\s+walked\s+/i.test(cleanedClaim)) {
    return `I will walk ${cleanedClaim.replace(/^i\s+walked\s+/i, '')}`;
  }

  if (/^i\s+built\s+/i.test(cleanedClaim)) {
    return `I will build ${cleanedClaim.replace(/^i\s+built\s+/i, '')}`;
  }

  return `I will ${cleanedClaim.replace(/^i\s+/i, '')}`;
}

function isFutureClaim(claim) {
  const normalized = claim.trim();
  const currentYear = new Date().getUTCFullYear();
  const yearMatches = normalized.match(/\b20\d{2}\b/g) || [];
  const includesPastYear = yearMatches.some((year) => Number(year) < currentYear);

  return (
    /^I will\b/.test(normalized) &&
    !includesPastYear &&
    !/\bI\s+(successfully\s+)?(completed|did|finished|proved|ran|walked|built|published|delivered|showed|recorded|covered|crossed|reached)\b/i.test(normalized) &&
    !/\bI\s+(have|had)\b/i.test(normalized) &&
    !/\b(proving I can|proved I can|successfully completed)\b/i.test(normalized)
  );
}

function normalizeForComparison(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMatches(text, pattern) {
  return (text.match(pattern) || []).map((match) => normalizeForComparison(match));
}

function hasAddedMatches(original, rewritten, pattern) {
  const originalText = normalizeForComparison(original);

  return extractMatches(rewritten, pattern).some((match) => !originalText.includes(match));
}

function hasUnsupportedAddedFacts(original, rewritten) {
  const datePattern =
    /\b(?:on\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:,\s*20\d{2})?\b|\b20\d{2}\b/gi;
  const distancePattern = /\b\d+(?:\.\d+)?\s*(?:miles?|mi|kilometers?|km)\b/gi;
  const timeTargetPattern = /\b(?:under|less than|within|in)\s+\d+(?:\.\d+)?\s*(?:hours?|hrs?|minutes?|mins?)\b/gi;
  const namedPlacePattern = /\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+|[A-Z]{2,})\b/g;

  return (
    hasAddedMatches(original, rewritten, datePattern) ||
    hasAddedMatches(original, rewritten, distancePattern) ||
    hasAddedMatches(original, rewritten, timeTargetPattern) ||
    hasAddedMatches(original, rewritten, namedPlacePattern)
  );
}

function fallbackRewrite(claim) {
  const futureClaim = normalizeFutureClaim(claim);

  return {
    rewrittenClaim: `${futureClaim} within the declared claim window, starting only after a live proof code is shown on stream, with timestamped video check-ins and an uncut finish clip that proves the outcome.`,
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
              'Rewrite Claimroom claim titles. Return strict JSON with rewrittenClaim and explanation. Preserve the claimer intent, but make the claim specific, exciting, durable, provable, and constrained to the claim window. Accuracy is mandatory: do not invent or guess facts. Do not add calendar dates, distances, pace targets, time targets, named places, exact addresses, route names, or measurements unless they appear in the original claim. If a measurement is unknown, say it must be proven by live, GPS, timestamped, witness, or recorded evidence instead of guessing a number. The rewrittenClaim must be a future-tense commitment that starts exactly with "I will". Never write as if the claimer already completed it. Never use phrases like "I successfully completed", "I proved", "I have", "I ran", or "proving I can". If no deadline is provided, say "by the declared deadline" or "within the declared claim window". Include live proof, proof code or stream-start constraint, timestamped evidence, objective outcome, and deadline/window language. Keep it as one first-person claim sentence. Do not add unsafe or illegal behavior.',
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

    if (!rewrittenClaim || !isFutureClaim(rewrittenClaim) || hasUnsupportedAddedFacts(claim, rewrittenClaim)) {
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
