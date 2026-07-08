# Live Room Design

This document is the implementation reference for the Klaimd live room. It expands the high-level MVP flow into the role-specific UX, room lifecycle, chat model, reactions, evidence lane, and implementation phases.

The live room is not just a video call. It is the proof environment where the claimer, approved recorders, supporters, evidence, chat, and final review package come together.

## Goals

- Let the claimer and approved recorders test camera/mic before the event.
- Let the claimer officially start the live event.
- Let claimer and recorders stream independently or together.
- Let supporters watch, chat, react, and participate without streaming.
- Capture enough timestamped evidence for AI-assisted and human review.
- Keep role access automatic from login/invite state. No manual role/name picker in the room.

## Roles

### Claimer

The creator/challenger who owns the claim.

Can:

- start a private test run;
- start the official event;
- start/stop their own stream;
- watch recorder streams;
- use the private backstage chat with recorders;
- read supporter chat;
- optionally respond in supporter chat;
- add evidence links/uploads/checkpoints;
- end the event.

### Recorder

An approved person invited by the claimer to help capture proof.

Can:

- join private test run;
- start/stop their own stream when permitted;
- watch claimer and other recorder streams;
- use private backstage chat with claimer/recorders;
- read supporter chat;
- add recorder evidence, notes, photos, clips, links, and checkpoint confirmations.

### Supporter

A viewer/backer of the claim.

Can:

- watch the live stream;
- switch between active feeds when multiple streams exist;
- chat in supporter chat;
- send reactions;
- submit structured inputs when the claim allows it;
- follow evidence timeline updates.

Cannot:

- publish camera/mic;
- access backstage chat;
- alter locked proof rules;
- start/end the official event.

### Reviewer / Admin

Not part of the live room MVP surface initially, but the room must capture a usable evidence package for later review.

## Room lifecycle

### 1. Room shell created

Created when a claim is activated or scheduled.

Initial state:

- claim status: `open_for_backing`, `threshold_met`, or `scheduled`;
- room mode: `setup`;
- official event not started;
- supporters can see the claim page but not a live stream;
- claimer and approved recorders can access setup/test surfaces.

The live room should show:

- claim statement;
- claim status;
- pledge context;
- scheduled time/deadline;
- role-specific access state;
- test run CTA for claimer/recorders;
- recorder readiness list.

### 2. Private test run

Purpose: let claimer and recorders confirm video/audio without notifying supporters or creating official evidence.

#### Claimer starts test run

Flow:

1. Claimer opens live room.
2. Claimer sees camera/mic preview and recorder readiness.
3. Claimer taps `Start test run`.
4. Room mode becomes `test`.
5. Claimer can start/stop test camera.
6. Approved recorders can join test room.
7. Supporters do not get a live notification and cannot watch.

UI for claimer:

- own camera preview;
- active recorder tiles;
- waiting recorder list;
- backstage chat;
- test room status;
- `End test run`.

#### Recorder joins test run

Flow:

1. Recorder opens claim live room from invite/account.
2. Recorder is recognized by accepted invite email or invite token.
3. Recorder sees `Join test room`.
4. Recorder can preview camera/mic before publishing.
5. Once joined, claimer sees recorder tile.
6. Recorder sees claimer tile and other active recorders.

UI for recorder:

- assigned responsibilities;
- own camera preview;
- claimer tile;
- other recorder tiles;
- backstage chat;
- connection status;
- `Leave test`.

#### First user and rejoin behavior

If claimer is first:

- claimer waits in room;
- recorders join as tiles;
- claimer can keep the test room open.

If recorder is first:

- recorder can enter a waiting/test lobby if a test run is open;
- if no test run is open, show `Waiting for claimer to start test`;
- recorder can still check camera/mic locally without joining LiveKit.

If claimer leaves:

- existing recorder test streams may remain temporarily;
- room shows `Claimer away`;
- official event cannot start until claimer returns.

If recorder leaves:

- recorder tile becomes offline;
- claimer can continue testing;
- recorder can rejoin.

Test run logs should be lightweight:

- participant joined test;
- participant left test;
- camera/mic tested;
- connection quality warnings.

These should not count as official proof unless explicitly saved as evidence.

### 3. Official event start

Only the claimer can start the official event.

Pre-start UI:

- `Start official event`;
- warning that supporters will be able to watch;
- proof checklist;
- recorder readiness list;
- required setup warnings;
- live proof code reminder.

When claimer taps `Start official event`:

1. room mode becomes `official`;
2. claim status becomes `live`;
3. official event start timestamp is logged;
4. supporter view opens live player/chat;
5. claimer and approved recorders can publish streams;
6. evidence timeline begins official logging.

Important: starting the official event opens the room, but does not automatically publish every participant's camera.

### 4. Official live streaming

#### Claimer starts first

