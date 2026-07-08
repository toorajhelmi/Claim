# MVP Live Proof Flows

Claim should be designed around aggressive, high-tension use cases first. These are not necessarily the only launch categories or a promise that every example should be approved. They are technical stress tests: if Claim can support these, it can support softer live claims later.

The MVP should prove that Claim can handle:

- claim creation;
- teaser/preview generation;
- social distribution;
- supporter pledges;
- pledge thresholds;
- recorder/witness invitations;
- live multi-person recording;
- supporter interaction;
- timestamped proof events;
- evidence review;
- final result publishing.

## Core MVP stress-test cases

### 1. Live chat city walk

Example claim:

> I will cross the city by sunset using only live chat directions, with timestamped location check-ins on stream.

This tests moving live proof, audience control, deadline pressure, and location-based evidence.

#### End-to-end flow

1. Challenger creates the claim.
2. Challenger defines:
   - start area;
   - destination or destination-selection rule;
   - sunset deadline;
   - check-in interval;
   - allowed transport modes;
   - proof checklist;
   - minimum pledge threshold;
   - recorder/witness payout split, if any.
3. Claim generates a preview page and teaser asset.
4. Challenger shares the teaser to social platforms, group chats, and direct connections.
5. Connections land on the Claim preview page.
6. Supporters pledge, follow, and optionally opt in for live reminders.
7. Once the pledge threshold is met, the claim becomes scheduled.
8. Challenger invites one or more recorders/witnesses.
9. Recorders accept:
   - their role;
   - their expected recording responsibility;
   - their fixed payout share or reward, if any.
10. On claim day, the Claim live room opens.
11. Challenger starts the primary live stream from mobile.
12. Recorder/witness joins with a second mobile stream when needed.
13. Claim generates a live proof code and logs the start time.
14. Supporters watch and provide directions through chat, votes, or structured prompts.
15. Claim logs:
   - chat-selected directions;
   - route decisions;
   - timestamped check-ins;
   - location proofs;
   - recorder/witness confirmations;
   - stream reconnects or interruptions.
16. Challenger either reaches the destination before sunset or fails.
17. Claim creates an evidence package.
18. Reviewer verifies against the locked proof rules.
19. Final result page is published.
20. If verified, payout logic can route the pledge pool according to the locked split.

#### Required product primitives

- Claim preview page.
- Shareable teaser asset.
- Pledge threshold.
- Live room scheduling.
- Mobile live stream.
- Optional recorder/witness stream.
- Supporter chat/direction input.
- Timestamped check-in events.
- Location/checkpoint proof.
- Evidence timeline.
- Result page.
- Payout split fields for challenger and recorder/witness roles.

#### Proof events to capture

- Claim rules locked.
- Pledge threshold reached.
- Recorder/witness accepted.
- Live room opened.
- Proof code shown on stream.
- Start point confirmed.
- Supporter direction selected.
- Checkpoint reached.
- Deadline reached.
- Final destination reached or missed.
- Reviewer decision published.

## 2. Public confrontation / public statement moment

Example claim:

> I will ask/say a pre-declared thing at a public moment and stream the attempt.

Examples:

- I will ask this exact question during a public Q&A.
- I will say this exact sentence during my scheduled talk.
- I will read this 30-second statement during a public comment period.

This tests high social tension, exact wording proof, recorder roles, scheduled live windows, audio/video evidence, and final verification.

#### End-to-end flow

1. Challenger creates the claim.
2. Challenger defines:
   - exact question or statement;
   - event name/context;
   - scheduled time window;
   - proof checklist;
   - minimum pledge threshold;
   - whether a recorder/witness is required;
   - recorder payout split, if any.
3. Claim generates a preview page and teaser asset.
4. Challenger shares the claim to social platforms and direct connections.
5. Supporters pledge and follow the claim.
6. Once the pledge threshold is met, the claim becomes scheduled.
7. Challenger invites recorder(s)/witness(es), if needed.
8. Recorders accept their role and payout split.
9. On event day, the Claim live room opens.
10. Challenger and/or recorder starts live video.
11. Claim logs a live proof code and scheduled opportunity window.
12. Supporters watch the attempt.
13. The public moment happens or does not happen.
14. Claim captures timestamped audio/video and recorder notes.
15. Reviewer checks whether the exact declared question/statement was delivered in the required context.
16. Final result page is published with clips, transcript, timestamps, and explanation.
17. If verified, payout logic can route the pledge pool according to the locked split.

#### Required product primitives

- Exact wording field.
- Event/context field.
- Scheduled live window.
- Claim preview page.
- Shareable teaser asset.
- Pledge threshold.
- Recorder/witness invite and acceptance.
- Live stream from challenger or recorder.
- Timestamped clip capture.
- Transcript or reviewer notes.
- Evidence timeline.
- Result page.
- Payout split fields for challenger and recorder/witness roles.

#### Proof events to capture

- Claim wording locked.
- Event/context locked.
- Pledge threshold reached.
- Recorder/witness accepted.
- Live room opened.
- Proof code shown on stream.
- Opportunity window started.
- Statement/question attempted.
- Clip timestamp saved.
- Transcript or reviewer note added.
- Reviewer decision published.

## Shared lifecycle

All MVP claims should move through these statuses:

1. `draft`
2. `preview`
3. `open_for_backing`
4. `threshold_met`
5. `scheduled`
6. `live`
7. `under_review`
8. `verified`
9. `not_proven`
10. `cancelled`
11. `disputed`

## Claim preview and social distribution

The preview page is a core part of the MVP, not a marketing afterthought.

Every claim should generate:

- public claim URL;
- teaser title;
- teaser description;
- vertical preview asset;
- Open Graph preview image/video;
- copyable launch text;
- share buttons for major social and messaging channels;
- pledge CTA;
- reminder CTA;
- supporter count;
- pledge pool;
- proof checklist;
- launch/live time;
- threshold progress.

The challenger should use this page to invite existing connections before the claim goes live.

## Recorder and witness mechanics

Recorders/witnesses are first-class participants, not informal helpers.

MVP should support:

- invite recorder/witness by link;
- role acceptance;
- role description;
- optional payout/reward share;
- live room access;
- ability to stream from phone;
- ability to add notes;
- timestamped confirmation events.

Initial roles:

- `challenger`
- `recorder`
- `witness`
- `supporter`
- `moderator`
- `reviewer`

## Live room requirements

Detailed implementation design: [`live-room-design.md`](./live-room-design.md).

The MVP live room should support:

- one challenger camera;
- one optional recorder/witness camera;
- supporter chat or structured inputs;
- claim countdown;
- proof checklist;
- pledge pool display;
- threshold and status display;
- proof code display;
- timestamped check-ins;
- recording/evidence capture;
- reconnect handling;
- final evidence package generation.

## Why these cases matter

Cooking, art, and desk-based claims may still be valid later, but they do not stress the platform enough.

The MVP should be built to support live, tense, socially risky, audience-backed moments. If Claim can support live city missions and public statement moments, it can support easier claim formats afterward.

