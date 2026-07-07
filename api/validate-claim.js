const MIN_SCORE = 72;
const reviewSections = new Set(['title', 'proofRules', 'liveSetup']);

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
      ? 'This is specific enough to turn into a Klaimd preview.'
      : 'This needs clearer proof, tension, or claim-window integrity before it should become a Klaimd claim.',
    criteria,
    suggestions: failed.map((criterion) => criterion.suggestion),
    source: 'rubric',
  };
}

function runProofRulesRubric(content) {
  const normalized = content.trim();
  const lower = normalized.toLowerCase();
  const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const hasMultipleRules = lines.length >= 2 || normalized.length >= 140;
  const hasLiveStart = hasAny(lower, ['live', 'stream', 'proof code', 'start', 'before', 'window']);
  const hasDurableEvidence = hasAny(lower, ['record', 'recording', 'video', 'clip', 'gps', 'timestamp', 'saved', 'link', 'photo', 'metadata', 'transcript']);
  const hasObjectiveOutcome = hasAny(lower, ['gps', 'location', 'distance', 'finish', 'reach', 'timestamp', 'measured', 'visible', 'check', 'metadata']);
  const hasIndependentReview = hasAny(lower, ['ai', 'witness', 'recorder', 'friend', 'partner', 'review', 'verify', 'independently', 'public']);

  const criteria = [
    scoreCriterion(
      'Specific proof checklist',
      hasMultipleRules,
      hasMultipleRules ? 20 : 8,
      hasMultipleRules
        ? 'The proof rules give reviewers more than one concrete thing to check.'
        : 'The proof rules are still too thin.',
      'List the exact evidence items reviewers will check, one rule per line.',
    ),
    scoreCriterion(
      'Claim-window proof',
      hasLiveStart,
      hasLiveStart ? 20 : 7,
      hasLiveStart
        ? 'The rules explain how the attempt is tied to the live claim window.'
        : 'The rules do not yet prove the attempt starts inside the claim window.',
      'Add a live proof code, stream-start requirement, timestamped start, or locked attempt window.',
    ),
    scoreCriterion(
      'Durable evidence',
      hasDurableEvidence,
      hasDurableEvidence ? 20 : 7,
      hasDurableEvidence
        ? 'The proof can leave saved evidence after the live attempt.'
        : 'The rules do not clearly say what saved evidence remains after the event.',
      'Mention recorded video, GPS page, metadata, timestamped clips, saved stream, photo evidence, transcript, or evidence links.',
    ),
    scoreCriterion(
      'Objective outcome',
      hasObjectiveOutcome,
      hasObjectiveOutcome ? 22 : 8,
      hasObjectiveOutcome
        ? 'The outcome should be objectively checkable from the evidence.'
        : 'The rules do not yet make the outcome objectively checkable.',
      'Say what must be measured, seen, reached, recorded, or independently checked.',
    ),
    scoreCriterion(
      'Review confidence',
      hasIndependentReview,
      hasIndependentReview ? 18 : 8,
      hasIndependentReview
        ? 'There is a path for another person or public artifact to support review.'
        : 'A reviewer may still have to trust only the claimer.',
      'Add AI-reviewable evidence, a witness, recorder, public artifact, independent check, or reviewer-verifiable source.',
    ),
  ];

  return buildReviewFromCriteria(criteria, 'Proof rules are strong enough for a Klaimd claim.', 'The proof rules need clearer evidence, reviewability, or claim-window integrity.');
}

