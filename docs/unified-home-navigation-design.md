# Unified Home and Navigation Design

This document defines the recommended logged-in navigation model for Klaimd across claimers, recorders, and supporters.

## Recommendation

Treat every account as the same user type by default.

Do not build separate "claimer home", "recorder home", and "supporter home" products. A person can create one claim, record another claim, and support several others in the same week. The app should therefore use one navigation structure and one home surface, with role-specific modules shown only when the user has relevant activity.

Recommended principle:

> One user, many roles. Home shows the next most important actions across all roles.

This keeps the product simpler to understand and maintain while matching the real behavior of Klaimd users.

## Why not separate role homes?

Separate role homes sound organized, but they create problems:

- A user may be a claimer and supporter at the same time.
- A recorder may also back the claim they are recording.
- Users would have to understand which "mode" they are in before acting.
- Navigation logic and data loading would duplicate across role-specific pages.
- Role identity on Klaimd is contextual to a claim, not a permanent account type.

Klaimd should still respect role permissions inside each claim and live room, but the global app shell should not force the user to choose a role.

## Product posture

Klaimd is more action-oriented than a passive content feed.

Instagram-style tabs are useful because they make navigation predictable, but Klaimd should not make browsing the only center of gravity. The home page should remain an action hub:

- start or resume your own claim;
- join a live claim you support or record;
- respond to recorder/supporter invitations;
- review claims you backed;
- discover new claims when there is no urgent action.

The right model is a tabbed app shell with an action-first home.

## Primary navigation

Use the same bottom/mobile tab structure for all authenticated users.

### 1. Home

Purpose: unified activity hub and next-best-action surface.

Home is the main page after login. It combines supporter-style activity with "My claims" and "Recording" modules when relevant.

Primary sections, in priority order:

1. **Live now**
2. **Needs your action**
3. **My claims**
4. **Recording assignments**
5. **Upcoming supported**
6. **Invited to support**
7. **Past activity**
8. **Discover more**

Sections with no relevant data should be hidden, not shown as empty panels, except for one soft empty state that helps the user understand what to do next.

### 2. Discover

Purpose: browse claims the user could support.

This is the dedicated exploration surface. Home can show a small "Discover more" preview, but Discover is where category filters, live/scheduled tabs, ranking, and matching can grow later.

MVP discovery can be simple:

- live claims;
- scheduled claims;
- high-velocity claims;
- recently activated claims;
- claims shared publicly.

### 3. Create

Purpose: start a new claim.

This should be a primary tab or prominent center action because claim creation is a core supply-side action.

On mobile, this can be a center tab/action button. On desktop, it can be a persistent `New claim` action in the app menu plus a Create tab if the layout supports it.

Create opens:

- `/claims/new`;
- if unauthenticated, sign in/sign up first;
- after completion, the user lands on the draft review/activation flow.

### 4. Activity

Purpose: notifications and historical actions.

Activity collects:

- claim invite received;
- recorder invite received;
- pledge/support receipt;
- claim went live;
- event ended;
- result published;
- evidence/replay available;
- recorder accepted/declined;
- payment/activation notices.

In the MVP, Activity can be a simple list backed by existing claim status and timestamp data. Later it should become an event/notification feed.

### 5. Profile / Menu

Purpose: account, settings, public profile, and admin-style actions.

Contains:

- profile and handle;
- contact email;
- payout/payment settings later;
- claims created by the user;
- supported claims archive;
- recorder history;
- sign out;
- admin/reviewer links if applicable.

The existing hamburger menu can remain for secondary links, but the main authenticated navigation should not rely only on a hamburger because key actions should be one tap.

## Home page design

Home should feel like a live operations board, not a static dashboard.

### Header

Keep compact.

Suggested content:

- greeting or account identity;
- one primary CTA: `Create claim`;
- small menu/profile control;
- optional "live now" count if any urgent live events exist.

