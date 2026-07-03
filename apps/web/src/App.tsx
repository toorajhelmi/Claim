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

export function App() {
  return (
    <>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="grain" aria-hidden="true" />

      <header className="site-header">
        <a className="brand" href="#" aria-label="Claim home">
          <span className="brand-mark">C</span>
          <span>Claim</span>
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#examples">Examples</a>
          <a href="#creators">Creators</a>
          <a href="#apply">Apply</a>
        </nav>
        <a className="nav-cta" href="#apply">
          Run a Claim
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
              Claim turns bold creator claims into paid public events.
              Supporters pledge to back the attempt. If the challenger proves
              it, they earn the pledge pool.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#apply">
                Start a Claim
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
              Your audience already watches you try things. Claim gives them a
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
                Every Claim page needs visible proof rules, timeline updates,
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
            <h2>Want to run one of the first Claims?</h2>
            <p>
              We are setting up the first claim pages manually. Bring the claim
              and the audience. Claim handles the page, pledge/precommit flow,
              proof checklist, supporter wall, and final result.
            </p>
            <form className="apply-form" action="#" method="post">
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
                Request pilot setup
              </button>
            </form>
            <p className="form-note">
              Form is a landing-page placeholder. Wire this to a waitlist tool,
              email capture, or backend when validation starts.
            </p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>Claim</span>
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
