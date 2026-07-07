import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { ReactNode } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { appConfig } from './lib/app-config';
import { supabase } from './lib/supabase';

type ClaimExample = {
  title: string;
  proof: string;
  money: string;
  detail: string;
  status: 'Live' | 'Proving' | 'Verified';
  meta: string;
};

type VideoPlaceholder = {
  label: string;
  title: string;
  description: string;
};

const claimExamples: ClaimExample[] = [
  {
    title:
      'I will cross the city by sunset using only live chat directions, with timestamped location check-ins on stream.',
    proof: 'Proof: live chat directions, timestamped check-ins, route recap, sunset deadline.',
    money: '$5,940',
    detail: 'pledged by 386 supporters',
    status: 'Live',
    meta: 'Sunset deadline',
  },
  {
    title:
      'I will cook a 3-course dinner live in 2 hours using 5 ingredients revealed by supporters at stream start.',
    proof: 'Proof: sealed ingredient reveal, visible timer, full cooking stream, plated final.',
    money: '$4,820',
    detail: 'pledged by 312 supporters',
    status: 'Live',
    meta: 'Starts tonight',
  },
  {
    title:
      'I will build a playable browser game live in 6 hours using a theme and 3 mechanics chosen by supporters at launch.',
    proof: 'Proof: empty project, live theme reveal, screen share, playable final link.',
    money: '$6,400',
    detail: 'pledged by 428 supporters',
    status: 'Proving',
    meta: '4h 12m left',
  },
  {
    title:
      'I will create a 60-second horror short live in 4 hours using 3 props chosen by supporters at stream start.',
    proof: 'Proof: prop reveal, live shoot log, edit timeline, final premiere.',
    money: '$3,840',
    detail: 'earned after verification',
    status: 'Verified',
    meta: 'Paid out',
  },
  {
    title:
      'I will build a working Rube Goldberg machine live using only household objects chosen by supporters.',
    proof: 'Proof: supporter object list, live build, one uncut successful run.',
    money: '$5,210',
    detail: 'pledged by 341 supporters',
    status: 'Proving',
    meta: 'Run pending',
  },
];

const videoPlaceholders: VideoPlaceholder[] = [
  {
    label: 'Video area 1',
    title: 'Claimer announcement reel',
    description:
      'Vertical social video. Claimer talks directly to camera, makes a bold claim, shows the stake, and points to a countdown plus supporter wall.',
  },
  {
    label: 'Video area 2',
    title: 'Pledge surge moment',
    description:
      'Fast montage of comments, supporter avatars, and pledge counter rising while the claimer reacts to the audience backing the attempt.',
  },
  {
    label: 'Video area 3',
    title: 'Proof and result moment',
    description:
      'Final attempt clip, checklist items lighting up, reviewer note sliding in, then a VERIFIED or NOT PROVEN result screen.',
  },
];

const tickerItems = [
  'Cross the city by sunset using only live chat directions.',
  'Cook a 3-course dinner live using supporter-revealed ingredients.',
  'Build a playable browser game live from a supporter-chosen theme.',
  'Shoot a 60-second horror short live from 3 random props.',
  'Build a Rube Goldberg machine from supporter-chosen household objects.',
];

const statusClassName: Record<ClaimExample['status'], string> = {
  Live: 'live',
  Proving: 'proving',
  Verified: 'verified',
};

const heroVideoSrc = '/videos/Cinematic_vertical_social_vide.mp4';

type ClaimType = 'live_claim' | 'city_walk' | 'public_statement';
type ClaimStatus =
  | 'draft'
  | 'preview'
  | 'open_for_backing'
  | 'threshold_met'
  | 'scheduled'
  | 'live'
  | 'under_review'
  | 'verified'
  | 'not_proven'
  | 'cancelled'
  | 'disputed';

type Claim = {
  id: string;
  slug: string;
  creator_id: string | null;
  creator_name: string;
  creator_handle: string | null;
  creator_platform: string | null;
  contact_email: string | null;
  claim_type: ClaimType;
  status: ClaimStatus;
  title: string;
  description: string | null;
  teaser_title: string | null;
  teaser_description: string | null;
  stake_amount_cents: number;
  pledge_threshold_cents: number;
  pledge_pool_cents: number;
  supporter_count: number;
  recorder_count: number;
  live_starts_at: string | null;
  deadline_at: string | null;
  exact_statement: string | null;
  event_context: string | null;
  start_area: string | null;
  destination_rule: string | null;
  allowed_transport: string | null;
  checkin_interval_minutes: number | null;
  proof_summary: string | null;
};

type ClaimerProfile = {
  id: string;
  display_name: string | null;
  handle: string | null;
  contact_email: string | null;
  primary_platform: string | null;
};

type ProofRule = {
  id: string;
  position: number;
  rule: string;
  required: boolean;
};

type Pledge = {
  id: string;
  supporter_name: string;
  supporter_handle: string | null;
  amount_cents: number;
  created_at: string;
};

type RecorderInvite = {
  id: string;
  claim_id: string;
  invite_token: string;
  role: 'recorder' | 'witness';
  invitee_name: string | null;
  invitee_contact: string | null;
  payout_share_bps: number;
  responsibilities: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
};

type ProofEvent = {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  event_time: string;
  source_role: string | null;
  source_name: string | null;
};

type Checkin = {
  id: string;
  label: string;
  notes: string | null;
  checked_in_at: string;
};

type ClaimBundle = {
  claim: Claim;
  proofRules: ProofRule[];
  pledges: Pledge[];
  recorderInvites: RecorderInvite[];
  proofEvents: ProofEvent[];
  checkins: Checkin[];
};

type ClaimabilityCriterion = {
  name: string;
  passed: boolean;
  reason: string;
  suggestion: string;
};

type ClaimabilityReview = {
  claimable: boolean;
  score: number;
  verdict: string;
  summary: string;
  criteria: ClaimabilityCriterion[];
  suggestions: string[];
  source: 'openai' | 'ai-gateway' | 'rubric';
};

type ClaimRewrite = {
  rewrittenClaim: string;
  explanation: string;
  source: 'openai' | 'rubric';
};

type ReviewStatus = 'idle' | 'checking' | 'passed' | 'failed' | 'error';
type RewriteStatus = 'idle' | 'rewriting' | 'error';
type ReviewableStepKey = 'title' | 'proofRules' | 'liveSetup';

type SectionReviewState = {
  review: ClaimabilityReview | null;
  status: ReviewStatus;
  lastReviewed: string;
  rewriteStatus: RewriteStatus;
  lastRewrite: string;
  originalBeforeRewrite: string;
};

type ActivationWizardStep = 'setup' | 'review' | 'payment';

type ActivationSetupState = {
  selfRecording: boolean;
  otherRecorder: boolean;
  externalProof: boolean;
  selfName: string;
  selfContact: string;
  recorderName: string;
  recorderContact: string;
  recorderResponsibilities: string;
  payoutSharePercent: string;
  externalProofLabel: string;
  externalProofDetails: string;
  externalProofLink: string;
};

const reviewableStepLabels: Record<ReviewableStepKey, string> = {
  title: 'Claim',
  proofRules: 'Proof rules',
  liveSetup: 'Live setup',
};

const reviewableStepKeys: ReviewableStepKey[] = ['title', 'proofRules', 'liveSetup'];

function isReviewableStepKey(key: keyof ClaimWizardValues): key is ReviewableStepKey {
  return reviewableStepKeys.includes(key as ReviewableStepKey);
}

function createInitialSectionReviewState(): Record<ReviewableStepKey, SectionReviewState> {
  return {
    title: {
      review: null,
      status: 'idle',
      lastReviewed: '',
      rewriteStatus: 'idle',
      lastRewrite: '',
      originalBeforeRewrite: '',
    },
    proofRules: {
      review: null,
      status: 'idle',
      lastReviewed: '',
      rewriteStatus: 'idle',
      lastRewrite: '',
      originalBeforeRewrite: '',
    },
    liveSetup: {
      review: null,
      status: 'idle',
      lastReviewed: '',
      rewriteStatus: 'idle',
      lastRewrite: '',
      originalBeforeRewrite: '',
    },
  };
}

async function requestSectionReview(section: ReviewableStepKey, claim: string) {
  const response = await fetch('/api/validate-claim', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ claim, section }),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error ?? `Could not review ${reviewableStepLabels[section].toLowerCase()}. Try again.`);
  }

  return (await response.json()) as ClaimabilityReview;
}

const defaultCityRules = [
  'Live stream starts at the declared start point.',
  'Route decisions must come from live supporter chat or votes.',
  'Timestamped check-ins are submitted during the route.',
  'Claimer reaches the destination before the sunset deadline.',
];

const defaultStatementRules = [
  'Exact statement or question is locked before pledges open.',
  'Public event/context and opportunity window are declared.',
  'The attempt is recorded live by claimer or recorder.',
  'Reviewer can verify the exact wording from clip, transcript, or recorder note.',
];

export function App() {
  const route = useMemo(() => getRoute(window.location.pathname), []);

  useEffect(() => {
    document.title = `${appConfig.name} - ${appConfig.tagline}`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', appConfig.description);
  }, []);

  if (route.name === 'new-claim') {
    return <CreateClaimPage />;
  }

  if (route.name === 'auth') {
    return <AuthPage nextPath={route.nextPath} />;
  }

  if (route.name === 'auth-callback') {
    return <AuthCallbackPage nextPath={route.nextPath} />;
  }

  if (route.name === 'claim-detail') {
    return <ClaimDetailPage slug={route.slug} />;
  }

  if (route.name === 'claim-live') {
    return <ClaimLivePage slug={route.slug} />;
  }

  if (route.name === 'claim-result') {
    return <ClaimResultPage slug={route.slug} />;
  }

  if (route.name === 'recorder-invite') {
    return <RecorderInvitePage token={route.token} />;
  }

  return <HomePage />;
}