Avoid a large persistent top header that consumes screen space during scrolling.

### Section: Live now

Show any claim currently live where the user has a relationship:

- user is the claimer;
- user is an accepted recorder;
- user pledged;
- user was invited to support.

Card content:

- claim title;
- role pill: `Your claim`, `Recording`, `Supported`, or `Invited`;
- live badge;
- claimer name;
- active viewers/chat count later;
- primary CTA depends on role:
  - claimer: `Open live room`;
  - recorder: `Join as recorder`;
  - supporter: `Watch live`.

Selecting the card opens:

- `/claims/:code/live`;
- live room derives role server-side and grants correct permissions.

### Section: Needs your action

This is the most important action-oriented section.

Show:

- draft claims needing activation;
- active claims needing recorder setup;
- claims ready to start official live event;
- ended claims needing review/reopen/finalization;
- recorder invites pending acceptance;
- supporter invites not yet acted on;
- payment/activation issues.

Card content:

- action label;
- claim title;
- why action is needed;
- deadline/status;
- CTA.

Examples:

- `Activate draft` -> claim draft review page.
- `Review recorder setup` -> activation flow.
- `Start official event` -> live room page.
- `Accept recorder role` -> recorder invite page.
- `Support invited claim` -> claim backing tab.

### Section: My claims

Keep this because Klaimd is action-oriented and creators need quick access to their own claims.

Show claims where `creator_id` is the current user.

Group by action status:

1. Draft / setup
2. Open for backing
3. Scheduled / live
4. Under review / final

Card content:

- claim title;
- status;
- pledge progress;
- live date/deadline;
- primary next action:
  - `Continue setup`;
  - `Share`;
  - `Open live room`;
  - `View result`.

Selecting a claim opens the current claim detail experience:

- `/claims/:code`;
- the claim page remains tabbed:
  - Overview;
  - Backing;
  - Proof;
  - Live.

For claim owners, the claim page can show owner-only controls inside the relevant tab instead of sending the user to a separate "claimer dashboard".

### Section: Recording assignments

Show claims where the user is an accepted recorder or has a pending recorder invite.

Card content:

- claim title;
- claimer name;
- recorder responsibility;
- payout share, if any;
- schedule/status;
- CTA:
  - pending: `Accept recorder role`;
  - scheduled: `Open live room`;
  - live: `Join live`;
  - ended: `View evidence/result`.

Selecting opens:

- pending invite -> recorder invite page;
- accepted assignment -> `/claims/:code/live` or `/claims/:code?tab=proof` depending on status.

### Section: Upcoming supported

Use the supporter home model from `docs/supporter-experience-design.md`.

Show claims where the user pledged or otherwise follows/supports the claim and the claim is not live yet.

CTA:

- `View claim`;
- `Share`;
- `Join live` when status changes to live.

### Section: Invited to support

Show claims where the user received a supporter invite and has not pledged yet.

CTA:

- `View invitation`;
- `Support`;
- `Not interested`.

In the MVP, if there is no dedicated invitation page yet, `Support` can open `/claims/:code?tab=backing`.

### Section: Past activity

Combine past supported, past recorded, and own completed claims.

Card content:

- claim title;
- user relationship: `Your claim`, `Supported`, `Recorded`;
- final/current status;
- outcome summary;
- CTA:
  - `View outcome`;
  - `View evidence`;
  - `Watch replay` later.

Selecting opens:

- `/claims/:code/result`.

### Section: Discover more

Show a small set of supportable claims. This should not crowd out urgent personal actions.

If a user has no existing activity, Discover more can become the main content after the Create CTA.

## Claim detail page relationship to Home

Home should not replace the claim detail page.

Home answers:

> What should I do next across all claims?

Claim detail answers:

> What is happening with this one claim?

The current tabbed claim page is the right destination after selecting a claim from Home.

Recommended claim detail tabs:

- **Overview**: claim statement, share URL, snapshot.
- **Backing**: pledge progress, supporter invite/pledge actions.
- **Proof**: locked proof checklist, evidence timeline, recorder/evidence context.
- **Live**: live room, event lifecycle, result link.

Owner/recorder/supporter controls should appear contextually inside those tabs.

Examples:

- Claimer opens their own draft -> Overview or setup/activation mode.
- Supporter opens backed scheduled claim -> Backing tab with status and live countdown.
- Recorder opens assignment -> Live tab if live/scheduled, Proof tab if evidence review is needed.

## Role model

The account has no permanent role.

Roles are claim-specific:

- `creator_id === user.id` -> claimer for that claim.
- accepted recorder invite for that claim -> recorder for that claim.
- pledge/support/invite relationship -> supporter for that claim.
- admin/reviewer claims are separate permission layers.

The UI should therefore compute relationship per claim and show appropriate actions.

A single claim card may show multiple relationship pills if true:

- `Your claim`
- `Recording`
- `Supported`

If there is a conflict, prioritize action by urgency:

1. Live room access
2. Required setup/acceptance
3. Upcoming schedule
4. Outcome/review
5. Discovery/support

## Desktop layout

Desktop can use:

- compact top-left brand/menu;
- left or top navigation;
- main Home feed;
- optional right rail for "Create claim", live now, and account/profile shortcuts.

Desktop should still keep the same information architecture as mobile.

## Mobile layout

Mobile should use a bottom tab bar once the user is authenticated.

Recommended tabs:

1. Home
2. Discover
3. Create
4. Activity
5. Profile

Live room remains immersive and hides the normal app navigation while streaming.

## MVP implementation order

### Phase 1: Unified Home without new tables

Use existing data:

- `claims` for user's own claims and discoverable claims;
- `claim_pledges` for supported claims;
- `claim_recorder_invites` for recorder assignments;
- supporter invite data from the current email/invite flow where available;
- `claim_proof_events` for live/result activity.

Build:

1. Unified authenticated Home.
2. Relationship labels on claim cards.
3. Needs-your-action section.
4. My claims section.
5. Recording assignments section.
6. Upcoming/past supported sections.
7. Discover preview.

### Phase 2: Bottom navigation / app shell

Add authenticated bottom/mobile tabs:

- Home;
- Discover;
- Create;
- Activity;
- Profile.

Keep the current compact hamburger for secondary actions.

### Phase 3: Activity feed

Create a proper notification/activity model if existing tables become too awkward.

Potential future table:

- `user_activity_events`
  - `user_id`;
  - `claim_id`;
  - `event_type`;
  - `relationship`;
  - `title`;
  - `body`;
  - `read_at`;
  - `created_at`;
  - `metadata`.

### Phase 4: Personalization

Improve Discover and Home ordering:

- claims shared by people the user supported before;
- categories/platforms;
- live velocity;
- local/scheduled events;
- creator follow graph later.

## Open product decisions

1. Should Create be a full tab or a floating center action on mobile?
2. Should supporter invites have a dedicated page or open the Backing tab directly for MVP?
3. Should recording assignments appear as their own Home section or inside Needs your action until volume grows?
4. Should the Activity tab launch in MVP, or should it initially live under the profile/menu?
5. When a user has no activity, should Home bias toward Create or Discover?

## Current recommendation for the next UI iteration

For the next implementation pass:

1. Keep the current logged-in Home as the base.
2. Rename/shape it into a unified activity hub.
3. Keep "My claims" high on the page for claimers.
4. Add supporter-style rails under it:
   - Live now;
   - Invited to support;
   - Upcoming supported;
   - Past activity;
   - Discover more.
5. Add a recorder assignment rail.
6. Add relationship pills to every claim card.
7. Add mobile bottom navigation after the Home content structure is stable.

This gives all users the same mental model while preserving Klaimd's action-oriented claimer workflow.
