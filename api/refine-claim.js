function cleanText(value) {
  return String(value ?? '').trim();
}

function cleanMultiline(value) {
  return cleanText(value)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
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

function hasAddedMatches(original, refined, pattern) {
  const originalText = normalizeForComparison(original);

  return extractMatches(refined, pattern).some((match) => !originalText.includes(match));
}

function hasUnsupportedAddedFacts(original, refined) {
  const datePattern =
    /\b(?:on\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:,\s*20\d{2})?\b|\b20\d{2}\b/gi;
  const distancePattern = /\b\d+(?:\.\d+)?\s*(?:miles?|mi|kilometers?|km)\b/gi;
  const timeTargetPattern = /\b(?:under|less than|within|in)\s+\d+(?:\.\d+)?\s*(?:hours?|hrs?|minutes?|mins?)\b/gi;
  const namedPlacePattern = /\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+|[A-Z]{2,})\b/g;

  return (
    hasAddedMatches(original, refined, datePattern) ||
    hasAddedMatches(original, refined, distancePattern) ||
    hasAddedMatches(original, refined, timeTargetPattern) ||
    hasAddedMatches(original, refined, namedPlacePattern)
  );
}

function fallbackRefinement(body) {
  return {
    title: cleanText(body.title),
    description: cleanText(body.description),
    proofRules: cleanMultiline(body.proofRules),
    liveSetup: cleanMultiline(body.liveSetup),
    supporterInteraction: cleanMultiline(body.supporterInteraction),
    source: 'rubric',
  };
}

function safeField(original, refined) {
  const cleanedOriginal = cleanText(original);
  const cleanedRefined = cleanText(refined);

  if (!cleanedRefined || hasUnsupportedAddedFacts(cleanedOriginal, cleanedRefined)) {
    return cleanedOriginal;
  }

  return cleanedRefined;
}

async function refineWithOpenAi(body, fallback) {
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
              'You lightly copy-edit Klaimd draft answers. Return strict JSON with title, description, proofRules, liveSetup, and supporterInteraction strings. Preserve all user-provided facts exactly: do not add dates, distances, places, names, devices, proof mechanisms, deadlines, measurements, legal claims, or new requirements. Fix typos, punctuation, capitalization, grammar, duplicated spaces, and sentence flow only. Keep future-tense commitment language. Keep proofRules as separate lines when possible. If a field is blank, return it blank.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              title: cleanText(body.title),
              description: cleanText(body.description),
              proofRules: cleanMultiline(body.proofRules),
              liveSetup: cleanMultiline(body.liveSetup),
              supporterInteraction: cleanMultiline(body.supporterInteraction),
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    const data = await response.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}');

    return {
      title: safeField(body.title, parsed.title),
      description: safeField(body.description, parsed.description),
      proofRules: safeField(body.proofRules, parsed.proofRules),
      liveSetup: safeField(body.liveSetup, parsed.liveSetup),
      supporterInteraction: safeField(body.supporterInteraction, parsed.supporterInteraction),
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

  const fallback = fallbackRefinement(request.body ?? {});
  const refined = await refineWithOpenAi(request.body ?? {}, fallback);

  response.status(200).json(refined);
};