function HomePage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [myClaims, setMyClaims] = useState<Claim[]>([]);
  const [supportClaims, setSupportClaims] = useState<Claim[]>([]);

  useEffect(() => {
    async function loadHome() {
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id ?? null;
      setUserId(currentUserId);

      if (!currentUserId) {
        setLoading(false);
        return;
      }

      const [mine, supportable] = await Promise.all([
        supabase
          .from('claims')
          .select('*')
          .eq('creator_id', currentUserId)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('claims')
          .select('*')
          .neq('creator_id', currentUserId)
          .in('status', ['preview', 'open_for_backing', 'threshold_met', 'scheduled', 'live'])
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      setMyClaims((mine.data ?? []) as Claim[]);
      setSupportClaims((supportable.data ?? []) as Claim[]);
      setLoading(false);
    }

    void loadHome();
  }, []);

  if (loading) {
    return <LoadingPage label="Loading Claimroom home..." />;
  }

  if (!userId) {
    return <LandingPage />;
  }

  return (
    <AppChrome>
      <main className="app-page section-shell">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Claimroom home</p>
            <h1 className="page-title">Your claim room.</h1>
            <p className="page-lede">
              Continue drafting your claims, activate proof setup, or back claims that are already open.
            </p>
          </div>
          <a className="button button-primary" href="/claims/new">
            New claim
          </a>
        </section>

        <div className="mvp-layout">
          <section className="mvp-panel">
            <div className="panel-heading-row">
              <div>
                <p className="eyebrow">My claims</p>
                <h2>Drafts and active claims</h2>
              </div>
              <a className="button button-ghost" href="/claims/new">
                Create
              </a>
            </div>
            <ClaimCardList
              claims={myClaims}
              emptyText="No claims yet. Start with a draft and activate it when proof setup is ready."
              ownerView
            />
          </section>

          <aside className="mvp-panel">
            <p className="eyebrow">Support</p>
            <h2>Claims you can back</h2>
            <ClaimCardList
              claims={supportClaims}
              emptyText="No public claims are open for backing yet."
            />
          </aside>
        </div>
      </main>
    </AppChrome>
  );
}

function ClaimCardList({
  claims,
  emptyText,
  ownerView = false,
}: {
  claims: Claim[];
  emptyText: string;
  ownerView?: boolean;
}) {
  if (claims.length === 0) {
    return <p className="form-message">{emptyText}</p>;
  }

  return (
    <div className="claim-card-list">
      {claims.map((claim) => (
        <a className="claim-card-row" href={`/claims/${claim.slug}`} key={claim.id}>
          <span>{claim.status.replace(/_/g, ' ')}</span>
          <strong>{claim.title}</strong>
          <small>
            {ownerView && claim.status === 'draft'
              ? 'Draft - review when ready'
              : `${formatMoney(claim.pledge_pool_cents)} pledged · ${claim.supporter_count} supporters`}
          </small>
        </a>
      ))}
    </div>
  );
}

function LandingPage() {
  return (
    <>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="grain" aria-hidden="true" />

      <header className="site-header">
        <a className="brand" href="#" aria-label={`${appConfig.name} home`}>
          <span className="brand-mark">{appConfig.name.charAt(0)}</span>
          <span>{appConfig.name}</span>
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#examples">Examples</a>
          <a href="#creators">Claimers</a>
          <a href="#apply">Apply</a>
        </nav>
        <a className="nav-cta" href="/claims/new">
          Run a claim
        </a>
      </header>

      <main>
        <section className="hero dramatic-hero section-shell">
          <div className="cinema-stage" aria-label="Featured claim video preview">
            <div className="video-placeholder cinema-video">
              <video
                className="cinema-video-media"
                src={heroVideoSrc}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label="Cinematic video preview of a claimer crossing the city by sunset with live chat directions"
              />
              <div className="cinema-live-bar">
                <span className="status live">Live soon</span>
                <span>386 supporters</span>
                <span>$5,940 pledged</span>
              </div>
              <div className="cinema-content">
                <p className="video-label">Featured claim video placeholder</p>
                <h2>Across the city. Chat controls the route. Sunset deadline.</h2>
                <p>
                  Video description: cinematic opening on the claimer at the
                  starting point with the sun still high, live chat throwing
                  directions on screen, map route updating, timestamped
                  location check-ins, near-misses before sunset, pledge counter
                  rising, final destination arrival, then a VERIFIED result
                  card.
                </p>
              </div>
              <div className="cinema-play" aria-hidden="true">
                <span />
              </div>
            </div>

            <article className="cinema-card cinema-claim-card">
              <span className="status live">Featured claim</span>
              <h3>
                I will cross the city by sunset using only live chat
                directions, with timestamped location check-ins on stream.
              </h3>
            </article>

            <article className="cinema-card cinema-proof-card">
              <span className="status proving">Proof rules</span>
              <ul>
                <li>Route controlled by live chat</li>
                <li>Timestamped check-ins</li>
                <li>Continuous stream updates</li>
                <li>Arrive before sunset</li>
              </ul>
            </article>
          </div>

          <div className="hero-copy">
            <p className="eyebrow">Public claims. Real backing. Verified outcomes.</p>
            <h1>Say it. Stake it. Prove it.</h1>
            <p className="hero-lede">
              {appConfig.name} turns bold claimer claims into paid public events.
              Supporters pledge to back the attempt. If the claimer proves
              it, they earn the pledge pool.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="/claims/new">
                Start a claim
              </a>
              <a className="button button-ghost" href="#examples">
                See live formats
              </a>
            </div>
            <div className="signal-row" aria-label="Pilot signals">
              <div>
                <strong>$127K</strong>
                <span>example pledge volume</span>
              </div>
              <div>
                <strong>48h</strong>
                <span>claim windows</span>
              </div>
              <div>
                <strong>0</strong>
                <span>odds or betting positions</span>
              </div>
            </div>
          </div>
        </section>

        <section className="ticker" aria-label="Example claim ticker">
          <div className="ticker-track">
            {[...tickerItems, ...tickerItems].map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="section-shell how-section">
          <div className="section-heading">
            <p className="eyebrow">The loop</p>
            <h2>A claim becomes a live event.</h2>
            <p>
              Keep the copy short. Let the page show the journey from claim to
              backing to proof.
            </p>
          </div>

          <div className="steps-grid">
            <article className="step-card">
              <span className="step-number">01</span>
              <h3>Make the claim</h3>
              <p>Claimer posts a clear, time-bound claim with locked proof rules.</p>
            </article>
            <article className="step-card">
              <span className="step-number">02</span>
              <h3>Supporters pledge</h3>
              <p>Audience backs the attempt for access, status, updates, and perks.</p>
            </article>
            <article className="step-card">
              <span className="step-number">03</span>
              <h3>Prove the outcome</h3>
              <p>Evidence, timeline, and review decide if the claim was proven.</p>
            </article>
            <article className="step-card hot">
              <span className="step-number">04</span>
              <h3>Earn if verified</h3>
              <p>The claimer earns the pledge pool when the claim is proved.</p>
            </article>
          </div>
        </section>

        <section className="section-shell video-strip" aria-label="Video plan">
          <div className="video-tile tall">
            <VideoPlaceholderCard {...videoPlaceholders[0]} />
          </div>
          <div className="video-stack">
            {videoPlaceholders.slice(1).map((placeholder) => (
              <div className="video-tile" key={placeholder.label}>
                <VideoPlaceholderCard {...placeholder} />
              </div>
            ))}
          </div>
        </section>

        <section id="examples" className="section-shell examples-section">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">Claim formats</p>
              <h2>Built for things people want to watch happen.</h2>
            </div>
            <p>
              Start with tight templates. Each claim needs a stake, a deadline,
              a pledge pool, and proof rules.
            </p>
          </div>

          <div className="claim-grid">
            {claimExamples.map((claim, index) => (
              <article
                className={`example-card ${index === 0 ? 'active' : ''}`}
                key={claim.title}
              >
                <div className="example-top">
                  <span className={`status ${statusClassName[claim.status]}`}>
                    {claim.status}
                  </span>
                  <span>{claim.meta}</span>
                </div>
                <h3>{claim.title}</h3>
                <p>{claim.proof}</p>
                <div className="money-line">
                  <strong>{claim.money}</strong>
                  <span>{claim.detail}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="creators" className="section-shell creator-section">
          <div className="creator-copy">
            <p className="eyebrow">For claimers</p>
            <h2>Turn one bold claim into a paid public event.</h2>
            <p>
              Your audience already watches you try things. {appConfig.name} gives them a
              reason to back the attempt, follow the countdown, and show up for
              the proof.
            </p>
            <ul className="feature-list">
              <li>Supporters pledge before the result.</li>
              <li>You earn the pledge pool when the claim is verified.</li>
              <li>Rules are locked before supporters back it.</li>
              <li>No odds, no betting positions, no supporter winnings by default.</li>
            </ul>
          </div>
          <div className="creator-panel">
            <div className="payout-card">
              <span className="status live">Claimer upside</span>
              <h3>$4,620 pledge pool</h3>
              <p>If verified, payout goes to the claimer minus platform fee.</p>
              <div className="payout-row">
                <span>Backers</span>
                <strong>296</strong>
              </div>
              <div className="payout-row">
                <span>Proof items</span>
                <strong>5 / 6</strong>
              </div>
              <div className="payout-row">
                <span>Deadline</span>
                <strong>11:59 PM</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell proof-section">
          <div className="proof-board">
            <div className="proof-copy">
              <p className="eyebrow">Proof layer</p>
              <h2>The result should feel undeniable.</h2>
              <p>
                Every {appConfig.name} page needs visible proof rules, timeline updates,
                and a final result that explains why the outcome was verified.
              </p>
            </div>
            <div className="timeline">
              {[
                'Claim rules locked',
                'Supporters pledged',
                'Evidence submitted',
                'Human review complete',
                'Result published',
              ].map((item, index) => (
                <div
                  className={`timeline-item ${index < 3 ? 'done' : ''} ${
                    index === 3 ? 'active' : ''
                  }`}
                  key={item}
                >
                  <span />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="apply" className="section-shell apply-section">
          <div className="apply-card">
            <p className="eyebrow">Pilot applications</p>
            <h2>Want to run one of the first claims?</h2>
            <p>
              We are setting up the first claim pages manually. Bring the claim
              and the audience. {appConfig.name} handles the page, pledge/precommit flow,
              proof checklist, supporter wall, and final result.
            </p>
            <form className="apply-form" action="/claims/new" method="get">
              <label>
                Claimer handle
                <input type="text" name="handle" placeholder="@yourhandle" />
              </label>
              <label>
                Your claim idea
                <textarea
                  name="claim"
                  placeholder="I claim I can..."
                  rows={4}
                />
              </label>
              <button className="button button-primary" type="submit">
                Create preview page
              </button>
            </form>
            <p className="form-note">
              This opens the MVP claim creation flow backed by Supabase.
            </p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>{appConfig.name}</span>
        <p>Make a claim. Back the attempt. Verify the outcome.</p>
      </footer>
    </>
  );
}

function VideoPlaceholderCard({ label, title, description }: VideoPlaceholder) {
  return (
    <div className="video-placeholder">
      <p className="video-label">{label}</p>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function getRoute(pathname: string):
  | { name: 'landing' }
  | { name: 'auth'; nextPath: string }
  | { name: 'auth-callback'; nextPath: string }
  | { name: 'new-claim' }
  | { name: 'claim-detail'; slug: string }
  | { name: 'claim-live'; slug: string }
  | { name: 'claim-result'; slug: string }
  | { name: 'recorder-invite'; token: string } {
  const parts = pathname.split('/').filter(Boolean);

  if (parts[0] === 'auth') {
    const params = new URLSearchParams(window.location.search);
    if (parts[1] === 'callback') {
      return { name: 'auth-callback', nextPath: params.get('next') || '/claims/new' };
    }

    return { name: 'auth', nextPath: params.get('next') || '/claims/new' };
  }

  if (parts[0] === 'claims' && parts[1] === 'new') {
    return { name: 'new-claim' };
  }

  if (parts[0] === 'claims' && parts[1] && parts[2] === 'live') {
    return { name: 'claim-live', slug: parts[1] };
  }

  if (parts[0] === 'claims' && parts[1] && parts[2] === 'result') {
    return { name: 'claim-result', slug: parts[1] };
  }

  if (parts[0] === 'claims' && parts[1]) {
    return { name: 'claim-detail', slug: parts[1] };
  }

  if (parts[0] === 'recorder' && parts[1] === 'invite' && parts[2]) {
    return { name: 'recorder-invite', token: parts[2] };
  }

  return { name: 'landing' };
}

function AppChrome({ children }: { children: ReactNode }) {
  const isCreatePage = window.location.pathname === '/claims/new';

  return (
    <>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="grain" aria-hidden="true" />
      <header className="site-header">
        <a className="brand" href="/" aria-label={`${appConfig.name} home`}>
          <span className="brand-mark">{appConfig.name.charAt(0)}</span>
          <span>{appConfig.name}</span>
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a href="/claims/new">Create</a>
          <a href="/claims/cross-city-by-sunset">Demo claim</a>
          <a href="/">Landing</a>
        </nav>
        {isCreatePage ? null : (
          <a className="nav-cta" href="/claims/new">
            Run a claim
          </a>
        )}
      </header>
      {children}
    </>
  );
}

function AuthPage({ nextPath }: { nextPath: string }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [authStage, setAuthStage] = useState<'form' | 'check-email'>('form');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [values, setValues] = useState({
    displayName: '',
    handle: '',
    email: '',
    password: '',
    primaryPlatform: '',
  });
  const safeNextPath = nextPath.startsWith('/') ? nextPath : '/claims/new';
  const emailRedirectTo = getAuthRedirectUrl(safeNextPath);
  const canSubmit =
    values.email.trim().length > 0 &&
    values.password.trim().length >= 6 &&
    (mode === 'signin' ||
      (values.displayName.trim().length > 0 &&
        values.handle.trim().length > 0 &&
        values.primaryPlatform.trim().length > 0));

  function updateValue(key: keyof typeof values, value: string) {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus('submitting');
    setMessage('');

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      });

      if (error) {
        setStatus('error');
        setMessage(error.message);
        return;
      }

      window.location.href = safeNextPath;
      return;
    }

    const signupResponse = await fetch('/api/auth-signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        displayName: values.displayName.trim(),
        email: values.email.trim(),
        handle: values.handle.trim(),
        password: values.password,
        primaryPlatform: values.primaryPlatform,
        redirectTo: emailRedirectTo,
      }),
    });

    if (!signupResponse.ok) {
      const errorBody = (await signupResponse.json().catch(() => null)) as { error?: string } | null;
      setStatus('error');
      setMessage(errorBody?.error ?? 'Could not create account.');
      return;
    }

    setStatus('success');
    setMessage('Confirmation email sent through Claimroom. Check inbox and spam/promotions.');
    setConfirmationEmail(values.email.trim());
    setAuthStage('check-email');
  }

  async function handleResendConfirmation() {
    if (!confirmationEmail) return;

    setStatus('submitting');
    setMessage('');

    const signupResponse = await fetch('/api/auth-signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        displayName: values.displayName.trim(),
        email: confirmationEmail,
        handle: values.handle.trim(),
        password: values.password,
        primaryPlatform: values.primaryPlatform,
        redirectTo: emailRedirectTo,
      }),
    });

    if (!signupResponse.ok) {
      const errorBody = (await signupResponse.json().catch(() => null)) as { error?: string } | null;
      setStatus('error');
      setMessage(errorBody?.error ?? 'Could not resend confirmation email.');
      return;
    }

    setStatus('success');
    setMessage('Confirmation email resent. Check inbox and spam/promotions.');
  }

  async function handleContinueAfterConfirmation() {
    if (!confirmationEmail) return;

    setStatus('submitting');
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email: confirmationEmail,
      password: values.password,
    });

    if (error) {
      setStatus('error');
      setMessage(
        error.message.toLowerCase().includes('confirm')
          ? 'Email is not confirmed yet. Open the confirmation email first, then tap continue.'
          : error.message,
      );
      return;
    }

    window.location.href = safeNextPath;
  }

  function handleEditSignup() {
    setAuthStage('form');
    setMode('signup');
    setStatus('idle');
    setMessage('');
  }

  return (
    <AppChrome>
      <main className="auth-page section-shell">
        <section className="auth-card">
          <p className="eyebrow">Claimer access</p>
          {authStage === 'check-email' ? (
            <>
              <h1>Check your email.</h1>
              <p>
                We sent a confirmation link to <strong>{confirmationEmail}</strong>. After opening it,
                return here and continue to claim setup.
              </p>
              <div className="confirmation-actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => void handleContinueAfterConfirmation()}
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting' ? 'Checking...' : 'I confirmed, continue'}
                </button>
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => void handleResendConfirmation()}
                  disabled={status === 'submitting'}
                >
                  Resend email
                </button>
                <button className="text-button" type="button" onClick={handleEditSignup}>
                  Change email or details
                </button>
              </div>
              {message ? <p className="form-message">{message}</p> : null}
            </>
          ) : (
            <>
              <h1>{mode === 'signin' ? 'Sign in to run a claim.' : 'Create your claimer account.'}</h1>
              <p>
                Claim setup starts after account access, so the wizard only asks for claim details.
              </p>

              <div className="auth-toggle" role="group" aria-label="Authentication mode">
                <button className={mode === 'signin' ? 'selected' : ''} type="button" onClick={() => setMode('signin')}>
                  Sign in
                </button>
                <button className={mode === 'signup' ? 'selected' : ''} type="button" onClick={() => setMode('signup')}>
                  Sign up
                </button>
              </div>

              <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
                {mode === 'signup' ? (
                  <>
                    <label>
                      Name
                      <input value={values.displayName} onChange={(event) => updateValue('displayName', event.target.value)} placeholder="Your name" />
                    </label>
                    <label>
                      Handle
                      <input value={values.handle} onChange={(event) => updateValue('handle', event.target.value)} placeholder="@yourhandle" />
                    </label>
                    <label>
                      Main platform
                      <select value={values.primaryPlatform} onChange={(event) => updateValue('primaryPlatform', event.target.value)}>
                        <option value="" disabled>
                          Select platform
                        </option>
                        {platformOptions.map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}
                <label>
                  Email
                  <input value={values.email} type="email" onChange={(event) => updateValue('email', event.target.value)} placeholder="you@example.com" />
                </label>
                <label>
                  Password
                  <input value={values.password} type="password" onChange={(event) => updateValue('password', event.target.value)} placeholder="At least 6 characters" />
                </label>
                <button className="button button-primary" type="submit" disabled={!canSubmit || status === 'submitting'}>
                  {status === 'submitting' ? 'Working...' : mode === 'signin' ? 'Sign in and continue' : 'Create account'}
                </button>
              </form>
              {message ? <p className="form-message">{message}</p> : null}
            </>
          )}
        </section>
      </main>
    </AppChrome>
  );
}

