# Supporter Experience Design

This document defines the supporter-side experience for Klaimd: the home page, claim discovery, invitations, live participation, and post-event outcomes.

## Goals

- Help supporters quickly rejoin live events they have backed.
- Make invited claims easy to evaluate, support, or dismiss.
- Give supporters a history of claims they backed, including outcomes and replay/review status.
- Surface other claims they may want to support without making the matching algorithm part of the MVP.
- Keep the supporter experience lightweight, social, and live-first.

## Supporter home

The logged-in supporter home should feel like a live activity hub, not a static dashboard.

### Top priority rail: Live now

Purpose: get supporters into live proof events with one tap.

Show claims where:

- the supporter pledged;
- the supporter was invited;
- the claim status is `live`.

Card content:

- claim title;
- claimer name;
- live badge;
- pledge amount, if the supporter pledged;
- number of active viewers or recent chat/reaction count later;
- primary CTA: `Join live`;
- secondary CTA: `View claim`.

Selecting `Join live` opens:

- `/claims/:slug/live`;
- supporter joins as viewer only;
- video/player is primary;
- chat, reactions, and structured prompts are minimized over the stream.

Empty state:

- "No supported events are live right now."
- CTA to browse supportable claims.

### Invited to support

Purpose: convert direct invitations into supporters.

Show claims where:

- the supporter email received an invite;
- the user has not pledged yet;
- claim status is not final.

Card content:

- who invited them;
- claim title;
- pledge goal and current backing progress;
- scheduled live time or deadline;
- locked amount explanation in one sentence;
- CTAs: `View invitation`, `Support`, `Not interested`.

Selecting `View invitation` opens:

- a supporter invitation page focused on trust and context:
  - claim statement;
  - why this person invited you;
  - proof rules;
  - pledge/locked amount rules;
  - live date;
  - supporter actions.

Selecting `Support` opens:

- the claim pledge module on `/claims/:slug`;
- pledge amount field;
- payment/hold explanation later;
- after support, the claim moves to the supporter's "Upcoming supported" or "Live now" section.

### Upcoming supported

Purpose: show claims the supporter has backed but cannot watch yet.

Show claims where:

- supporter pledged;
- claim is `open_for_backing`, `threshold_met`, or `scheduled`;
- claim is not live yet.

Card content:

- claim title;
- claimer name;
- pledge amount;
- scheduled time/deadline;
- backing progress;
- proof setup status if available;
- CTAs: `View claim`, `Share`, `Set reminder` later.

Selecting the card opens:

- `/claims/:slug`;
- supporter sees backing status, share actions, proof rules, and live countdown;
- if the claim becomes live, primary CTA changes to `Join live`.

### Past supported

Purpose: close the loop after the event.

Show claims where:

- supporter pledged;
- claim is `under_review`, `verified`, `not_proven`, `cancelled`, or `disputed`.

Card content:

- final or current status;
- result summary if published;
- pledge outcome:
  - paid to claimer;
  - supporter receives share of locked amount;
  - cancelled/refunded;
  - disputed/review pending;
- replay/evidence availability;
- CTAs: `View outcome`, `View evidence`, `Watch replay` when available.

Selecting `View outcome` opens:

- `/claims/:slug/result`;
- shows final decision, proof timeline, evidence highlights, pledge/locked amount outcome, and replay if available.

If status is `under_review`:

- show review progress;
- show submitted evidence timeline;
- explain that final payout/refund decision is pending.

### Discover more

Purpose: provide a growth loop and ongoing browsing.

Show claims the supporter could back.

MVP matching can be simple:

- live or scheduled claims;
- claims with high backing velocity;
- claims shared by people the supporter backed before;
- claims by creators the supporter follows later;
- location/category/platform filters later.

Card content:

- claim title;
- claimer name;
- proof type;
- pledge goal/progress;
- scheduled time/deadline;
- social proof: supporters count;
- CTAs: `View`, `Support`, `Share`.

Selecting a discover card opens:

- `/claims/:slug`;
- claim page should explain:
  - why this is claimable;
  - how proof works;
  - what supporters can do;
  - what happens to pledged/locked amounts.

## Destination pages

### Supporter claim page

This is the main pre-live decision page.

Sections:

1. Claim statement and claimer identity.
2. Pledge progress and threshold.
3. Proof checklist.
4. Live schedule/deadline.
5. Supporter pledge module.
6. Share/invite friends.
7. Recent supporter activity.

Primary CTA logic:

- unauthenticated: `Sign in to support`;
- not pledged: `Support this claim`;
- pledged and not live: `View live room details`;
- live: `Join live`;
- under review/final: `View outcome`.

### Supporter invite page

This page should feel personalized.

Content:

- "X invited you to support this goal";
- claim statement;
- short explanation of Klaimd;
- pledge/locked amount outcome rules;
- proof rules;
- CTAs:
  - `Support this goal`;
  - `View claim`;
  - `Maybe later`.

### Live viewer page

This is the official live room for supporters.

Priorities:

1. Video stays dominant.
2. Chat is visible but minimal.
3. Reactions and prompts are one tap but do not cover the stream.
4. Supporters cannot publish camera/mic.
5. Evidence and timeline updates are available as a compact drawer later.

Default layout:

- video full screen;
- last few chat messages float near the bottom;
- one compact chat input;
- small `Interact` chip reveals reactions and structured prompts;
- controls do not overlap the main subject as much as possible.

### Outcome page

This page explains what happened and what the supporter gets.

Sections:

- result badge: verified, not proven, cancelled, disputed, under review;
- short reviewer/AI-assisted summary;
- evidence timeline;
- replay/clip links when available;
- pledge outcome;
- locked amount distribution, if applicable;
- share result CTA.

## Data needs

Current MVP can use existing tables for a first version:

- `claim_pledges` for supported claims;
- `claim_supporter_inputs` for live chat, reactions, and structured prompts;
- `claims` for status and schedule;
- `claim_proof_events`, `claim_checkins`, and `claim_evidence` for outcomes.

Future tables or fields likely needed:

- supporter invite tracking by email/user id;
- per-user reminder preferences;
- replay/recording metadata;
- notification read state;
- recommendation/matching signals;
- supporter payout/refund state.

## MVP build order

1. Fix live viewer UI so video remains dominant.
2. Add supporter home sections using existing pledge/status data:
   - Live now;
   - Upcoming supported;
   - Past supported;
   - Discover more.
3. Add supporter invitation state once invite records are modeled.
4. Add outcome-page payout/replay details.
5. Add matching and personalization later.