function runLiveSetupRubric(content) {
  const normalized = content.trim();
  const lower = normalized.toLowerCase();
  const hasCaptureDevice = hasAny(lower, [
    'phone',
    'camera',
    'gopro',
    'go pro',
    'bodycam',
    'dashcam',
    'drone',
    'webcam',
    'screen',
    'screen share',
    'stream',
    'live',
    'mic',
    'audio',
    'gps',
    'tracker',
    'wearable',
    'sensor',
    'device',
    'app',
    'metadata',
    'transcript',
    'public feed',
    'venue feed',
  ]);
  const hasCoverage = hasAny(lower, [
    'head view',
    'body view',
    'full body',
    'route',
    'location',
    'gps',
    'angle',
    'view',
    'screen share',
    'screen view',
    'sensor',
    'tracker',
    'feed',
    'metadata',
    'transcript',
    'map',
    'clock',
    'start',
    'finish',
    'outcome',
    'public post',
    'receipt',
  ]);
  const hasSecondSource = hasAny(lower, [
    'friend',
    'partner',
    'teammate',
    'assistant',
    'helper',
    'collaborator',
    'co-streamer',
    'co streamer',
    'recorder',
    'witness',
    'moderator',
    'reviewer',
    'judge',
    'public',
    'bystander',
    'venue',
    'third-party',
    'third party',
    'independent',
    'external',
    'second',
    'another',
    'separate',
    'support',
    'camera two',
    '2 cameras',
    'second device',
    'second source',
  ]);
  const hasRecordingPlan = hasAny(lower, [
    'record',
    'recording',
    'saved',
    'clip',
    'upload',
    'link',
    'archive',
    'stream',
    'metadata',
    'transcript',
    'log',
    'export',
    'evidence',
    'receipt',
    'screenshot',
    'artifact',
  ]);
  const hasContinuity = hasAny(lower, [
    'throughout',
    'continuous',
    'check-in',
    'check in',
    'timestamp',
    'proof code',
    'start',
    'finish',
    'uncut',
    'before',
    'after',
    'from beginning',
    'entire',
    'live-start',
    'claim window',
  ]);

  const criteria = [
    scoreCriterion(
      'Capture source',
      hasCaptureDevice,
      hasCaptureDevice ? 20 : 7,
      hasCaptureDevice
        ? 'The setup names at least one live capture source.'
        : 'The setup does not yet say what device or source records the attempt.',
      'Name the recording source, live feed, screen share, GPS/device tracker, sensor, transcript, or public proof feed.',
    ),
    scoreCriterion(
      'Useful coverage',
      hasCoverage,
      hasCoverage ? 20 : 8,
      hasCoverage
        ? 'The setup explains what the proof source will capture or preserve.'
        : 'The setup does not yet explain what reviewers will actually see.',
      'Describe the angle, route/location coverage, screen view, sensor feed, transcript, metadata, or outcome artifact.',
    ),
    scoreCriterion(
      'Independent support',
      hasSecondSource,
      hasSecondSource ? 18 : 8,
      hasSecondSource
        ? 'There is another person, source, or independent artifact to make the proof stronger.'
        : 'The setup would be stronger with another source besides the claimer.',
      'Add a recorder, witness, second device, public feed, venue source, third-party artifact, or independent verification source.',
    ),
    scoreCriterion(
      'Saved evidence',
      hasRecordingPlan,
      hasRecordingPlan ? 20 : 7,
      hasRecordingPlan
        ? 'The setup can leave saved evidence after the live event.'
        : 'The setup does not yet say what recording remains after the live event.',
      'Mention saved recording, clip, stream archive, upload, metadata, transcript, or evidence link.',
    ),
    scoreCriterion(
      'Continuity',
      hasContinuity,
      hasContinuity ? 22 : 8,
      hasContinuity
        ? 'The setup helps reviewers follow the attempt from start to finish.'
        : 'The setup does not yet explain continuity from start to finish.',
      'Add a proof code at start, timestamped check-ins, continuous recording, finish clip, or uncut attempt segment.',
    ),
  ];

  return buildReviewFromCriteria(criteria, 'The live proof setup is strong enough for a Klaimd claim.', 'The live proof setup needs clearer capture sources, coverage, saved evidence, or continuity.');
}

function buildReviewFromCriteria(criteria, passSummary, failSummary) {
  const score = criteria.reduce((total, criterion) => total + criterion.points, 0);
  const claimable = score >= MIN_SCORE && criteria.every((criterion) => criterion.passed || criterion.points >= 18);
  const failed = criteria.filter((criterion) => !criterion.passed);

  return {
    claimable,
    score,
    verdict: claimable ? 'Looks strong' : 'Needs tightening',
    summary: claimable ? passSummary : failSummary,
    criteria,
    suggestions: failed.map((criterion) => criterion.suggestion),
    source: 'rubric',
  };
}

function runRubricForSection(content, section) {
  if (section === 'proofRules') {
    return runProofRulesRubric(content);
  }

  if (section === 'liveSetup') {
    return runLiveSetupRubric(content);
  }

  return runRubric(content);
}

async function runAiReview(claim, fallback, section) {
  const openAiKey = process.env.OPENAI_API_KEY;
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;

  if (openAiKey) {
    const review = await runOpenAiReview(claim, fallback, openAiKey, section);

    if (review.source === 'openai') {
      return review;
    }
  }

  if (gatewayKey) {
    const review = await runGatewayReview(claim, fallback, gatewayKey, section);

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

function getValidatorMessages(claim, section) {
  const sectionLabel = {
    title: 'claim title',
    proofRules: 'proof rules',
    liveSetup: 'live proof setup',
  }[section];

  return [
    {
      role: 'system',
      content:
        `You review Klaimd ${sectionLabel} for an AI-assisted verification platform. Return strict JSON with claimable boolean, score 0-100, verdict, summary, criteria array, suggestions array. Each criteria item must have name, passed, reason, suggestion. A Klaimd setup is claimable only if it is specific, durable, provable, and constrained to the claim window. For proof rules and live setup, focus on evidence quality, saved artifacts, AI-verifier confidence, live-start integrity, metadata/timestamps/GPS/transcripts where useful, and whether the outcome can be independently checked. Reject vague wording that requires trusting the claimer without live, timestamped, recorded, GPS, metadata, witness, public, AI-reviewable, or independently checkable evidence.`,
    },
    {
      role: 'user',
      content: `${sectionLabel}: ${claim}`,
    },
  ];
}

async function runOpenAiReview(claim, fallback, apiKey, section) {
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
        messages: getValidatorMessages(claim, section),
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

async function runGatewayReview(claim, fallback, apiKey, section) {
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
        messages: getValidatorMessages(claim, section),
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
  const section = reviewSections.has(request.body?.section) ? request.body.section : 'title';

  if (!claim) {
    response.status(400).json({ error: 'claim is required' });
    return;
  }

  const fallback = runRubricForSection(claim, section);
  const review = await runAiReview(claim, fallback, section);

  response.status(200).json(review);
};