function AuthCallbackPage({ nextPath }: { nextPath: string }) {
  const [message, setMessage] = useState('Confirming your email...');
  const safeNextPath = nextPath.startsWith('/') ? nextPath : '/claims/new';

  useEffect(() => {
    async function finishAuth() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data.session) {
        setMessage('Email confirmed. Please sign in to continue.');
        window.setTimeout(() => {
          window.location.href = `/auth?next=${encodeURIComponent(safeNextPath)}`;
        }, 1400);
        return;
      }

      window.location.href = safeNextPath;
    }

    void finishAuth();
  }, [safeNextPath]);

  return <LoadingPage label={message} />;
}

type ClaimWizardValues = {
  title: string;
  description: string;
  proofRules: string;
  liveSetup: string;
  supporterInteraction: string;
  stakeAmount: string;
  pledgeThreshold: string;
  liveStartsAt: string;
  deadlineAt: string;
};

type ClaimWizardStep = {
  key: keyof ClaimWizardValues;
  label: string;
  helper: string;
  placeholder?: string;
  inputType?: string;
  fieldType?: 'input' | 'textarea' | 'select';
  rows?: number;
  required?: boolean;
  options?: Array<[string, string]>;
};

const platformOptions: Array<[string, string]> = [
  ['TikTok', 'TikTok'],
  ['Instagram', 'Instagram'],
  ['YouTube', 'YouTube'],
  ['Twitch', 'Twitch'],
  ['Kick', 'Kick'],
  ['X', 'X'],
  ['Discord', 'Discord'],
  ['WhatsApp', 'WhatsApp'],
  ['Other', 'Other'],
];

const claimWizardSteps: ClaimWizardStep[] = [
  {
    key: 'title',
    label: 'What is the claim?',
    helper: 'Make it specific and outcome-based: “I will do X by Y.”',
    fieldType: 'textarea',
    rows: 3,
    required: true,
  },
  {
    key: 'description',
    label: 'Why should people care?',
    helper: 'Explain the attempt, the tension, and what supporters are backing.',
    placeholder: 'Explain what you will do, when it happens, why it is hard, and what supporters are backing.',
    fieldType: 'textarea',
    rows: 4,
    required: true,
  },
  {
    key: 'proofRules',
    label: 'What proves the claim?',
    helper: 'Add one proof rule per line. These become the locked proof checklist.',
    placeholder:
      'The attempt starts after the proof code is shown on stream.\nAt least one live camera records the attempt.\nThe outcome is visible or independently checkable before the deadline.',
    fieldType: 'textarea',
    rows: 6,
    required: true,
  },
  {
    key: 'liveSetup',
    label: 'How will the live proof be recorded?',
    helper: 'Describe phones, recorders, witnesses, screen share, or other proof sources.',
    placeholder: 'Claimer phone, recorder phone, witness, screen share, public stream, location check-ins...',
    fieldType: 'textarea',
    rows: 4,
    required: true,
  },
  {
    key: 'supporterInteraction',
    label: 'What can supporters do?',
    helper: 'They may only watch, or they may chat, vote, choose directions, or submit prompts.',
    placeholder: 'Supporters can chat and vote on the next direction during the live attempt.',
    fieldType: 'textarea',
    rows: 4,
  },
  {
    key: 'stakeAmount',
    label: 'How much are you staking?',
    helper: 'Use a small number for now. Payment handling is still pledge-intent only.',
    inputType: 'number',
    required: true,
  },
  {
    key: 'pledgeThreshold',
    label: 'What pledge threshold unlocks the attempt?',
    helper: 'Supporters pledge until this threshold is reached.',
    inputType: 'number',
    required: true,
  },
  {
    key: 'liveStartsAt',
    label: 'When does the live attempt start?',
    helper: 'Pick the scheduled live start time.',
    inputType: 'datetime-local',
  },
  {
    key: 'deadlineAt',
    label: 'What is the deadline?',
    helper: 'This is the time by which the outcome must be proven.',
    inputType: 'datetime-local',
  },
];

async function refineClaimWizardValues(values: ClaimWizardValues): Promise<ClaimWizardValues> {
  try {
    const response = await fetch('/api/refine-claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      return values;
    }

    const refined = (await response.json()) as Partial<ClaimWizardValues>;

    return {
      ...values,
      title: refined.title?.trim() || values.title,
      description: refined.description?.trim() || values.description,
      proofRules: refined.proofRules?.trim() || values.proofRules,
      liveSetup: refined.liveSetup?.trim() || values.liveSetup,
      supporterInteraction: refined.supporterInteraction?.trim() || values.supporterInteraction,
    };
  } catch {
    return values;
  }
}

