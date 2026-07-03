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
    title: 'I can write and perform a song live by Friday.',
    proof: 'Proof: writing clips, rehearsal livestream, final performance.',
    money: '$2,430',
    detail: 'pledged by 127 supporters',
    status: 'Live',
    meta: '02d 14h left',
  },
  {
    title: 'I can cook a 5-course meal from follower ingredients.',
    proof: 'Proof: ingredient reveal, live cook, plated final, guest notes.',
    money: '$1,180',
    detail: 'pledged by 83 supporters',
    status: 'Proving',
    meta: 'Final clip due',
  },
  {
    title: 'I can build a playable game prototype in 48 hours.',
    proof: 'Proof: build stream, timestamps, final demo, reviewer note.',
    money: '$3,840',
    detail: 'earned after verification',
    status: 'Verified',
    meta: 'Paid out',
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
  'I can cook a 5-course meal from follower ingredients.',
  'I can write and perform a song live by Friday.',
  'I can beat my 5K time in 30 days.',
  'I can build a working app in one weekend.',
  'I can learn enough Arabic for a 10-minute conversation.',
];

const statusClassName: Record<ClaimExample['status'], string> = {
  Live: 'live',
  Proving: 'proving',
  Verified: 'verified',
};

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
        <section className="hero section-shell">
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

          <div className="hero-stage" aria-label="Animated product preview">
            <div className="phone-frame hero-phone">
              <div className="phone-top">
                <span />
                <span />
              </div>
              <div className="video-placeholder hero-video">
                <p className="video-label">Hero video placeholder</p>
                <h2>Fast vertical reel</h2>
                <p>
                  Video description: quick cuts of a creator saying "I can
                  learn this song by Friday," comments exploding, pledge count
                  rising, countdown ticking, proof clips, then a big VERIFIED
                  stamp.
                </p>
              </div>
            </div>

            <article className="floating-card claim-card card-one">
              <span className="status live">Live claim</span>
              <h3>I can build a playable game in 48 hours.</h3>
              <div className="card-meta">
                <span>$3,840 pledged</span>
                <span>214 backers</span>
              </div>
              <div className="progress-track">
                <span className="progress-fill progress-fill-68" />
              </div>
            </article>

            <article className="floating-card proof-card card-two">
              <span className="status proving">Proof checklist</span>
              <ul>
                <li>Live stream started</li>
                <li>Prototype submitted</li>
                <li>Final demo pending</li>
              </ul>
            </article>

            <article className="floating-card verified-card card-three">
              <span>VERIFIED</span>
              <p>Claim proved by video, checklist, and reviewer notes.</p>
            </article>
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
