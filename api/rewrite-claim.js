const rewriteSections = new Set(['title', 'proofRules', 'liveSetup']);

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

function cleanInput(content) {
  return content.trim().replace(/[.。]+$/, '');
}

function hasAnyText(text, words) {
  const normalized = text.toLowerCase();
  return words.some((word) => normalized.includes(word));
}

function appendLineIfMissing(lines, text, words, line) {
  return hasAnyText(text, words) ? lines : [...lines, line];
}

function strengthenProofRulesRewrite(content) {
  const lines = content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  let nextLines = lines.length > 0 ? lines : [cleanInput(content)];
  let nextText = nextLines.join('\n');

  nextLines = appendLineIfMissing(
    nextLines,
    nextText,
    ['proof code', 'stream start', 'starts only after', 'claim window'],
    'The attempt starts only after a live proof code is shown on stream.',
  );
  nextText = nextLines.join('\n');
  nextLines = appendLineIfMissing(
    nextLines,
    nextText,
    ['timestamp', 'check-in', 'check in'],
    'Timestamped evidence must show the start, key progress points, and final outcome.',
  );
  nextText = nextLines.join('\n');
  nextLines = appendLineIfMissing(
    nextLines,
    nextText,
    ['saved', 'archive', 'link', 'clip', 'recording remains'],
    'Saved video, clips, public artifacts, GPS data, metadata, or evidence links must remain available for AI-assisted review.',
  );
  nextText = nextLines.join('\n');
  nextLines = appendLineIfMissing(
    nextLines,
    nextText,
    ['ai', 'reviewer', 'verify', 'independently', 'check'],
    'The recorded evidence must let an AI verifier and reviewer independently check the claimed outcome.',
  );

  return nextLines.join('\n');
}

function strengthenLiveSetupRewrite(content) {
  const lines = content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  let nextLines = lines.length > 0 ? lines : [cleanInput(content)];
  let nextText = nextLines.join('\n');

  nextLines = appendLineIfMissing(
    nextLines,
    nextText,
    ['phone', 'camera', 'gopro', 'go pro', 'screen', 'stream', 'live source'],
    'A phone, camera, screen share, or live stream source will record the attempt.',
  );
  nextText = nextLines.join('\n');
  nextLines = appendLineIfMissing(
    nextLines,
    nextText,
    ['proof code', 'stream start', 'on camera'],
    'At stream start, the proof code will be shown on camera.',
  );
  nextText = nextLines.join('\n');
  nextLines = appendLineIfMissing(
    nextLines,
    nextText,
    ['head view', 'body view', 'full body', 'route', 'location', 'gps', 'angle', 'view', 'screen share'],
    'The camera view must clearly show the relevant action, route, location, or outcome for AI-assisted verification.',
  );
  nextText = nextLines.join('\n');
  nextLines = appendLineIfMissing(
    nextLines,
    nextText,
    ['throughout', 'continuous', 'timestamp', 'start', 'finish', 'uncut'],
    'The setup will capture continuous or timestamped coverage from start through finish.',
  );
  nextText = nextLines.join('\n');
  nextLines = appendLineIfMissing(
    nextLines,
    nextText,
    ['saved', 'archive', 'link', 'clip', 'recording remains'],
    'Saved recordings, clips, GPS or device metadata, and evidence links will remain available for AI-assisted review.',
  );

  return nextLines.join('\n');
}

function strengthenSectionRewrite(content, section) {
  if (section === 'proofRules') {
    return strengthenProofRulesRewrite(content);
  }

  if (section === 'liveSetup') {
    return strengthenLiveSetupRewrite(content);
  }

  return content;
}