function CreateClaimPage() {
  const [values, setValues] = useState<ClaimWizardValues>({
    title: '',
    description: '',
    proofRules: '',
    liveSetup: '',
    supporterInteraction: '',
    stakeAmount: '100',
    pledgeThreshold: '500',
    liveStartsAt: '',
    deadlineAt: '',
  });
  const [claimerProfile, setClaimerProfile] = useState<ClaimerProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [sectionReviews, setSectionReviews] = useState(createInitialSectionReviewState);
  const currentStep = claimWizardSteps[currentStepIndex];
  const isReviewStep = currentStepIndex === claimWizardSteps.length;
  const progress = Math.round(((currentStepIndex + 1) / (claimWizardSteps.length + 1)) * 100);
  const currentValue = isReviewStep ? '' : values[currentStep.key].trim();
  const currentReviewKey = !isReviewStep && isReviewableStepKey(currentStep.key) ? currentStep.key : null;
  const currentReviewState = currentReviewKey ? sectionReviews[currentReviewKey] : null;
  const canContinue =
    (isReviewStep || !currentStep.required || currentValue.length > 0) &&
    currentReviewState?.status !== 'checking' &&
    currentReviewState?.rewriteStatus !== 'rewriting';

  useEffect(() => {
    async function loadClaimer() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        window.location.href = `/auth?next=${encodeURIComponent('/claims/new')}`;
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, handle, contact_email, primary_platform')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (profile) {
        setClaimerProfile(profile as ClaimerProfile);
        setAuthLoading(false);
        return;
      }

      const metadata = userData.user.user_metadata;
      const fallbackProfile = {
        id: userData.user.id,
        display_name: String(metadata.display_name ?? userData.user.email?.split('@')[0] ?? 'Claimer'),
        handle: nullableString(String(metadata.handle ?? '')),
        contact_email: userData.user.email ?? null,
        primary_platform: nullableString(String(metadata.primary_platform ?? '')),
      };

      const { data: createdProfile } = await supabase
        .from('profiles')
        .upsert(fallbackProfile)
        .select('id, display_name, handle, contact_email, primary_platform')
        .single();

      setClaimerProfile((createdProfile ?? fallbackProfile) as ClaimerProfile);
      setAuthLoading(false);
    }

    void loadClaimer();
  }, []);

  function updateValue(key: keyof ClaimWizardValues, value: string) {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));

    if (isReviewableStepKey(key)) {
      resetSectionReview(key);
      setMessage('');
    }
  }

  function updateSectionReview(section: ReviewableStepKey, nextState: Partial<SectionReviewState>) {
    setSectionReviews((currentReviews) => ({
      ...currentReviews,
      [section]: {
        ...currentReviews[section],
        ...nextState,
      },
    }));
  }

  function resetSectionReview(section: ReviewableStepKey) {
    updateSectionReview(section, {
      review: null,
      status: 'idle',
      lastReviewed: '',
      rewriteStatus: 'idle',
      lastRewrite: '',
      originalBeforeRewrite: '',
    });
  }

  function undoSectionRewrite(section: ReviewableStepKey) {
    const originalValue = sectionReviews[section].originalBeforeRewrite;

    if (!originalValue) {
      return;
    }

    setValues((currentValues) => ({
      ...currentValues,
      [section]: originalValue,
    }));
    updateSectionReview(section, {
      review: null,
      status: 'idle',
      lastReviewed: '',
      rewriteStatus: 'idle',
      lastRewrite: '',
      originalBeforeRewrite: '',
    });
    setMessage(`${reviewableStepLabels[section]} restored to the text before rewrite.`);
  }

  async function reviewSectionValue(section: ReviewableStepKey, claim: string) {
    return requestSectionReview(section, claim);
  }

  async function validateReviewSection(section: ReviewableStepKey) {
    const claim = values[section].trim();

    updateSectionReview(section, { status: 'checking' });
    setMessage('');

    try {
      const review = await reviewSectionValue(section, claim);
      updateSectionReview(section, {
        review,
        lastReviewed: claim,
        status: review.claimable ? 'passed' : 'failed',
      });

      if (!review.claimable) {
        setMessage(`${reviewableStepLabels[section]} needs tightening before continuing.`);
        return false;
      }

      return true;
    } catch (error) {
      updateSectionReview(section, { status: 'error' });
      setMessage(error instanceof Error ? error.message : `Could not review ${reviewableStepLabels[section].toLowerCase()}.`);
      return false;
    }
  }

  async function handleRewriteSection(section: ReviewableStepKey) {
    const claim = values[section].trim();

    if (!claim) {
      return;
    }

    updateSectionReview(section, { rewriteStatus: 'rewriting' });
    setMessage('');

    let response: Response;

    try {
      response = await fetch('/api/rewrite-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ claim, section }),
      });
    } catch {
      updateSectionReview(section, { rewriteStatus: 'error' });
      setMessage(`Could not rewrite ${reviewableStepLabels[section].toLowerCase()}. Try again.`);
      return;
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
      updateSectionReview(section, { rewriteStatus: 'error' });
      setMessage(errorBody?.error ?? `Could not rewrite ${reviewableStepLabels[section].toLowerCase()}. Try again.`);
      return;
    }

    const rewrite = (await response.json()) as ClaimRewrite;
    const rewrittenClaim = rewrite.rewrittenClaim.trim();

    if (!rewrittenClaim) {
      updateSectionReview(section, { rewriteStatus: 'error' });
      setMessage(`Could not rewrite ${reviewableStepLabels[section].toLowerCase()}. Try adding more detail first.`);
      return;
    }

    setValues((currentValues) => ({
      ...currentValues,
      [section]: rewrittenClaim,
    }));
    updateSectionReview(section, {
      lastRewrite: rewrittenClaim,
      originalBeforeRewrite: claim,
    });

    try {
      const review = await reviewSectionValue(section, rewrittenClaim);
      updateSectionReview(section, {
        review,
        lastReviewed: rewrittenClaim,
        status: review.claimable ? 'passed' : 'failed',
        rewriteStatus: 'idle',
      });
      setMessage(
        review.claimable
          ? `${reviewableStepLabels[section]} rewritten and accepted. You can continue or undo it.`
          : `${reviewableStepLabels[section]} rewritten, but it still needs tightening.`,
      );
    } catch (error) {
      updateSectionReview(section, {
        review: null,
        status: 'idle',
        lastReviewed: '',
        rewriteStatus: 'error',
      });
      setMessage(error instanceof Error ? error.message : `Could not review rewritten ${reviewableStepLabels[section].toLowerCase()}.`);
    }
  }

  async function goNext() {
    setMessage('');
    if (!isReviewStep && currentStep.required && !values[currentStep.key].trim()) {
      setStatus('error');
      setMessage(`${currentStep.label} is required.`);
      return;
    }

    if (!isReviewStep && isReviewableStepKey(currentStep.key)) {
      const reviewState = sectionReviews[currentStep.key];
      const currentSectionValue = values[currentStep.key].trim();
      const needsReview = reviewState.lastReviewed !== currentSectionValue || reviewState.status !== 'passed';

      if (!needsReview) {
        setStatus('idle');
        setCurrentStepIndex((stepIndex) => Math.min(stepIndex + 1, claimWizardSteps.length));
        return;
      }

      const isClaimable = await validateReviewSection(currentStep.key);

      if (!isClaimable) {
        return;
      }
    }

    setStatus('idle');
    setCurrentStepIndex((stepIndex) => Math.min(stepIndex + 1, claimWizardSteps.length));
  }

  function goBack() {
    setMessage('');
    setStatus('idle');
    setCurrentStepIndex((stepIndex) => Math.max(stepIndex - 1, 0));
  }

  async function handleCreateClaim({ redirectToHome = false }: { redirectToHome?: boolean } = {}) {
    setStatus('submitting');
    setMessage('');

    if (!claimerProfile) {
      setStatus('error');
      setMessage('Sign in before creating a claim.');
      return;
    }

    const refinedValues = await refineClaimWizardValues(values);
    setValues(refinedValues);

    const title = refinedValues.title.trim();
    const creatorName = claimerProfile.display_name || claimerProfile.contact_email?.split('@')[0] || 'Claimer';
    const slug = createSlug(title);
    const proofRules = parseProofRules(refinedValues.proofRules);
    const liveSetup = nullableString(refinedValues.liveSetup);
    const supporterInteraction = nullableString(refinedValues.supporterInteraction);

    const claimPayload = {
      slug,
      creator_id: claimerProfile.id,
      creator_name: creatorName,
      creator_handle: nullableString(claimerProfile.handle),
      creator_platform: nullableString(claimerProfile.primary_platform),
      contact_email: nullableString(claimerProfile.contact_email),
      claim_type: 'live_claim' as const,
      status: 'draft' as const,
      title,
      description: nullableString(refinedValues.description),
      teaser_title: title,
      teaser_description: `${creatorName}'s live claim setup is being prepared for backing.`,
      stake_amount_cents: dollarsToCents(values.stakeAmount),
      pledge_threshold_cents: dollarsToCents(values.pledgeThreshold),
      live_starts_at: nullableDateTime(values.liveStartsAt),
      deadline_at: nullableDateTime(values.deadlineAt),
      proof_summary: [
        proofRules.join('\n'),
        liveSetup ? `Live setup: ${liveSetup}` : '',
        supporterInteraction ? `Supporter interaction: ${supporterInteraction}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      exact_statement: null,
      event_context: liveSetup,
      start_area: null,
      destination_rule: supporterInteraction,
      allowed_transport: null,
      checkin_interval_minutes: null,
    };

    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .insert(claimPayload)
      .select('id, slug')
      .single();

    if (claimError || !claim) {
      setStatus('error');
      setMessage(claimError?.message ?? 'Claim could not be created.');
      return;
    }

    const { error: rulesError } = await supabase.from('claim_proof_rules').insert(
      proofRules.map((rule, index) => ({
        claim_id: claim.id,
        position: index + 1,
        rule,
      })),
    );

    const { error: shareError } = await supabase.from('claim_share_assets').insert({
      claim_id: claim.id,
      share_title: title,
      share_description: claimPayload.teaser_description,
      launch_copy: `I am making a ${appConfig.name} claim: ${title}. Back it and watch the proof.`,
    });

    if (rulesError || shareError) {
      setStatus('error');
      setMessage(rulesError?.message ?? shareError?.message ?? 'Claim details could not be saved.');
      return;
    }

    setStatus('success');
    window.location.href = redirectToHome ? '/' : `/claims/${claim.slug}`;
  }

  if (authLoading) {
    return <LoadingPage label="Checking claimer account..." />;
  }

  return (
    <AppChrome>
      <main className="app-page section-shell">
        <p className="eyebrow">Create claim</p>
        <h1 className="page-title">Launch a live proof claim.</h1>
        <p className="page-lede">
          You are signed in. Now define the public claim one decision at a time.
        </p>

        <section className="wizard-card">
          <div className="wizard-progress" aria-label={`Claim setup ${progress}% complete`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="eyebrow">
            Step {Math.min(currentStepIndex + 1, claimWizardSteps.length + 1)} of {claimWizardSteps.length + 1}
          </p>

          {isReviewStep ? (
            <ClaimWizardReview values={values} />
          ) : (
            <>
              {currentReviewState?.lastRewrite ? null : (
                <WizardField step={currentStep} value={values[currentStep.key]} onChange={updateValue} />
              )}
              {currentReviewKey && currentReviewState?.lastRewrite ? (
                <div className="rewrite-applied">
                  <span>Applied rewritten {reviewableStepLabels[currentReviewKey].toLowerCase()}</span>
                  <p>{currentReviewState.lastRewrite}</p>
                  {currentReviewState.originalBeforeRewrite ? (
                    <button className="text-button" type="button" onClick={() => undoSectionRewrite(currentReviewKey)}>
                      Undo rewrite
                    </button>
                  ) : null}
                </div>
              ) : null}
              {currentReviewKey && currentReviewState ? (
                <ClaimabilityPanel
                  label={reviewableStepLabels[currentReviewKey]}
                  review={currentReviewState.review}
                  status={currentReviewState.status}
                  rewriteStatus={currentReviewState.rewriteStatus}
                  onRewrite={() => void handleRewriteSection(currentReviewKey)}
                  onContinue={currentReviewState.status === 'passed' ? () => void goNext() : undefined}
                />
              ) : null}
            </>
          )}

          <div className="wizard-actions">
            {currentStepIndex > 0 ? (
              <button className="button button-ghost" type="button" onClick={goBack} disabled={status === 'submitting'}>
                Back
              </button>
            ) : null}
            {isReviewStep ? (
              <>
                <button className="button button-primary" type="button" onClick={() => void handleCreateClaim()} disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Creating...' : 'Create claim'}
                </button>
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => void handleCreateClaim({ redirectToHome: true })}
                  disabled={status === 'submitting'}
                >
                  Save for later
                </button>
              </>
            ) : (
              <button className="button button-primary" type="button" onClick={() => void goNext()} disabled={!canContinue}>
                {currentReviewState?.status === 'checking'
                  ? 'Reviewing...'
                  : currentReviewKey && currentReviewState?.status !== 'passed'
                    ? `Review ${reviewableStepLabels[currentReviewKey].toLowerCase()}`
                    : 'Continue'}
              </button>
            )}
          </div>
          {message ? <p className="form-message">{message}</p> : null}
        </section>
      </main>
    </AppChrome>
  );
}

function WizardField({
  step,
  value,
  onChange,
}: {
  step: ClaimWizardStep;
  value: string;
  onChange: (key: keyof ClaimWizardValues, value: string) => void;
}) {
  return (
    <label className="wizard-field">
      <span>{step.label}</span>
      <small>{step.helper}</small>
      {step.fieldType === 'textarea' ? (
        <textarea
          value={value}
          rows={step.rows ?? 4}
          placeholder={step.placeholder}
          onChange={(event) => onChange(step.key, event.target.value)}
          autoFocus
        />
      ) : step.fieldType === 'select' ? (
        <select value={value} onChange={(event) => onChange(step.key, event.target.value)} autoFocus>
          <option value="" disabled>
            Select one
          </option>
          {(step.options ?? []).map(([optionValue, label]) => (
            <option value={optionValue} key={optionValue}>
              {label}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={value}
          type={step.inputType ?? 'text'}
          placeholder={step.placeholder}
          onChange={(event) => onChange(step.key, event.target.value)}
          autoFocus
        />
      )}
    </label>
  );
}

function ClaimabilityPanel({
  label,
  review,
  status,
  rewriteStatus,
  onRewrite,
  onContinue,
}: {
  label: string;
  review: ClaimabilityReview | null;
  status: ReviewStatus;
  rewriteStatus: RewriteStatus;
  onRewrite: () => void;
  onContinue?: () => void;
}) {
  if (status === 'idle') {
    return (
      <div className="claimability-panel muted">
        <p>
          Claimroom will review this {label.toLowerCase()} for durability, proof quality,
          and whether it can be tied to the claim window.
        </p>
      </div>
    );
  }

  if (status === 'checking') {
    return (
      <div className="claimability-panel">
        <p className="eyebrow">AI {label.toLowerCase()} review</p>
        <strong>Checking whether this is strong enough...</strong>
      </div>
    );
  }

  if (!review) {
    return null;
  }

  return (
    <div className={`claimability-panel ${review.claimable ? 'passed' : 'failed'}`}>
      <div className="claimability-head">
        <div>
          <p className="eyebrow">AI {label.toLowerCase()} review</p>
          <strong>{review.verdict}</strong>
        </div>
        <span>{review.score}/100</span>
      </div>
      <p>{review.summary}</p>
      {review.claimable && onContinue ? (
        <div className="claimability-actions claimability-actions-top">
          <button className="button button-primary" type="button" onClick={onContinue}>
            Continue
          </button>
          <small>You can continue now or scan the passed checks below.</small>
        </div>
      ) : null}
      {!review.claimable ? (
        <div className="claimability-actions">
          <button
            className="button button-primary"
            type="button"
            onClick={onRewrite}
            disabled={rewriteStatus === 'rewriting'}
          >
            {rewriteStatus === 'rewriting' ? 'Rewriting...' : `Rewrite ${label.toLowerCase()}`}
          </button>
        </div>
      ) : null}
      <div className="claimability-checks">
        {review.criteria.map((criterion) => (
          <div className={criterion.passed ? 'passed' : 'failed'} key={criterion.name}>
            <span>{criterion.passed ? 'Pass' : 'Fix'}</span>
            <strong>{criterion.name}</strong>
            <p>{criterion.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClaimWizardReview({ values }: { values: ClaimWizardValues }) {
  const reviewItems: Array<[string, string]> = [
    ['Claim', values.title],
    ['Proof', values.proofRules],
    ['Live setup', values.liveSetup],
    ['Supporter interaction', values.supporterInteraction || 'Supporters can watch and follow updates.'],
    ['Stake', `$${values.stakeAmount || '0'}`],
    ['Pledge threshold', `$${values.pledgeThreshold || '0'}`],
    ['Live start', values.liveStartsAt || 'Not scheduled yet'],
    ['Deadline', values.deadlineAt || 'Not set yet'],
  ];

  return (
    <div className="wizard-review">
      <h2>Review the claim setup.</h2>
      <p>
        This will create a draft claim setup page under your claimer account. You can add
        recorder access and activate it when the proof setup is ready.
      </p>
      <div className="review-list">
        {reviewItems.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormField({
  label,
  name,
  required,
  placeholder,
  type = 'text',
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label>
      {label}
      <input name={name} required={required} placeholder={placeholder} type={type} defaultValue={defaultValue} />
    </label>
  );
}

function FormSelect({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: Array<[string, string]>;
}) {
  return (
    <label>
      {label}
      <select name={name} defaultValue="">
        <option value="" disabled>
          Select platform
        </option>
        {options.map(([value, labelText]) => (
          <option value={value} key={value}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function inferRecorderSetup(claim: Claim, proofRules: ProofRule[]) {
  const proofText = [
    claim.proof_summary ?? '',
    claim.event_context ?? '',
    proofRules.map((rule) => rule.rule).join('\n'),
  ]
    .join('\n')
    .toLowerCase();
  const selfRecommended = /\b(my|my own|me|myself|gopro|go pro|phone|bodycam|head view|screen share|wearable|gps|tracker)\b/.test(proofText);
  const otherRecommended = /\b(friend|partner|recorder|witness|second|another|full body|camera two|2 cameras|independent|public feed|venue|third-party|third party|external)\b/.test(proofText);
  const externalRecommended = /\b(public feed|venue|third-party|third party|external|transcript|receipt|artifact|metadata|sensor|tracker|gps|public post)\b/.test(proofText);
  const responsibilities = otherRecommended
    ? 'Record the attempt as a second camera/witness, keep the claimer visible when possible, and help preserve timestamped evidence for AI-assisted verification.'
    : 'Record the live attempt, show the proof code at start, capture timestamped progress, and preserve saved evidence for AI-assisted verification.';
  const summary = otherRecommended
    ? 'Your proof setup mentions another person or second view, so another recorder should receive access. You can also add yourself if you will record part of the proof.'
    : selfRecommended
      ? 'Your proof setup sounds like the claimer can record directly. Select yourself now, or invite another recorder if someone else will help.'
      : 'Add yourself or another recorder before activation so recording access and instructions can be sent before the live attempt.';

  return {
    selfRecommended: selfRecommended || !otherRecommended,
    otherRecommended,
    externalRecommended,
    responsibilities,
    summary,
  };
}

function createActivationSetupState(
  claim: Claim,
  recorderSuggestion: ReturnType<typeof inferRecorderSetup>,
  recorderInvites: RecorderInvite[] = [],
): ActivationSetupState {
  const selfInvite = recorderInvites.find(
    (invite) => invite.invitee_contact === claim.contact_email && invite.status !== 'declined',
  );
  const otherInvite = recorderInvites.find(
    (invite) => invite.invitee_contact !== claim.contact_email && invite.status !== 'declined',
  );

  return {
    selfRecording: recorderSuggestion.selfRecommended || Boolean(selfInvite),
    otherRecorder: recorderSuggestion.otherRecommended || Boolean(otherInvite),
    externalProof: recorderSuggestion.externalRecommended,
    selfName: selfInvite?.invitee_name ?? claim.creator_name,
    selfContact: selfInvite?.invitee_contact ?? claim.contact_email ?? '',
    recorderName: otherInvite?.invitee_name ?? '',
    recorderContact: otherInvite?.invitee_contact ?? '',
    recorderResponsibilities: otherInvite?.responsibilities ?? recorderSuggestion.responsibilities,
    payoutSharePercent: otherInvite ? String(otherInvite.payout_share_bps / 100) : '10',
    externalProofLabel: '',
    externalProofDetails: '',
    externalProofLink: '',
  };
}

function getActivationSetupStorageKey(claimId: string) {
  return `claimroom.activationSetup.${claimId}`;
}

function readStoredActivationSetup(claimId: string, fallback: ActivationSetupState) {
  try {
    const storedValue = window.localStorage.getItem(getActivationSetupStorageKey(claimId));

    if (!storedValue) {
      return fallback;
    }

    const storedSetup = JSON.parse(storedValue) as Partial<ActivationSetupState>;
    return {
      ...fallback,
      ...storedSetup,
    };
  } catch {
    return fallback;
  }
}

function saveStoredActivationSetup(claimId: string, setup: ActivationSetupState) {
  try {
    window.localStorage.setItem(getActivationSetupStorageKey(claimId), JSON.stringify(setup));
  } catch {
    // Persistence is best-effort; activation should still work if storage is blocked.
  }
}

function clearStoredActivationSetup(claimId: string) {
  try {
    window.localStorage.removeItem(getActivationSetupStorageKey(claimId));
  } catch {
    // Ignore storage cleanup errors.
  }
}

function buildActivationSetupSummary(setup: ActivationSetupState) {
  return [
    setup.selfRecording
      ? `Claimer recorder: ${setup.selfName || 'claimer'}${setup.selfContact ? ` (${setup.selfContact})` : ''}.`
      : '',
    setup.otherRecorder
      ? `Additional recorder: ${setup.recorderName || 'unnamed recorder'}${setup.recorderContact ? ` (${setup.recorderContact})` : ''}. Responsibilities: ${setup.recorderResponsibilities || 'not provided'}.`
      : '',
    setup.externalProof
      ? `External proof source: ${setup.externalProofLabel || 'proof source'}. ${setup.externalProofDetails || ''} ${setup.externalProofLink || ''}`.trim()
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function normalizeEmail(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function ClaimDetailPage({ slug }: { slug: string }) {
  const { data, loading, error, reload } = useClaimBundle(slug);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pledgeMessage, setPledgeMessage] = useState('');
  const [setupMessage, setSetupMessage] = useState('');
  const [draftMode, setDraftMode] = useState<'review' | 'activate' | 'edit'>(() => {
    const mode = new URLSearchParams(window.location.search).get('mode');
    return mode === 'activate' || mode === 'edit' ? mode : 'review';
  });
  const [activationStep, setActivationStep] = useState<ActivationWizardStep>('setup');
  const [activationSetup, setActivationSetup] = useState<ActivationSetupState | null>(null);
  const [activationReviews, setActivationReviews] = useState<Array<[string, ClaimabilityReview]>>([]);
  const [activationStatus, setActivationStatus] = useState<'idle' | 'reviewing' | 'checking-out' | 'verifying'>('idle');

  useEffect(() => {
    async function loadCurrentUser() {
      const { data: userData } = await supabase.auth.getUser();
      setCurrentUserId(userData.user?.id ?? null);
    }

    void loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!data?.claim || data.claim.status !== 'draft') {
      return;
    }

    const suggestion = inferRecorderSetup(data.claim, data.proofRules);
    const fallbackSetup = createActivationSetupState(data.claim, suggestion, data.recorderInvites);
    setActivationSetup((currentSetup) => currentSetup ?? readStoredActivationSetup(data.claim.id, fallbackSetup));
  }, [data?.claim.id, data?.claim.status, data?.proofRules.length, data?.recorderInvites.length]);

  useEffect(() => {
    if (data?.claim && data.claim.status !== 'draft') {
      clearStoredActivationSetup(data.claim.id);
    }
  }, [data?.claim.id, data?.claim.status]);

  useEffect(() => {
    async function verifyCheckoutReturn() {
      if (!data?.claim) return;

      const params = new URLSearchParams(window.location.search);
      const checkoutStatus = params.get('checkout');
      const sessionId = params.get('session_id');

      if (checkoutStatus === 'cancel') {
        setDraftMode('activate');
        setActivationStep('payment');
        setSetupMessage('Payment was not completed. Try again when you are ready.');
        window.history.replaceState(null, '', `/claims/${slug}?mode=activate`);
        return;
      }

      if (checkoutStatus !== 'success' || !sessionId) {
        return;
      }

      setDraftMode('activate');
      setActivationStep('payment');
      setActivationStatus('verifying');
      setSetupMessage('Confirming payment and activating claim...');

      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch('/api/verify-activation-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
        },
        body: JSON.stringify({ sessionId }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string; ok?: boolean } | null;

      setActivationStatus('idle');

      if (!response.ok || !body?.ok) {
        setSetupMessage(body?.error ?? 'Payment could not be verified. Please retry activation.');
        window.history.replaceState(null, '', `/claims/${slug}?mode=activate`);
        return;
      }

      setSetupMessage('Payment confirmed. Claim activated and recorder emails sent.');
      clearStoredActivationSetup(data.claim.id);
      window.history.replaceState(null, '', `/claims/${slug}`);
      await reload();
    }

    void verifyCheckoutReturn();
  }, [data?.claim.id, slug]);

  async function handlePledge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const formData = new FormData(event.currentTarget);
    const { error: pledgeError } = await supabase.from('claim_pledges').insert({
      claim_id: data.claim.id,
      supporter_name: String(formData.get('supporterName') || '').trim(),
      supporter_handle: nullableString(formData.get('supporterHandle')),
      supporter_email: nullableString(formData.get('supporterEmail')),
      amount_cents: dollarsToCents(formData.get('amount')),
      source_channel: 'claim_page',
    });
    setPledgeMessage(pledgeError ? pledgeError.message : 'Pledge intent saved.');
    if (!pledgeError) {
      event.currentTarget.reset();
      await reload();
    }
  }

  function setDraftReviewMode(nextMode: 'review' | 'activate' | 'edit') {
    setDraftMode(nextMode);
    setSetupMessage('');
    const nextUrl = nextMode === 'review' ? `/claims/${slug}` : `/claims/${slug}?mode=${nextMode}`;
    window.history.replaceState(null, '', nextUrl);
  }

  async function handleUpdateDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get('title') || '').trim();
    const proofRules = parseProofRules(String(formData.get('proofRules') || ''));
    const liveSetup = nullableString(formData.get('liveSetup'));
    const supporterInteraction = nullableString(formData.get('supporterInteraction'));

    if (!title || proofRules.length === 0 || !liveSetup) {
      setSetupMessage('Claim title, proof rules, and live proof setup are required.');
      return;
    }

    const currentProofRules = data.proofRules.map((rule) => rule.rule).join('\n').trim();
    const changedReviewSections: Array<[ReviewableStepKey, string]> = [
      ['title', title],
      ['proofRules', proofRules.join('\n')],
      ['liveSetup', liveSetup],
    ].filter(([section, value]) => {
      const currentValue = section === 'title'
        ? data.claim.title.trim()
        : section === 'proofRules'
          ? currentProofRules
          : (data.claim.event_context ?? '').trim();

      return value.trim() !== currentValue;
    }) as Array<[ReviewableStepKey, string]>;

    if (changedReviewSections.length > 0) {
      setSetupMessage('Reviewing updated claim details...');

      try {
        for (const [section, value] of changedReviewSections) {
          const review = await requestSectionReview(section, value);

          if (!review.claimable) {
            setSetupMessage(`${reviewableStepLabels[section]} needs tightening before this edit can be saved.`);
            return;
          }
        }
      } catch (reviewError) {
        setSetupMessage(reviewError instanceof Error ? reviewError.message : 'Could not review updated draft details.');
        return;
      }
    }

    const proofSummary = [
      proofRules.join('\n'),
      liveSetup ? `Live setup: ${liveSetup}` : '',
      supporterInteraction ? `Supporter interaction: ${supporterInteraction}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const { error: claimError } = await supabase
      .from('claims')
      .update({
        title,
        description: nullableString(formData.get('description')),
        teaser_title: title,
        stake_amount_cents: dollarsToCents(formData.get('stakeAmount')),
        pledge_threshold_cents: dollarsToCents(formData.get('pledgeThreshold')),
        live_starts_at: nullableDateTime(formData.get('liveStartsAt')),
        deadline_at: nullableDateTime(formData.get('deadlineAt')),
        proof_summary: proofSummary,
        event_context: liveSetup,
        destination_rule: supporterInteraction,
      })
      .eq('id', data.claim.id);

    if (claimError) {
      setSetupMessage(claimError.message);
      return;
    }

    const { error: deleteError } = await supabase.from('claim_proof_rules').delete().eq('claim_id', data.claim.id);

    if (deleteError) {
      setSetupMessage(deleteError.message);
      return;
    }

    const { error: insertError } = await supabase.from('claim_proof_rules').insert(
      proofRules.map((rule, index) => ({
        claim_id: data.claim.id,
        position: index + 1,
        rule,
      })),
    );

    if (!insertError) {
      setDraftReviewMode('review');
      await reload();
      setSetupMessage('Draft updated.');
      return;
    }

    setSetupMessage(insertError.message);
  }

  function getActivationSetup(recorderSuggestion: ReturnType<typeof inferRecorderSetup>) {
    if (activationSetup) {
      return activationSetup;
    }

    if (!data?.claim) {
      return null;
    }

    const fallbackSetup = createActivationSetupState(data.claim, recorderSuggestion, data.recorderInvites);
    return readStoredActivationSetup(data.claim.id, fallbackSetup);
  }

  function updateActivationSetup(nextState: Partial<ActivationSetupState>) {
    setActivationSetup((currentSetup) => {
      const baseSetup = currentSetup ?? (
        data?.claim
          ? readStoredActivationSetup(
            data.claim.id,
            createActivationSetupState(data.claim, inferRecorderSetup(data.claim, data.proofRules), data.recorderInvites),
          )
          : null
      );
      const updatedSetup = baseSetup ? { ...baseSetup, ...nextState } : baseSetup;

      if (data?.claim && updatedSetup) {
        saveStoredActivationSetup(data.claim.id, updatedSetup);
      }

      return updatedSetup;
    });
    setActivationReviews([]);
    setSetupMessage('');
  }

  function validateActivationSetup(recorderSuggestion: ReturnType<typeof inferRecorderSetup>) {
    const setup = getActivationSetup(recorderSuggestion);

    if (!setup) {
      return 'Activation setup is still loading.';
    }

    if (!setup.selfRecording && !setup.otherRecorder && !setup.externalProof) {
      return 'Enable at least one proof setup option before review.';
    }

    if (recorderSuggestion.selfRecommended && !setup.selfRecording) {
      return 'Self recording is required by the current reviewed claim. Use Edit if you want to remove it.';
    }

    if (recorderSuggestion.otherRecommended && !setup.otherRecorder) {
      return 'An additional recorder/source is required by the current reviewed claim. Use Edit if you want to remove it.';
    }

    if (recorderSuggestion.externalRecommended && !setup.externalProof) {
      return 'An external proof source is required by the current reviewed claim. Use Edit if you want to remove it.';
    }

    if (setup.selfRecording && (!setup.selfName.trim() || !setup.selfContact.trim())) {
      return 'Add your recorder name and contact.';
    }

    if (
      setup.otherRecorder &&
      (!setup.recorderName.trim() ||
        !setup.recorderContact.trim() ||
        !setup.recorderResponsibilities.trim())
    ) {
      return 'Add the recorder name, contact, and responsibilities.';
    }

    if (setup.otherRecorder && !isValidEmail(setup.recorderContact)) {
      return 'Enter a valid recorder email address so we can send the activation instructions.';
    }

    if (
      setup.otherRecorder &&
      normalizeEmail(setup.recorderContact) === normalizeEmail(data?.claim.contact_email)
    ) {
      return 'Recorder email must be different from the claimer email.';
    }

    if (
      setup.externalProof &&
      (!setup.externalProofLabel.trim() || !setup.externalProofDetails.trim())
    ) {
      return 'Add the external proof source name and what it will preserve.';
    }

    return '';
  }

  async function handleReviewActivationSetup(recorderSuggestion: ReturnType<typeof inferRecorderSetup>) {
    const setup = getActivationSetup(recorderSuggestion);

    if (!data || !setup) {
      setSetupMessage('Activation setup is still loading.');
      return;
    }

    const validationMessage = validateActivationSetup(recorderSuggestion);

    if (validationMessage) {
      setSetupMessage(validationMessage);
      return;
    }

    setActivationStatus('reviewing');
    setSetupMessage('Reviewing activation setup...');

    try {
      const proofRules = data.proofRules.map((rule) => rule.rule).join('\n');
      const liveSetupWithActivation = [
        data.claim.event_context ?? '',
        buildActivationSetupSummary(setup),
      ]
        .filter(Boolean)
        .join('\n');
      const reviews: Array<[string, ClaimabilityReview]> = [
        ['Claim', await requestSectionReview('title', data.claim.title)],
        ['Proof rules', await requestSectionReview('proofRules', proofRules)],
        ['Activation proof setup', await requestSectionReview('liveSetup', liveSetupWithActivation)],
      ];
      const failedReview = reviews.find(([, review]) => !review.claimable);

      setActivationReviews(reviews);
      setActivationStep('review');
      setSetupMessage(
        failedReview
          ? `${failedReview[0]} needs tightening before activation. Use Edit to change reviewed claim details.`
          : 'Activation setup passed review. Continue to payment when ready.',
      );
    } catch (reviewError) {
      setSetupMessage(reviewError instanceof Error ? reviewError.message : 'Could not review activation setup.');
    } finally {
      setActivationStatus('idle');
    }
  }

  async function handleStartActivationPayment(recorderSuggestion: ReturnType<typeof inferRecorderSetup>) {
    const setup = getActivationSetup(recorderSuggestion);

    if (!data || !setup) {
      setSetupMessage('Activation setup is still loading.');
      return;
    }

    const validationMessage = validateActivationSetup(recorderSuggestion);

    if (validationMessage) {
      setSetupMessage(validationMessage);
      setActivationStep('setup');
      return;
    }

    setActivationStatus('checking-out');
    setSetupMessage('Starting secure payment...');
    saveStoredActivationSetup(data.claim.id, setup);

    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch('/api/create-activation-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
      },
      body: JSON.stringify({
        claimId: data.claim.id,
        setup,
      }),
    });
    const body = (await response.json().catch(() => null)) as { activated?: boolean; error?: string; url?: string } | null;

    setActivationStatus('idle');

    if (!response.ok || (!body?.url && !body?.activated)) {
      setSetupMessage(body?.error ?? 'Could not start payment. Please retry.');
      return;
    }

    if (body.activated) {
      clearStoredActivationSetup(data.claim.id);
      setSetupMessage('Development payment bypass complete. Claim activated and recorder emails sent.');
      window.history.replaceState(null, '', `/claims/${slug}`);
      await reload();
      return;
    }

    window.location.href = body.url;
  }

  if (loading) return <LoadingPage label="Loading claim..." />;
  if (error || !data) return <ErrorPage message={error ?? 'Claim not found.'} />;

  const isDraft = data.claim.status === 'draft';
  const isOwner = currentUserId === data.claim.creator_id;
  const recorderSuggestion = inferRecorderSetup(data.claim, data.proofRules);

  if (isDraft && isOwner && draftMode === 'activate') {
    const setup = activationSetup ?? readStoredActivationSetup(
      data.claim.id,
      createActivationSetupState(data.claim, recorderSuggestion, data.recorderInvites),
    );
    const allActivationReviewsPassed =
      activationReviews.length > 0 && activationReviews.every(([, review]) => review.claimable);

    return (
      <AppChrome>
        <main className="app-page section-shell">
          <section className="draft-review-hero activation-hero">
            <p className="eyebrow">Activate claim</p>
            <h1>Complete activation.</h1>
            <p>
              Confirm the pending proof setup, run one final review, then pay to open the claim for backing.
            </p>
          </section>

          <section className="mvp-panel activation-wizard">
            <div className="activation-steps" aria-label="Activation progress">
              {(['setup', 'review', 'payment'] as ActivationWizardStep[]).map((step, index) => (
                <button
                  className={activationStep === step ? 'selected' : ''}
                  type="button"
                  key={step}
                  onClick={() => setActivationStep(step)}
                  disabled={step === 'payment' && !allActivationReviewsPassed}
                >
                  <span>{index + 1}</span>
                  {step}
                </button>
              ))}
            </div>

            {activationStep === 'setup' ? (
              <div className="activation-step-panel">
                <div className="panel-heading-row">
                  <div>
                    <p className="eyebrow">Pending setup</p>
                    <h2>Select proof support.</h2>
                  </div>
                  <button className="button button-ghost" type="button" onClick={() => setDraftReviewMode('review')}>
                    Back to draft
                  </button>
                </div>
                <p className="form-message">
                  Required setup items are locked because the reviewed claim depends on them. To remove a required item,
                  use Edit so the claim goes through review again. Optional items only augment the proof setup.
                </p>

                <div className="setup-option-grid">
                  <button
                    className={`setup-option ${setup.selfRecording ? 'selected' : ''}`}
                    type="button"
                    onClick={() => {
                      if (!recorderSuggestion.selfRecommended) {
                        updateActivationSetup({ selfRecording: !setup.selfRecording });
                      }
                    }}
                    aria-pressed={setup.selfRecording}
                  >
                    <span>{setup.selfRecording ? 'Enabled' : 'Disabled'}</span>
                    <strong>Claimer records</strong>
                    <p>You or your device captures part of the proof.</p>
                    {recorderSuggestion.selfRecommended ? <small>Required by current claim</small> : <small>Optional add-on</small>}
                  </button>

                  <button
                    className={`setup-option ${setup.otherRecorder ? 'selected' : ''}`}
                    type="button"
                    onClick={() => {
                      if (!recorderSuggestion.otherRecommended) {
                        updateActivationSetup({ otherRecorder: !setup.otherRecorder });
                      }
                    }}
                    aria-pressed={setup.otherRecorder}
                  >
                    <span>{setup.otherRecorder ? 'Enabled' : 'Disabled'}</span>
                    <strong>Additional recorder</strong>
                    <p>Another person or second source supports the proof.</p>
                    {recorderSuggestion.otherRecommended ? <small>Required by current claim</small> : <small>Optional add-on</small>}
                  </button>

                  <button
                    className={`setup-option ${setup.externalProof ? 'selected' : ''}`}
                    type="button"
                    onClick={() => {
                      if (!recorderSuggestion.externalRecommended) {
                        updateActivationSetup({ externalProof: !setup.externalProof });
                      }
                    }}
                    aria-pressed={setup.externalProof}
                  >
                    <span>{setup.externalProof ? 'Enabled' : 'Disabled'}</span>
                    <strong>External proof source</strong>
                    <p>Public feed, GPS/sensor export, transcript, or artifact remains reviewable.</p>
                    {recorderSuggestion.externalRecommended ? <small>Required by current claim</small> : <small>Optional add-on</small>}
                  </button>
                </div>

                <div className="activation-fields">
                  {setup.selfRecording ? (
                    <div className="setup-fields-card">
                      <p className="eyebrow">Your recorder info</p>
                      <div className="form-grid">
                        <label>
                          Recorder name
                          <input
                            value={setup.selfName}
                            onChange={(event) => updateActivationSetup({ selfName: event.target.value })}
                            placeholder="Your name"
                          />
                        </label>
                        <label>
                          Contact
                          <input
                            value={setup.selfContact}
                            onChange={(event) => updateActivationSetup({ selfContact: event.target.value })}
                            placeholder="email, phone, or handle"
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}

                  {setup.otherRecorder ? (
                    <div className="setup-fields-card">
                      <p className="eyebrow">Recorder info</p>
                      <div className="form-grid">
                        <label>
                          Recorder name
                          <input
                            value={setup.recorderName}
                            onChange={(event) => updateActivationSetup({ recorderName: event.target.value })}
                            placeholder="Recorder name"
                          />
                        </label>
                        <label>
                          Recorder email
                          <input
                            value={setup.recorderContact}
                            type="email"
                            onChange={(event) => updateActivationSetup({ recorderContact: event.target.value })}
                            placeholder="recorder@example.com"
                          />
                        </label>
                        <label className="label-with-help">
                          <span>
                            Payout %
                            <span
                              className="tooltip-icon"
                              title="This portion will be paid to this person after the event execution is verified."
                              aria-label="This portion will be paid to this person after the event execution is verified."
                            >
                              ?
                            </span>
                          </span>
                          <input
                            value={setup.payoutSharePercent}
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            onChange={(event) => updateActivationSetup({ payoutSharePercent: event.target.value })}
                            placeholder="10"
                          />
                        </label>
                      </div>
                      <label>
                        Responsibilities
                        <textarea
                          value={setup.recorderResponsibilities}
                          rows={3}
                          onChange={(event) => updateActivationSetup({ recorderResponsibilities: event.target.value })}
                          placeholder="What this recorder or source must capture..."
                        />
                      </label>
                    </div>
                  ) : null}

                  {setup.externalProof ? (
                    <div className="setup-fields-card">
                      <p className="eyebrow">External proof source</p>
                      <div className="form-grid">
                        <label>
                          Source name
                          <input
                            value={setup.externalProofLabel}
                            onChange={(event) => updateActivationSetup({ externalProofLabel: event.target.value })}
                            placeholder="GPS app, public feed, transcript..."
                          />
                        </label>
                        <label>
                          Optional link/contact
                          <input
                            value={setup.externalProofLink}
                            onChange={(event) => updateActivationSetup({ externalProofLink: event.target.value })}
                            placeholder="URL, account, or contact"
                          />
                        </label>
                      </div>
                      <label>
                        What will be preserved?
                        <textarea
                          value={setup.externalProofDetails}
                          rows={3}
                          onChange={(event) => updateActivationSetup({ externalProofDetails: event.target.value })}
                          placeholder="Describe the saved artifact, metadata, transcript, log, or public proof feed."
                        />
                      </label>
                    </div>
                  ) : null}
                </div>

                <div className="action-row">
                  <button
                    className="button button-primary"
                    type="button"
                    onClick={() => void handleReviewActivationSetup(recorderSuggestion)}
                    disabled={activationStatus === 'reviewing'}
                  >
                    {activationStatus === 'reviewing' ? 'Reviewing...' : 'Review setup'}
                  </button>
                  <button className="button button-ghost" type="button" onClick={() => setDraftReviewMode('review')}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {activationStep === 'review' ? (
              <div className="activation-step-panel">
                <div className="panel-heading-row">
                  <div>
                    <p className="eyebrow">Final AI review</p>
                    <h2>Review activation readiness.</h2>
                  </div>
                  <button className="button button-ghost" type="button" onClick={() => setActivationStep('setup')}>
                    Back to setup
                  </button>
                </div>
                {activationReviews.length > 0 ? (
                  <div className="claimability-checks activation-review-list">
                    {activationReviews.map(([label, review]) => (
                      <div className={review.claimable ? 'passed' : 'failed'} key={label}>
                        <span>{review.claimable ? 'Pass' : 'Fix'}</span>
                        <strong>{label}</strong>
                        <p>{review.summary}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="form-message">Run setup review first.</p>
                )}
                <div className="action-row">
                  {allActivationReviewsPassed ? (
                    <button className="button button-primary" type="button" onClick={() => setActivationStep('payment')}>
                      Continue to payment
                    </button>
                  ) : (
                    <button className="button button-primary" type="button" onClick={() => setDraftReviewMode('edit')}>
                      Edit claim
                    </button>
                  )}
                  <button className="button button-ghost" type="button" onClick={() => void handleReviewActivationSetup(recorderSuggestion)}>
                    Re-run review
                  </button>
                </div>
              </div>
            ) : null}

            {activationStep === 'payment' ? (
              <div className="activation-step-panel">
                <p className="eyebrow">Payment</p>
                <h2>Pay to activate.</h2>
                <p className="form-message">
                  We will open a secure Stripe checkout. Once payment is confirmed, the claim opens for backing and
                  recorder emails are sent.
                </p>
                <Metric label="Locked amount" value={formatMoney(data.claim.stake_amount_cents)} />
                <div className="payment-rules">
                  <strong>Locked amount rules</strong>
                  <ul>
                    <li>
                      If supporter pledges minus platform fees are below the locked amount by the event date,
                      the claimer can cancel and receive the locked amount back.
                    </li>
                    <li>
                      If the event is attempted but cannot be verified, or does not fulfill the promised claim,
                      the locked amount is distributed to supporters after platform fees.
                    </li>
                    <li>
                      If the event is executed and verified, the locked amount is released to the claimer.
                    </li>
                  </ul>
                  <p>
                    Platform fees can vary from 5% to 10% of pledged or locked funds depending on the outcome rules.
                    The exact fee depends on the pledge amount, locked amount, and final verification result.
                  </p>
                </div>
                <div className="action-row">
                  <button
                    className="button button-primary"
                    type="button"
                    onClick={() => void handleStartActivationPayment(recorderSuggestion)}
                    disabled={activationStatus === 'checking-out' || activationStatus === 'verifying'}
                  >
                    {activationStatus === 'checking-out'
                      ? 'Opening checkout...'
                      : activationStatus === 'verifying'
                        ? 'Verifying payment...'
                        : 'Pay and activate'}
                  </button>
                  <button className="button button-ghost" type="button" onClick={() => setActivationStep('review')}>
                    Back to review
                  </button>
                </div>
              </div>
            ) : null}

            {setupMessage ? <p className="form-message">{setupMessage}</p> : null}
          </section>
        </main>
      </AppChrome>
    );
  }

  if (isDraft && isOwner) {
    return (
      <AppChrome>
        <main className="app-page section-shell">
          <section className="draft-review-hero">
            <p className="eyebrow">Review draft</p>
            <h1>Review before activation.</h1>
            <p>
              Check the claim preview and proof details. You can activate to add recorder and launch
              details, or edit the draft if the claim itself needs changes.
            </p>
          </section>

          {draftMode === 'edit' ? (
            <section className="mvp-panel">
              <p className="eyebrow">Edit draft</p>
              <h2>Update claim details.</h2>
              <form className="compact-form draft-edit-form" onSubmit={handleUpdateDraft}>
                <label>
                  Claim
                  <textarea name="title" rows={3} required defaultValue={data.claim.title} />
                </label>
                <label>
                  Why should people care?
                  <textarea name="description" rows={4} defaultValue={data.claim.description ?? ''} />
                </label>
                <label>
                  Proof rules
                  <textarea
                    name="proofRules"
                    rows={6}
                    required
                    defaultValue={data.proofRules.map((rule) => rule.rule).join('\n')}
                  />
                </label>
                <label>
                  Live proof setup
                  <textarea name="liveSetup" rows={4} required defaultValue={data.claim.event_context ?? ''} />
                </label>
                <label>
                  Supporter interaction
                  <textarea name="supporterInteraction" rows={3} defaultValue={data.claim.destination_rule ?? ''} />
                </label>
                <div className="form-grid">
                  <FormField label="Stake amount ($)" name="stakeAmount" type="number" defaultValue={String(data.claim.stake_amount_cents / 100)} />
                  <FormField label="Pledge threshold ($)" name="pledgeThreshold" type="number" defaultValue={String(data.claim.pledge_threshold_cents / 100)} />
                  <FormField label="Live start" name="liveStartsAt" type="datetime-local" defaultValue={toDateTimeLocalValue(data.claim.live_starts_at)} />
                  <FormField label="Deadline" name="deadlineAt" type="datetime-local" defaultValue={toDateTimeLocalValue(data.claim.deadline_at)} />
                </div>
                <div className="action-row">
                  <button className="button button-primary" type="submit">Save changes</button>
                  <button className="button button-ghost" type="button" onClick={() => setDraftReviewMode('review')}>
                    Cancel
                  </button>
                </div>
              </form>
              {setupMessage ? <p className="form-message">{setupMessage}</p> : null}
            </section>
          ) : (
            <>
              <div className="mvp-layout">
                <section className="mvp-panel draft-preview-panel">
                  <p className="eyebrow">Claim preview</p>
                  <h2>{data.claim.title}</h2>
                  {data.claim.description ? <p>{data.claim.description}</p> : null}
                  <ProofRules rules={data.proofRules} />
                </section>

                <aside className="mvp-panel">
                  <p className="eyebrow">Review details</p>
                  <Metric label="Status" value="Draft" />
                  <Metric label="Stake" value={formatMoney(data.claim.stake_amount_cents)} />
                  <Metric label="Pledge goal" value={formatMoney(data.claim.pledge_threshold_cents)} />
                  <Metric label="Live start" value={formatDateTime(data.claim.live_starts_at)} />
                  <Metric label="Deadline" value={formatDateTime(data.claim.deadline_at)} />
                </aside>
              </div>

              <section className="mvp-panel draft-action-panel">
                <p className="eyebrow">Next action</p>
                <h2>What do you want to do with this draft?</h2>
                <div className="action-row">
                  <button className="button button-primary" type="button" onClick={() => setDraftReviewMode('activate')}>
                    Activate
                  </button>
                  <button className="button button-ghost" type="button" onClick={() => setDraftReviewMode('edit')}>
                    Edit
                  </button>
                </div>
                {setupMessage ? <p className="form-message">{setupMessage}</p> : null}
              </section>
            </>
          )}
        </main>
      </AppChrome>
    );
  }

  return (
    <AppChrome>
      <main className="app-page section-shell">
        <ClaimHeader claim={data.claim} />
        <div className="mvp-layout">
          <section className="mvp-panel">
            <p className="eyebrow">Preview page</p>
            <h2>{data.claim.title}</h2>
            <p>{data.claim.description}</p>
            {isDraft ? (
              <p className="form-message">
                This is a private draft. Add recording access and activate it before sharing with supporters.
              </p>
            ) : (
              <ShareBar claim={data.claim} />
            )}
            <ProofRules rules={data.proofRules} />
          </section>

          <aside className="mvp-panel">
            {isDraft ? (
              <>
                <p className="eyebrow">Draft</p>
                <Metric label="Status" value="Setup incomplete" />
                <Metric label="Recorder status" value={data.recorderInvites.length > 0 ? 'Added' : 'Needed'} />
                <Metric label="Payment setup" value="Deferred until lock" />
                <p className="form-message">
                  The claim is saved, but not public for backing yet. Add recording access, then activate it.
                </p>
              </>
            ) : (
              <>
                <p className="eyebrow">Pledge threshold</p>
                <Metric label="Pledged" value={formatMoney(data.claim.pledge_pool_cents)} />
                <Metric label="Threshold" value={formatMoney(data.claim.pledge_threshold_cents)} />
                <Metric label="Supporters" value={String(data.claim.supporter_count)} />
                <ProgressBar value={data.claim.pledge_pool_cents} max={data.claim.pledge_threshold_cents} />
                <form className="compact-form" onSubmit={handlePledge}>
                  <FormField label="Name" name="supporterName" required placeholder="Supporter name" />
                  <FormField label="Handle" name="supporterHandle" placeholder="@supporter" />
                  <FormField label="Email for live reminder" name="supporterEmail" type="email" placeholder="optional" />
                  <FormField label="Pledge amount ($)" name="amount" type="number" defaultValue="25" />
                  <button className="button button-primary" type="submit">Back this claim</button>
                </form>
                {pledgeMessage ? <p className="form-message">{pledgeMessage}</p> : null}
              </>
            )}
          </aside>
        </div>

        <section className="mvp-panel">
          <p className="eyebrow">Next steps</p>
          <div className="action-grid">
            <a className="button button-primary" href={`/claims/${data.claim.slug}/live`}>Open live room</a>
            <a className="button button-ghost" href={`/claims/${data.claim.slug}/result`}>View result page</a>
          </div>
          <SupporterWall pledges={data.pledges} />
        </section>
      </main>
    </AppChrome>
  );
}

function ClaimLivePage({ slug }: { slug: string }) {
  const { data, loading, error, reload } = useClaimBundle(slug);
  const [eventMessage, setEventMessage] = useState('');

  async function addProofEvent(eventType: string, title: string) {
    if (!data) return;
    const { error: insertError } = await supabase.from('claim_proof_events').insert({
      claim_id: data.claim.id,
      event_type: eventType,
      title,
      source_role: 'claimer',
      source_name: data.claim.creator_name,
    });
    setEventMessage(insertError ? insertError.message : `${title} logged.`);
    if (!insertError) await reload();
  }

  async function submitDirection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const direction = String(formData.get('direction') || '').trim();
    if (!data || !direction) return;
    const { error: inputError } = await supabase.from('claim_supporter_inputs').insert({
      claim_id: data.claim.id,
      supporter_name: 'Live supporter',
      input_type: 'direction',
      content: direction,
    });
    setEventMessage(inputError ? inputError.message : 'Supporter direction logged.');
    if (!inputError) event.currentTarget.reset();
    if (!inputError) await reload();
  }

  async function submitCheckin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const checkin = String(formData.get('checkin') || '').trim();
    if (!data || !checkin) return;
    const { error: checkinError } = await supabase.from('claim_checkins').insert({
      claim_id: data.claim.id,
      label: checkin,
      notes: 'Manual MVP check-in from live room.',
    });
    setEventMessage(checkinError ? checkinError.message : 'Check-in logged.');
    if (!checkinError) event.currentTarget.reset();
    if (!checkinError) await reload();
  }

  if (loading) return <LoadingPage label="Opening live room..." />;
  if (error || !data) return <ErrorPage message={error ?? 'Claim not found.'} />;

  return (
    <AppChrome>
      <main className="app-page section-shell">
        <ClaimHeader claim={data.claim} />
        <div className="mvp-layout live-layout">
          <section className="mvp-panel live-video-panel">
            <p className="eyebrow">Claim live room</p>
            <LiveKitJoinPanel claim={data.claim} />
          </section>
          <aside className="mvp-panel">
            <p className="eyebrow">Proof controls</p>
            <div className="action-grid">
              <button className="button button-ghost" type="button" onClick={() => addProofEvent('live_room_opened', 'Live room opened')}>
                Log room opened
              </button>
              <button className="button button-ghost" type="button" onClick={() => addProofEvent('proof_code_shown', 'Proof code shown on stream')}>
                Log proof code shown
              </button>
              <button className="button button-ghost" type="button" onClick={() => addProofEvent('attempt_started', 'Attempt started')}>
                Log attempt start
              </button>
            </div>
            <form className="compact-form" onSubmit={submitDirection}>
              <FormField label="Supporter direction/input" name="direction" placeholder="Take the bridge next" />
              <button className="button button-primary" type="submit">
                Log direction
              </button>
            </form>
            <form className="compact-form" onSubmit={submitCheckin}>
              <FormField label="Check-in label" name="checkin" placeholder="Checkpoint 2: central station" />
              <button className="button button-primary" type="submit">
                Submit check-in
              </button>
            </form>
            {eventMessage ? <p className="form-message">{eventMessage}</p> : null}
          </aside>
        </div>
        <Timeline events={data.proofEvents} checkins={data.checkins} />
      </main>
    </AppChrome>
  );
}

function ClaimResultPage({ slug }: { slug: string }) {
  const { data, loading, error } = useClaimBundle(slug);
  if (loading) return <LoadingPage label="Loading result..." />;
  if (error || !data) return <ErrorPage message={error ?? 'Claim not found.'} />;

  return (
    <AppChrome>
      <main className="app-page section-shell">
        <ClaimHeader claim={data.claim} />
        <section className="mvp-panel">
          <p className="eyebrow">Result page scaffold</p>
          <h2>Evidence package ready for review.</h2>
          <p>
            This page will publish the final verified / not proven decision. For the MVP
            foundation it already displays the proof timeline and check-ins captured during
            the live room.
          </p>
        </section>
        <Timeline events={data.proofEvents} checkins={data.checkins} />
      </main>
    </AppChrome>
  );
}

function RecorderInvitePage({ token }: { token: string }) {
  const [invite, setInvite] = useState<RecorderInvite | null>(null);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadInvite() {
      const { data: inviteData, error } = await supabase
        .from('claim_recorder_invites')
        .select('*')
        .eq('invite_token', token)
        .single();
      if (error || !inviteData) {
        setMessage(error?.message ?? 'Invite not found.');
        return;
      }
      setInvite(inviteData as RecorderInvite);
      const { data: claimData } = await supabase.from('claims').select('*').eq('id', inviteData.claim_id).single();
      setClaim(claimData as Claim | null);
    }
    void loadInvite();
  }, [token]);

  async function acceptInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invite) return;
    const formData = new FormData(event.currentTarget);
    const { error } = await supabase
      .from('claim_recorder_invites')
      .update({
        invitee_name: nullableString(formData.get('inviteeName')) ?? invite.invitee_name,
        invitee_contact: nullableString(formData.get('inviteeContact')) ?? invite.invitee_contact,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('invite_token', token);
    setMessage(error ? error.message : 'Invite accepted. You can join from the claim live room.');
  }

  return (
    <AppChrome>
      <main className="app-page section-shell">
        <p className="eyebrow">Recorder invite</p>
        <h1 className="page-title">Support the proof.</h1>
        <section className="mvp-panel">
          {claim ? <h2>{claim.title}</h2> : null}
          {invite ? (
            <>
              <p>
                Role: <strong>{invite.role}</strong>. Payout share: <strong>{invite.payout_share_bps / 100}%</strong>
              </p>
              <p>{invite.responsibilities}</p>
              <form className="compact-form" onSubmit={acceptInvite}>
                <FormField label="Your name" name="inviteeName" defaultValue={invite.invitee_name ?? ''} />
                <FormField label="Contact" name="inviteeContact" defaultValue={invite.invitee_contact ?? ''} />
                <button className="button button-primary" type="submit">Accept recorder role</button>
              </form>
            </>
          ) : null}
          {message ? <p className="form-message">{message}</p> : null}
        </section>
      </main>
    </AppChrome>
  );
}

function LiveKitJoinPanel({ claim }: { claim: Claim }) {
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'claimer' | 'recorder' | 'witness' | 'supporter'>('supporter');
  const [connectionState, setConnectionState] = useState('Not connected');

  async function joinRoom(currentDisplayName: string) {
    setConnectionState('Requesting token...');
    const roomName = `claim-${claim.slug}`;
    const response = await fetch('/api/livekit-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName,
        identity: `${role}-${crypto.randomUUID()}`,
        displayName: currentDisplayName || role,
        role,
      }),
    });

    if (!response.ok) {
      setConnectionState('Token request failed. Deploy on Vercel or check API env vars.');
      return;
    }

    const { token } = (await response.json()) as { token: string };
    const room = new Room();
    room.on(RoomEvent.ConnectionStateChanged, (state) => setConnectionState(state));
    await room.connect(import.meta.env.VITE_LIVEKIT_URL, token);

    if (role !== 'supporter') {
      await room.localParticipant.setCameraEnabled(true);
      await room.localParticipant.setMicrophoneEnabled(true);
    }

    setConnectionState(`Connected to ${roomName} as ${role}`);
  }

  return (
    <div className="livekit-panel">
      <div className="video-placeholder livekit-placeholder">
        <p className="video-label">LiveKit room</p>
        <h3>{claim.title}</h3>
        <p>
          Join as claimer, recorder, witness, or supporter. Camera publishing is enabled for
          claimer/recorder/witness roles.
        </p>
      </div>
      <div className="compact-form">
        <label>
          Display name
          <input
            name="displayName"
            placeholder="Your name"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>
        <label>
          Role
          <select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
            <option value="supporter">Supporter</option>
            <option value="claimer">Claimer</option>
            <option value="recorder">Recorder</option>
            <option value="witness">Witness</option>
          </select>
        </label>
        <button
          className="button button-primary"
          type="button"
          onClick={() => {
            void joinRoom(displayName);
          }}
        >
          Join live room
        </button>
        <p className="form-message">{connectionState}</p>
      </div>
    </div>
  );
}

