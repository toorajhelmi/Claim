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
    title: 'Creator announcement reel',
    description:
      'Vertical social video. Creator talks directly to camera, makes a bold claim, shows the stake, and points to a countdown plus supporter wall.',
  },
  {
    label: 'Video area 2',
    title: 'Pledge surge moment',
    description:
      'Fast montage of comments, supporter avatars, and pledge counter rising while the creator reacts to the audience backing the attempt.',
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

type ClaimType = 'city_walk' | 'public_statement';
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

const defaultCityRules = [
  'Live stream starts at the declared start point.',
  'Route decisions must come from live supporter chat or votes.',
  'Timestamped check-ins are submitted during the route.',
  'Challenger reaches the destination before the sunset deadline.',
];

const defaultStatementRules = [
  'Exact statement or question is locked before pledges open.',
  'Public event/context and opportunity window are declared.',
  'The attempt is recorded live by challenger or recorder.',
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

  return <LandingPage />;
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
          <a href="#creators">Creators</a>
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
                aria-label="Cinematic video preview of a creator crossing the city by sunset with live chat directions"
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
                  Video description: cinematic opening on the creator at the
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
              {appConfig.name} turns bold creator claims into paid public events.
              Supporters pledge to back the attempt. If the challenger proves
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
              <p>Creator posts a clear, time-bound claim with locked proof rules.</p>
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
              <p>The challenger earns the pledge pool when the claim is proved.</p>
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
            <p className="eyebrow">For creators</p>
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
              <span className="status live">Creator upside</span>
              <h3>$4,620 pledge pool</h3>
              <p>If verified, payout goes to the challenger minus platform fee.</p>
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
                Creator handle
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
  | { name: 'new-claim' }
  | { name: 'claim-detail'; slug: string }
  | { name: 'claim-live'; slug: string }
  | { name: 'claim-result'; slug: string }
  | { name: 'recorder-invite'; token: string } {
  const parts = pathname.split('/').filter(Boolean);

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
        <a className="nav-cta" href="/claims/new">
          Run a claim
        </a>
      </header>
      {children}
    </>
  );
}

function CreateClaimPage() {
  const [claimType, setClaimType] = useState<ClaimType>('city_walk');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get('title') || '').trim();
    const creatorName = String(formData.get('creatorName') || '').trim();
    const slug = createSlug(title);

    const proofRules = claimType === 'city_walk' ? defaultCityRules : defaultStatementRules;
    const claimPayload = {
      slug,
      creator_name: creatorName,
      creator_handle: nullableString(formData.get('creatorHandle')),
      creator_platform: nullableString(formData.get('creatorPlatform')),
      contact_email: nullableString(formData.get('contactEmail')),
      claim_type: claimType,
      status: 'open_for_backing' as const,
      title,
      description: nullableString(formData.get('description')),
      teaser_title: title,
      teaser_description: `Back ${creatorName}'s live claim and watch the proof.`,
      stake_amount_cents: dollarsToCents(formData.get('stakeAmount')),
      pledge_threshold_cents: dollarsToCents(formData.get('pledgeThreshold')),
      live_starts_at: nullableDateTime(formData.get('liveStartsAt')),
      deadline_at: nullableDateTime(formData.get('deadlineAt')),
      proof_summary: proofRules.join('\n'),
      exact_statement: claimType === 'public_statement' ? nullableString(formData.get('exactStatement')) : null,
      event_context: claimType === 'public_statement' ? nullableString(formData.get('eventContext')) : null,
      start_area: claimType === 'city_walk' ? nullableString(formData.get('startArea')) : null,
      destination_rule: claimType === 'city_walk' ? nullableString(formData.get('destinationRule')) : null,
      allowed_transport: claimType === 'city_walk' ? nullableString(formData.get('allowedTransport')) : null,
      checkin_interval_minutes:
        claimType === 'city_walk' ? Number(formData.get('checkinIntervalMinutes') || 20) : null,
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
    window.location.href = `/claims/${claim.slug}`;
  }

  return (
    <AppChrome>
      <main className="app-page section-shell">
        <p className="eyebrow">Create claim</p>
        <h1 className="page-title">Launch a live proof claim.</h1>
        <p className="page-lede">
          Start with one of the two MVP stress-test formats: live chat city walk or public
          statement moment.
        </p>

        <form className="mvp-form" onSubmit={handleSubmit}>
          <div className="type-toggle" role="group" aria-label="Claim type">
            <button
              className={claimType === 'city_walk' ? 'selected' : ''}
              type="button"
              onClick={() => setClaimType('city_walk')}
            >
              Live chat city walk
            </button>
            <button
              className={claimType === 'public_statement' ? 'selected' : ''}
              type="button"
              onClick={() => setClaimType('public_statement')}
            >
              Public statement moment
            </button>
          </div>

          <FormField label="Claim title" name="title" required placeholder={claimType === 'city_walk' ? 'I will cross the city by sunset using only live chat directions.' : 'I will ask this exact question during a public Q&A.'} />
          <FormField label="Creator name" name="creatorName" required placeholder="Your name" />
          <div className="form-grid">
            <FormField label="Creator handle" name="creatorHandle" placeholder="@yourhandle" />
            <FormField label="Platform" name="creatorPlatform" placeholder="TikTok, X, Twitch..." />
          </div>
          <FormField label="Contact email" name="contactEmail" type="email" placeholder="you@example.com" />
          <label>
            Description
            <textarea name="description" rows={4} placeholder="Explain the attempt, what supporters can influence, and what proof will settle the result." />
          </label>

          {claimType === 'city_walk' ? (
            <div className="form-grid">
              <FormField label="Start area" name="startArea" placeholder="Downtown station" />
              <FormField label="Destination rule" name="destinationRule" placeholder="Supporters reveal the destination at start" />
              <FormField label="Allowed transport" name="allowedTransport" placeholder="Walk, metro, bus; no rideshare" />
              <FormField label="Check-in interval minutes" name="checkinIntervalMinutes" type="number" defaultValue="20" />
            </div>
          ) : (
            <>
              <FormField label="Exact statement/question" name="exactStatement" placeholder="The exact thing you will say or ask" />
              <FormField label="Event context" name="eventContext" placeholder="Public Q&A, scheduled talk, public comment period..." />
            </>
          )}

          <div className="form-grid">
            <FormField label="Stake amount ($)" name="stakeAmount" type="number" defaultValue="100" />
            <FormField label="Pledge threshold ($)" name="pledgeThreshold" type="number" defaultValue="500" />
            <FormField label="Live starts at" name="liveStartsAt" type="datetime-local" />
            <FormField label="Deadline" name="deadlineAt" type="datetime-local" />
          </div>

          <button className="button button-primary" type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Creating...' : 'Create preview page'}
          </button>
          {message ? <p className="form-message">{message}</p> : null}
        </form>
      </main>
    </AppChrome>
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

function ClaimDetailPage({ slug }: { slug: string }) {
  const { data, loading, error, reload } = useClaimBundle(slug);
  const [pledgeMessage, setPledgeMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('');

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

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const formData = new FormData(event.currentTarget);
    const { data: invite, error: inviteError } = await supabase
      .from('claim_recorder_invites')
      .insert({
        claim_id: data.claim.id,
        role: formData.get('role'),
        invitee_name: nullableString(formData.get('inviteeName')),
        invitee_contact: nullableString(formData.get('inviteeContact')),
        payout_share_bps: Number(formData.get('payoutShareBps') || 0),
        responsibilities: nullableString(formData.get('responsibilities')),
      })
      .select('invite_token')
      .single();
    setInviteLink(inviteError ? inviteError.message : `${window.location.origin}/recorder/invite/${invite.invite_token}`);
    if (!inviteError) await reload();
  }

  if (loading) return <LoadingPage label="Loading claim..." />;
  if (error || !data) return <ErrorPage message={error ?? 'Claim not found.'} />;

  return (
    <AppChrome>
      <main className="app-page section-shell">
        <ClaimHeader claim={data.claim} />
        <div className="mvp-layout">
          <section className="mvp-panel">
            <p className="eyebrow">Preview page</p>
            <h2>{data.claim.title}</h2>
            <p>{data.claim.description}</p>
            <ShareBar claim={data.claim} />
            <ProofRules rules={data.proofRules} />
          </section>

          <aside className="mvp-panel">
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
          </aside>
        </div>

        <div className="mvp-layout">
          <section className="mvp-panel">
            <p className="eyebrow">Recorder / witness invite</p>
            <form className="compact-form" onSubmit={handleInvite}>
              <label>
                Role
                <select name="role" defaultValue="recorder">
                  <option value="recorder">Recorder</option>
                  <option value="witness">Witness</option>
                </select>
              </label>
              <FormField label="Invitee name" name="inviteeName" placeholder="Alex" />
              <FormField label="Contact" name="inviteeContact" placeholder="phone, email, or handle" />
              <FormField label="Payout share bps" name="payoutShareBps" type="number" defaultValue="1000" />
              <label>
                Responsibilities
                <textarea name="responsibilities" rows={3} placeholder="Second camera, confirm check-ins, add notes..." />
              </label>
              <button className="button button-ghost" type="submit">Create invite link</button>
            </form>
            {inviteLink ? <p className="form-message selectable">{inviteLink}</p> : null}
          </section>

          <section className="mvp-panel">
            <p className="eyebrow">Next steps</p>
            <div className="action-grid">
              <a className="button button-primary" href={`/claims/${data.claim.slug}/live`}>Open live room</a>
              <a className="button button-ghost" href={`/claims/${data.claim.slug}/result`}>View result page</a>
            </div>
            <SupporterWall pledges={data.pledges} />
            <InviteList invites={data.recorderInvites} />
          </section>
        </div>
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
      source_role: 'challenger',
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
  const [role, setRole] = useState<'challenger' | 'recorder' | 'witness' | 'supporter'>('supporter');
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
          Join as challenger, recorder, witness, or supporter. Camera publishing is enabled for
          challenger/recorder/witness roles.
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
            <option value="challenger">Challenger</option>
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
      <p className="eyebrow">{claim.claim_type === 'city_walk' ? 'Live chat city walk' : 'Public statement moment'}</p>
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
    .replace(/(^-|-$)/g, '')
    .slice(0, 58);
  return `${base || 'claim'}-${Math.random().toString(36).slice(2, 7)}`;
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