function fallbackRewrite(claim, section) {
  if (section === 'proofRules') {
    return {
      rewrittenClaim: strengthenProofRulesRewrite(cleanInput(claim)),
      explanation:
        'Added claim-window integrity, timestamped progress evidence, and saved AI-reviewable proof.',
      source: 'rubric',
    };
  }

  if (section === 'liveSetup') {
    return {
      rewrittenClaim: strengthenLiveSetupRewrite(cleanInput(claim)),
      explanation:
        'Added stream-start proof, continuity, and saved AI-reviewable evidence.',
      source: 'rubric',
    };
  }

  const futureClaim = normalizeFutureClaim(claim);

  return {
    rewrittenClaim: `${futureClaim} within the declared claim window, starting only after a live proof code is shown on stream, with timestamped video check-ins, saved AI-reviewable evidence, and an uncut finish clip that proves the outcome.`,
    explanation:
      'Added live-start proof, timestamped evidence, AI-reviewable evidence, and a clear claim-window constraint.',
    source: 'rubric',
  };
}

function getRewriteSystemPrompt(section) {
  if (section === 'proofRules') {
    return 'Rewrite Claimroom proof rules for an AI-assisted verification platform. Return strict JSON with rewrittenClaim and explanation. Preserve the user intent and all user-provided facts. Accuracy is mandatory: do not invent or guess facts, dates, distances, time targets, named places, exact addresses, route names, or measurements unless they appear in the original text. Make the proof rules specific, durable, reviewable, machine-checkable where possible, and constrained to the claim window. Prefer one rule per line. Add live proof code, stream-start requirement, timestamped evidence, saved recording/artifact, witness/recorder, GPS, device metadata, transcript, evidence links, or independently checkable evidence only when stated by the user or as a generic proof source without guessing measurements. Include enough structure for an AI verifier to inspect what happened, when it happened, and whether the outcome was met. Do not add unsafe or illegal behavior.';
  }

  if (section === 'liveSetup') {
    return 'Rewrite Claimroom live proof setup for an AI-assisted verification platform. Return strict JSON with rewrittenClaim and explanation. Preserve the user intent and all user-provided facts. Accuracy is mandatory: do not invent or guess facts, dates, distances, time targets, named places, exact addresses, route names, or measurements unless they appear in the original text. Make the setup clear about capture devices or sources, coverage, continuity from start to finish, saved recordings/evidence links, metadata/GPS/transcript availability when applicable, and any witness or recorder support. Include enough structure for an AI verifier to inspect timestamps, camera coverage, saved artifacts, and objective outcome evidence. Keep it concise and practical. Do not add unsafe or illegal behavior.';
  }

  return 'Rewrite Claimroom claim titles for an AI-assisted verification platform. Return strict JSON with rewrittenClaim and explanation. Preserve the claimer intent, but make the claim specific, exciting, durable, provable, and constrained to the claim window. Accuracy is mandatory: do not invent or guess facts. Do not add calendar dates, distances, pace targets, time targets, named places, exact addresses, route names, or measurements unless they appear in the original claim. If a measurement is unknown, say it must be proven by live, GPS, timestamped, witness, metadata, or recorded evidence instead of guessing a number. The rewrittenClaim must be a future-tense commitment that starts exactly with "I will". Never write as if the claimer already completed it. Never use phrases like "I successfully completed", "I proved", "I have", "I ran", or "proving I can". If no deadline is provided, say "by the declared deadline" or "within the declared claim window". Include live proof, proof code or stream-start constraint, timestamped evidence, saved AI-reviewable proof, objective outcome, and deadline/window language. Keep it as one first-person claim sentence. Do not add unsafe or illegal behavior.';
}

async function rewriteWithOpenAi(claim, fallback, section) {
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
            content: getRewriteSystemPrompt(section),
          },
          {
            role: 'user',
            content: `Original text: ${claim}`,
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
    const rewrittenClaim = strengthenSectionRewrite(String(parsed.rewrittenClaim || '').trim(), section);

    if (
      !rewrittenClaim ||
      (section === 'title' && !isFutureClaim(rewrittenClaim)) ||
      hasUnsupportedAddedFacts(claim, rewrittenClaim)
    ) {
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
  const section = rewriteSections.has(request.body?.section) ? request.body.section : 'title';

  if (!claim) {
    response.status(400).json({ error: 'claim is required' });
    return;
  }

  const fallback = fallbackRewrite(claim, section);
  const rewrite = await rewriteWithOpenAi(claim, fallback, section);

  response.status(200).json(rewrite);
};