function useClaimBundle(slug: string) {
  const [data, setData] = useState<ClaimBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data: claim, error: claimError } = await supabase.from('claims').select('*').eq('slug', slug).single();
    if (claimError || !claim) {
      setError(claimError?.message ?? 'Claim not found.');
      setLoading(false);
      return;
    }

    const [proofRules, pledges, recorderInvites, proofEvents, checkins] = await Promise.all([
      supabase.from('claim_proof_rules').select('*').eq('claim_id', claim.id).order('position'),
      supabase.from('claim_pledges').select('id, supporter_name, supporter_handle, amount_cents, created_at').eq('claim_id', claim.id).order('created_at', { ascending: false }),
      supabase.from('claim_recorder_invites').select('*').eq('claim_id', claim.id).order('created_at', { ascending: false }),
      supabase.from('claim_proof_events').select('*').eq('claim_id', claim.id).order('event_time', { ascending: false }),
      supabase.from('claim_checkins').select('*').eq('claim_id', claim.id).order('checked_in_at', { ascending: false }),
    ]);

    setData({
      claim: claim as Claim,
      proofRules: (proofRules.data ?? []) as ProofRule[],
      pledges: (pledges.data ?? []) as Pledge[],
      recorderInvites: (recorderInvites.data ?? []) as RecorderInvite[],
      proofEvents: (proofEvents.data ?? []) as ProofEvent[],
      checkins: (checkins.data ?? []) as Checkin[],
    });
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [slug]);

  return { data, loading, error, reload: load };
}