Flow:

1. Official event starts.
2. Claimer taps `Start stream`.
3. Claimer camera becomes primary feed.
4. Supporters see claimer feed.
5. Recorders can watch claimer and start their own streams.
6. Evidence logs:
   - event started;
   - claimer stream started;
   - proof code shown, if captured.

#### Recorder starts first

This must be allowed after official event start. Some claims rely on recorder footage more than claimer selfie footage.

Flow:

1. Claimer starts official event.
2. Recorder starts stream before claimer.
3. Recorder feed becomes active/primary until claimer starts or claimer manually selects primary.
4. Supporters can watch recorder feed.
5. UI shows claimer as `not streaming`.

#### Multiple recorders stream

When multiple streams are active:

- primary feed is large;
- secondary feeds appear as tiles;
- viewers can switch feed;
- claimer/recorders can watch each other;
- the room can auto-highlight active speaker later, but manual selection is enough for MVP.

Feed options:

- `Main`;
- `Claimer`;
- `Recorder 1`;
- `Recorder 2`;
- `Evidence / screen / external`.

#### Disconnect handling

If claimer disconnects:

- room remains live if recorder stream is still active;
- banner: `Claimer disconnected - waiting to reconnect`;
- evidence logs disconnect/reconnect;
- only claimer can end the official event when reconnected, unless admin override exists later.

If recorder disconnects:

- recorder tile shows offline;
- other streams continue;
- recorder can rejoin;
- evidence logs disconnect/reconnect.

If all streamers disconnect:

- supporter player shows waiting state;
- room remains live for a grace period;
- if not resumed, room can move to `interrupted` or claimer can end attempt.

### 5. Event end

Claimer sees:

- `End official event`;
- `Mark attempt complete`;
- `Cancel attempt`.

End flow:

1. Claimer ends event.
2. publishing stops or is blocked;
3. room mode becomes `ended`;
4. claim moves to `under_review`;
5. evidence upload window remains open for approved recorder/claimer;
6. result/review page becomes the next destination.

Recorders may continue uploading evidence after live stop for a limited window.

## Chat model

The live room needs two separate chat lanes.

### Backstage chat: claimer + recorders

Private operational chat for people producing proof.

Visible to:

- claimer;
- accepted recorders;
- later moderators/admins.

Not visible to:

- supporters;
- public claim viewers.

Use cases:

- "Can you hear me?";
- "Switch to your rear camera";
- "Move closer";
- "I lost signal";
- "Show the proof code now";
- "I am uploading the GPS link";
- "Take over as primary feed".

Backstage chat should be available in:

- setup mode;
- test mode;
- official mode;
- short post-event evidence window.

MVP behavior:

- text only;
- participant name/role;
- timestamp;
- persisted as room messages;
- optionally mark messages as review-visible if they explain evidence.

### Supporter chat

Public live chat for supporters/viewers.

Visible to:

- supporters;
- claimer;
- recorders;
- moderators/admins.

Use cases:

- cheering;
- questions;
- live directions or constraints when claim rules allow it;
- reactions to milestones.

MVP behavior:

- text only;
- supporter name;
- timestamp;
- basic rate limit;
- basic moderation/delete/hide later;
- structured input mode for special claims.

### Structured supporter inputs

Some claims need more than free chat.

Examples:

- city walk: select next direction;
- public statement: vote on follow-up question;
- cooking/building: choose constraint or ingredient;
- proof challenge: pick random code/constraint.

Structured inputs should be separate from free chat so they can become proof events.

## Reactions

Supporters can tap reactions during official live mode.

Examples:

- like;
- fire;
- shock;
- verify;
- question;
- milestone.

Behavior:

- reactions float over the live stream;
- claimer/recorders can see them;
- supporters can see aggregate activity;
- high-volume reactions are aggregated, not stored one row per tap forever.

MVP storage:

- short-term realtime broadcast for animation;
- periodic aggregate counts by claim, reaction type, and time bucket;
- selected reaction spikes can become timeline events later.

## Evidence lane

The evidence lane is the proof sidebar/bottom panel connected to the live stream.

### Evidence types

#### Links

- GPT/chat links;
- GPS/activity links;
- public posts;
- receipts;
- Google Docs / PDFs;
- GitHub/repo links;
- maps;
- third-party proof pages;
- livestream replay links.

#### Uploads

- photos;
- screenshots;
- short clips;
- route captures;
- device metadata exports;
- before/after images;
- signed recorder notes.

#### Checkpoints

- live proof code;
- timestamped location;
- supporter-selected constraint;
- opportunity window start/end;
- statement/question attempted;
- clip timestamp;
- deadline reached.

### Evidence metadata

Each evidence item should store:

- claim id;
- room id;
- added by user id;
- source role;
- source display name;
- type;
- title;
- description;
- URL or storage path;
- related proof rule;
- event timestamp;
- visibility: public, supporter-only, reviewer-only;
- AI review status later.

## UI by mode and role

### Setup mode

Claimer:

- claim statement card;
- start test run;
- recorder readiness;
- backstage chat;
- evidence setup checklist.

Recorder:

- claim statement card;
- waiting/test availability;
- camera/mic local preview;
- responsibilities;
- backstage chat.

Supporter:

- claim statement;
- scheduled time/status;
- pledge/share CTA;
- no video player yet.

### Test mode

Claimer:

- start/stop test stream;
- own preview;
- recorder tiles;
- backstage chat;
- end test.

Recorder:

- join/leave test;
- start/stop test stream;
- claimer/recorder tiles;
- backstage chat.

Supporter:

- not admitted.

### Official live mode

Claimer:

- start/stop stream;
- select primary feed;
- backstage chat;
- supporter chat;
- reactions overlay;
- evidence lane;
- end event.

Recorder:

- start/stop stream;
- watch other feeds;
- backstage chat;
- supporter chat read/reply if allowed;
- reactions overlay;
- add evidence.

Supporter:

- watch stream;
- switch feeds;
- supporter chat;
- reactions;
- structured inputs;
- evidence timeline.

### Ended / under review mode

Claimer:

- review evidence package;
- upload missing evidence;
- see review status.

Recorder:

- upload notes/evidence during allowed window;
- see submitted evidence.

Supporter:

- see event ended;
- see public timeline/replay if available;
- wait for result.

## Suggested data model

This is a product design target, not a final migration.

### `claim_live_rooms`

- `id`
- `claim_id`
- `mode`: setup, test, official, ended, interrupted
- `livekit_room_name`
- `official_started_at`
- `official_ended_at`
- `primary_participant_id`
- `created_at`
- `updated_at`

### `claim_live_participants`

- `id`
- `room_id`
- `claim_id`
- `user_id`
- `role`: claimer, recorder, supporter, moderator
- `display_name`
- `invite_id`
- `joined_at`
- `left_at`
- `is_streaming`
- `last_seen_at`

### `claim_live_messages`

- `id`
- `room_id`
- `claim_id`
- `user_id`
- `role`
- `channel`: backstage, supporter
- `message`
- `created_at`
- `is_deleted`

### `claim_live_reactions`

- `id`
- `room_id`
- `claim_id`
- `reaction_type`
- `count`
- `bucket_started_at`

### `claim_evidence`

Existing/future evidence table should support:

- uploads;
- external links;
- text notes;
- stream clips;
- role/source metadata;
- proof rule association;
- visibility level.

## LiveKit implementation notes

Use LiveKit for audio/video rooms.

Room naming:

- `claim-{claim.slug}` or stable `claim-{claim.id}`.

Identity:

- never random-only for product usage;
- use stable user/participant identity:
  - `claimer:{userId}`;
  - `recorder:{inviteId or userId}`;
  - `supporter:{userId}`.

Permissions:

- claimer/recorder can publish;
- supporter subscribes only;
- test mode admits only claimer/recorders;
- official mode admits supporters as viewers.

Token endpoint must:

- verify Supabase session;
- derive role server-side;
- check claim ownership or accepted recorder invite;
- issue publish permissions only for claimer/recorder;
- avoid trusting role sent from frontend.

## Build order

### Phase A: role-safe room entry

- server-side token role derivation;
- no manual role picker;
- viewer-only supporter tokens;
- claimer/recorder publisher tokens.

### Phase B: private test room

- claimer starts test mode;
- recorder joins test;
- camera/mic preview;
- stream tiles;
- backstage chat.

### Phase C: official event lifecycle

- claimer starts official event;
- claim status changes to `live`;
- supporters can watch;
- claimer ends event;
- claim moves to `under_review`.

### Phase D: supporter layer

- supporter chat;
- reactions overlay;
- structured input prompts.

### Phase E: evidence lane

- link evidence;
- upload evidence;
- checkpoint events;
- relation to proof rules.

### Phase F: review package

- assemble timeline;
- include stream metadata;
- include chat/input highlights;
- include evidence uploads/links;
- hand off to AI-assisted review/human review.

## Open questions

- Should recorders be allowed to start official stream before claimer starts official event? Current recommendation: no.
- Should recorder streams continue if claimer disconnects? Current recommendation: yes.
- Can a recorder end the event if claimer disappears? Current recommendation: no for MVP, admin override later.
- Should supporter chat be public after event? Current recommendation: maybe highlights only.
- Should backstage chat be visible to reviewers? Current recommendation: yes, but not to supporters.
- What is the grace period when all streamers disconnect? Suggested: 5-10 minutes.
- How much live video/replay do we store in MVP versus relying on LiveKit egress later?
