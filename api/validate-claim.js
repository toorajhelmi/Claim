const MIN_SCORE = 72;

const stopWords = new Set([
  'a',
  'an',
  'and',
  'by',
  'for',
  'i',
  'in',
  'it',
  'live',
  'of',
  'on',
  'or',
  'the',
  'to',
  'will',
  'with',
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function hasAny(text, words) {
  const normalized = text.toLowerCase();
  return words.some((word) => normalized.includes(word));
}

function scoreCriterion(name, passed, points, reason, suggestion) {
  return {
    name,
    passed,
    points,
    reason,
    suggestion,
  };
}

function runRubric(claim) {
  const normalized = claim.trim();
  const lower = normalized.toLowerCase();
  const tokens = tokenize(normalized);
  const meaningfulTokens = tokens.filter((token) => !stopWords.has(token));
  const hasDeadline = /\b(by|before|within|in\s+\d+|at|until|tonight|today|tomorrow|sunset|midnight|deadline)\b/i.test(normalized);
  const hasSpecificity = meaningfulTokens.length >= 5 && (/\d/.test(normalized) || hasDeadline || normalized.length >= 55);
  const hasLiveProof = hasAny(lower, [
    'live',
    'stream',
    'on camera',
    'on video',
    'record',
    'timestamp',
    'check-in',
    'check in',
    'proof code',
    'witness',
    'recorder',
  ]);
  const hasObservableAction = hasAny(lower, [
    'ask',
    'build',
    'call',
    'climb',
    'complete',
    'cook',
    'cross',
    'deliver',
    'finish',
    'make',
    'perform',
    'publish',
    'reach',
    'read',
    'run',
    'say',
    'show',
    'walk',
  ]);
  const hasObjectiveOutcome = hasAny(lower, [
    'before',
    'by',
    'finish',
    'reach',
    'publish',
    'deliver',
    'complete',
    'specific',
    'exact',
    'timestamp',
    'score',
    'distance',
    'minutes',
    'hours',
    'location',
    'destination',
  ]);
  const hasWindowIntegrity = hasAny(lower, [
    'live',
    'from scratch',
    'after the claim',
    'after start',
    'at stream start',
    'revealed',
    'random',
    'proof code',
    'uncut',
    'timestamp',
    'within',
    'by',
    'before',
  ]);
  const hasDurableEvidence = hasAny(lower, [
    'video',
    'stream',
    'record',
    'timestamp',
    'published',
    'public',
    'location',
    'receipt',
    'witness',
    'recorder',
    'transcript',
    'artifact',
    'link',
  ]);
  const tooGeneric = meaningfulTokens.length < 5 || hasAny(lower, [
    'something',
    'anything',
    'be better',
    'try hard',
    'learn a song',
    'sing a song',
  ]);

  const criteria = [
    scoreCriterion(
      'Specific and outcome-based',
      hasSpecificity && !tooGeneric,
      hasSpecificity && !tooGeneric ? 20 : 6,
      hasSpecificity && !tooGeneric
        ? 'The claim gives enough concrete detail to understand the intended outcome.'
        : 'The claim is still too broad or generic.',
      'State the exact action, outcome, place/context, and deadline: “I will do X by Y.”',
    ),
    scoreCriterion(
      'Exciting enough to back',
      hasObservableAction && hasDeadline,
      hasObservableAction && hasDeadline ? 18 : 8,
      hasObservableAction && hasDeadline
        ? 'There is a visible action and time pressure.'
        : 'It needs more tension, stakes, or a time-bound public moment.',
      'Add deadline pressure, audience influence, a public setting, or a clear risk of failure.',
    ),
    scoreCriterion(
      'Durable evidence',
      hasDurableEvidence,
      hasDurableEvidence ? 18 : 7,
      hasDurableEvidence
        ? 'The outcome can leave a timestamped or reviewable evidence trail.'
        : 'The claim does not yet explain what durable evidence remains after the attempt.',
      'Mention video, live stream, timestamped check-ins, transcript, receipt, public artifact, recorder, or witness.',
    ),
    scoreCriterion(
      'Provable outcome',
      hasLiveProof && hasObjectiveOutcome,
      hasLiveProof && hasObjectiveOutcome ? 22 : 8,
      hasLiveProof && hasObjectiveOutcome
        ? 'A reviewer should be able to verify the outcome from live or recorded proof.'
        : 'The proof condition is not objective enough yet.',
      'Add exactly what must be seen, measured, recorded, or independently checked.',
    ),
    scoreCriterion(
      'Claim-window integrity',
      hasWindowIntegrity,
      hasWindowIntegrity ? 22 : 5,
      hasWindowIntegrity
        ? 'The wording helps prove the attempt happens inside the claim window or does not depend on prior hidden work.'
        : 'It is not clear why this could not have been done before the claim started.',
      'Use live-from-start proof, proof code, random reveal, supporter-selected constraint, uncut attempt, or a window-specific deadline.',
    ),
  ];

  const score = criteria.reduce((total, criterion) => total + criterion.points, 0);
  const claimable = score >= MIN_SCORE && criteria.every((criterion) => criterion.passed || criterion.points >= 18);
  const failed = criteria.filter((criterion) => !criterion.passed);

  return {
    claimable,
    score,
    verdict: claimable ? 'Claimable' : 'Needs tightening',
    summary: claimable
      ? 'This is specific enough to turn into a Claimroom preview.'
      : 'This needs clearer proof, tension, or claim-window integrity before it should become a Claimroom claim.',
    criteria,
    suggestions: failed.map((criterion) => criterion.suggestion),
    source: 'rubric',
  };
}

async function runAiReview(claim, fallback) {
  const openAiKey = process.env.OPENAI_API_KEY;
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;

  if (openAiKey) {
    const review = await runOpenAiReview(claim, fallback, openAiKey);

    if (review.source === 'openai') {
      return review;
    }
  }

  if (gatewayKey) {
    const review = await runGatewayReview(claim, fallback, gatewayKey);

    if (review.source === 'ai-gateway') {
      return review;
    }
  }

  return fallback;
}

function normalizeAiReview(parsed, fallback, source) {
  const normalized = {
    ...fallback,
    ...parsed,
    source,
  };

  normalized.score = Math.max(0, Math.min(100, Number(normalized.score) || fallback.score));
  normalized.claimable = Boolean(normalized.claimable);
  normalized.verdict = String(normalized.verdict || fallback.verdict);
  normalized.summary = String(normalized.summary || fallback.summary);
  normalized.criteria = Array.isArray(normalized.criteria) && normalized.criteria.length > 0
    ? normalized.criteria
    : fallback.criteria;
  normalized.suggestions = Array.isArray(normalized.suggestions)
    ? normalized.suggestions
    : fallback.suggestions;

  if (!fallback.claimable) {
    normalized.claimable = false;
    normalized.score = Math.min(normalized.score, fallback.score);
    normalized.verdict = 'Needs tightening';
    normalized.summary = fallback.summary;
    normalized.criteria = fallback.criteria;
    normalized.suggestions = fallback.suggestions;
  }

  return normalized;
}

function getValidatorMessages(claim) {
  return [
    {
      role: 'system',
      content:
        'You review Claimroom claims. Return strict JSON with claimable boolean, score 0-100, verdict, summary, criteria array, suggestions array. Each criteria item must have name, passed, reason, suggestion. A claim is claimable only if it is exciting, durable, provable, and either novel or provably constrained to the claim window. Reject generic claims and claims that could have been secretly completed before the claim began unless the wording includes live-from-start proof, randomized reveal, proof code, uncut stream, supporter-selected constraint, timestamped evidence, or another window-integrity mechanism.',
    },
    {
      role: 'user',
      content: `Claim: ${claim}`,
    },
  ];
}

async function runOpenAiReview(claim, fallback, apiKey) {
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
        messages: getValidatorMessages(claim),
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    return normalizeAiReview(parsed, fallback, 'openai');
  } catch {
    return fallback;
  }
}

async function runGatewayReview(claim, fallback, apiKey) {
  try {
    const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.AI_CLAIM_VALIDATOR_MODEL || 'openai/gpt-5.4',
        response_format: { type: 'json_object' },
        messages: getValidatorMessages(claim),
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    return normalizeAiReview(parsed, fallback, 'ai-gateway');
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

  const fallback = runRubric(claim);
  const review = await runAiReview(claim, fallback);

  response.status(200).json(review);
};