function ClaimHeader({ claim }: { claim: Claim }) {
  return (
    <section className="claim-header">
      <p className="eyebrow">{formatClaimType(claim.claim_type)}</p>
      <h1 className="page-title">{claim.title}</h1>
      <div className="claim-meta">
        <span>{claim.status.replace(/_/g, ' ')}</span>
        <span>{formatMoney(claim.pledge_pool_cents)} pledged</span>
        <span>{claim.supporter_count} supporters</span>
        <span>{claim.recorder_count} recorders</span>
      </div>
    </section>
  );
}

function ProofRules({ rules }: { rules: ProofRule[] }) {
  return (
    <div className="rule-list">
      <p className="eyebrow">Locked proof checklist</p>
      {rules.map((rule) => (
        <div className="rule-item" key={rule.id}>
          <span>{rule.position}</span>
          <p>{rule.rule}</p>
        </div>
      ))}
    </div>
  );
}

function ShareBar({ claim }: { claim: Claim }) {
  const url = `${window.location.origin}/claims/${claim.slug}`;
  const shareText = `I am making a ${appConfig.name} claim: ${claim.title}. Back it and watch the proof.`;
  return (
    <div className="share-bar">
      <input readOnly value={url} aria-label="Claim share URL" />
      <a className="button button-ghost" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText} ${url}`)}`} target="_blank" rel="noreferrer">
        Share on X
      </a>
      <a className="button button-ghost" href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`} target="_blank" rel="noreferrer">
        WhatsApp
      </a>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="progress-track threshold-track" aria-label={`Threshold ${percent}%`}>
      <span className="progress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

function SupporterWall({ pledges }: { pledges: Pledge[] }) {
  return (
    <div className="mini-list">
      <p className="eyebrow">Supporter wall</p>
      {pledges.length === 0 ? <p>No public pledges yet.</p> : null}
      {pledges.map((pledge) => (
        <div key={pledge.id}>
          <strong>{pledge.supporter_name}</strong>
          <span>{formatMoney(pledge.amount_cents)}</span>
        </div>
      ))}
    </div>
  );
}

function InviteList({ invites }: { invites: RecorderInvite[] }) {
  return (
    <div className="mini-list">
      <p className="eyebrow">Recorder invites</p>
      {invites.length === 0 ? <p>No recorder invites yet.</p> : null}
      {invites.map((invite) => (
        <div key={invite.id}>
          <strong>{invite.invitee_name ?? invite.role}</strong>
          <span>{invite.status}</span>
        </div>
      ))}
    </div>
  );
}

function Timeline({ events, checkins }: { events: ProofEvent[]; checkins: Checkin[] }) {
  return (
    <section className="mvp-panel timeline-panel">
      <p className="eyebrow">Evidence timeline</p>
      {[...events, ...checkins.map((checkin) => ({
        id: checkin.id,
        event_type: 'checkin',
        title: checkin.label,
        description: checkin.notes,
        event_time: checkin.checked_in_at,
        source_role: null,
        source_name: null,
      }))].sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime()).map((item) => (
        <div className="timeline-row" key={`${item.event_type}-${item.id}`}>
          <span>{new Date(item.event_time).toLocaleString()}</span>
          <strong>{item.title}</strong>
          {item.description ? <p>{item.description}</p> : null}
        </div>
      ))}
    </section>
  );
}

function LoadingPage({ label }: { label: string }) {
  return (
    <AppChrome>
      <main className="app-page section-shell">
        <p className="eyebrow">{label}</p>
      </main>
    </AppChrome>
  );
}

function ErrorPage({ message }: { message: string }) {
  return (
    <AppChrome>
      <main className="app-page section-shell">
        <p className="eyebrow">Something broke</p>
        <h1 className="page-title">{message}</h1>
      </main>
    </AppChrome>
  );
}

function createSlug(input: string) {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const prefix = base.slice(0, 48).replace(/(^-|-$)/g, '') || 'claim';
  const suffix = Math.random().toString(36).slice(2, 8);

  return `${prefix}-${suffix}`;
}

function getAuthRedirectUrl(nextPath: string) {
  const safeNextPath = nextPath.startsWith('/') ? nextPath : '/claims/new';
  const configuredOrigin = appConfig.authRedirectOrigin?.replace(/\/$/, '');
  const origin = configuredOrigin || window.location.origin;
  return `${origin}/auth/callback?next=${encodeURIComponent(safeNextPath)}`;
}

function parseProofRules(value: FormDataEntryValue | null) {
  const rules = String(value ?? '')
    .split('\n')
    .map((rule) => rule.trim())
    .filter(Boolean);

  if (rules.length > 0) {
    return rules;
  }

  return [
    'The claim rules are locked before pledges open.',
    'The attempt is recorded live by the claimer, recorder, or witness.',
    'The final outcome is visible, timestamped, or independently checkable before the deadline.',
  ];
}

function formatClaimType(claimType: ClaimType) {
  if (claimType === 'city_walk') {
    return 'Live chat city walk';
  }

  if (claimType === 'public_statement') {
    return 'Public statement moment';
  }

  return 'Live proof claim';
}

function nullableString(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function nullableDateTime(value: FormDataEntryValue | null) {
  const text = nullableString(value);
  return text ? new Date(text).toISOString() : null;
}

function dollarsToCents(value: FormDataEntryValue | null) {
  return Math.max(0, Math.round(Number(value || 0) * 100));
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}
