# Claim Product Brief

## One-Line Concept

Claim is an AI-verified challenge platform where people put money behind personal claims, supporters pledge to watch/back them, and the claimant chooses what happens to their stake if they fail.

Core positioning:

> Put money behind your goal. Prove it with data. Get paid by supporters. Fail, and your stake goes where you committed it would go.

## Product Direction: Claim

Claim should avoid starting as a yes/no betting market. The safer, cleaner starting point is:

> AI-verified commitment challenges with money-backed seriousness and supporter-funded upside.

### Core Mechanic

1. A claimant creates a claim.
2. The claimant stakes money to prove seriousness.
3. Supporters pledge money to back/watch the claim.
4. Evidence is verified through connected data, AI review, and human arbitration.
5. If the claimant succeeds:
   - The claimant gets their stake back.
   - The claimant receives supporter pledges minus platform fee.
   - Supporters receive access, proof, badges, status, NFTs, and community recognition.
6. If the claimant fails:
   - The claimant's stake is routed according to the failure option chosen before launch.
   - Supporters are refunded or can opt to donate their pledge.

### Failure Routing Options

The claimant should choose the failure route before the claim goes live. The choice must be locked and visible on the claim page so supporters know what they are backing.

Recommended launch options:

- **Charity route:** the claimant's stake goes to a pre-approved charity if the claim fails. This is the cleanest public framing and easiest to explain.
- **Supporter rebate route:** the claimant's stake is distributed to supporters if the claim fails. This creates stronger supporter incentive, but it is legally and payments-riskier because supporters may be viewed as receiving upside based on an outcome.
- **Hybrid route:** a fixed percentage goes to charity and a fixed percentage goes to supporters. This balances incentive and mission, but still needs legal/payment review.

Launch recommendation:

- Start with charity route and optional supporter refund/donation.
- Test supporter rebate only in a closed pilot after legal and payment-provider review.
- Do not let supporters take yes/no positions, set odds, trade positions, or receive variable betting-style payouts.

### Why This Is Better Than Betting

This structure avoids users winning cash from other users based on yes/no positions.

It is closer to:

- Kickstarter with proof
- Patreon/Cameo with challenge completion
- Strava challenge plus escrow
- Creator monetization with accountability

It still needs legal review, but it is less legally radioactive than a wagering exchange.

## First Wedge

The current winner is **Claim Ship Week**: AI builders make a public, template-based shipping claim, stake money, and prove completion with repo activity, a live deploy, a demo, and a locked checklist.

### Top Wedge Ranking

Scores are 1-5 and ordered by priority: early adopters first, arbitration second, competitive whitespace third, implementation fourth.

| Rank | Wedge | Early adopters | Arbitration | Whitespace | Implementation | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | AI build-in-public shipping claims | 5 | 4 | 4 | 4 | Best balance of reachable builders, artifact-based proof, and differentiation from streamer dare products. |
| 2 | Streamer streak claims | 4 | 5 | 2 | 5 | Very easy to verify and build, but too close to Fame Game/Dare Drop-style creator challenge products. |
| 3 | Open-source delivery claims | 3 | 5 | 3 | 4 | Excellent proof via GitHub/CI/releases, but overlaps with bounties, GitHub Sponsors, Polar, and Algora. |
| 4 | Creator shipping streaks | 4 | 3 | 3 | 4 | Good creator supply, but broad and likely to become subjective without tight templates. |
| 5 | Creator charity streaks | 3 | 4 | 2 | 4 | Clean trust story, but overlaps with accountability and charity-fundraising products. |

### Market Landscape

Claim is not pure white space. The broad challenge/stake/pledge concept overlaps with several existing products, so the first wedge has to be narrow and differentiated.

| Alternative | What it already does | Threat to Claim | Claim response |
| --- | --- | --- | --- |
| Build-in-public on X/LinkedIn | Free public accountability and distribution. | Builders can post shipping promises without a new product. | Add locked checklist, stake, supporter pledge pool, and verified proof page. |
| Hackathons | Deadlines, community, judging, prizes, and demos. | Already bundle urgency and recognition. | Make Claim creator-owned, always-on, and audience-backed. |
| Product Hunt | Owns launch-day attention. | Builders may care more about traffic than pre-launch accountability. | Own the pre-launch commitment window and produce launch collateral. |
| GitHub Sponsors / Patreon | Ongoing creator or maintainer support. | Supporters can already back builders generally. | Tie support to one specific verified shipping outcome. |
| Polar / Algora / OSS bounties | Sponsor-funded issue completion. | Bounties are often clearer than self-directed claims. | Focus on builder-initiated, stake-backed AI apps/features, not sponsor-assigned issues. |
| Mesi-style escrow promises | Fans fund a creator promise with escrow and dispute windows. | Mechanically similar to pledge-and-proof. | Narrow to AI shipping templates with repo/deploy/demo evidence. |
| Fame Game / Dare Drop / Duelmasters | Streamer dares, fan-funded creator challenges, and streamer outcome markets. | Makes broad creator challenge positioning crowded. | Do not lead with streamer/gaming claims; keep them as later categories. |
| Forfeit / Lockin / Burning | Money-backed personal accountability. | Already own the "put money behind your goal" message. | Add public supporter-funded upside and artifact-based proof. |

The wedge only works if Claim owns a specific ritual:

> Proof-backed AI shipping sprints.

Required differentiation:

- **Locked shipping checklist:** objective acceptance criteria before supporters pledge.
- **Builder stake:** the builder risks their own money.
- **Supporter perks:** early access, source walkthroughs, private demos, templates, launch credit, discounted lifetime deals.
- **Public proof page:** repo, deploy URL, demo, checklist, supporter wall, countdown, and ruling in one shareable place.
- **Outcome verification:** AI prepares evidence; humans decide disputed outcomes.
- **Short ritual:** 7-day or weekend shipping windows create urgency.

Examples:

- "I'm ArunBuilds. I claim I can ship a working Discord moderation bot by Sunday. It must join a server, respond to `/warn` and `/mute`, log actions to a Supabase table, and have a deployed demo. I'm staking $250; failure goes to Girls Who Code."
- "I'm MinaAI. I claim I can build and deploy a customer-support RAG demo in 7 days. It must ingest a PDF knowledge base, answer questions with citations, and include a public Loom walkthrough. I'm staking $300; failure goes to charity."
- "I'm DevNori. I claim I can ship an open-source Cursor starter for AI tool-calling by Friday. It must include setup docs, one working tool, tests, and a deployed example. I'm staking $200; supporters get early access and a private walkthrough."
- "I'm JaxAgents. I claim I can build a browser automation agent that books a mock appointment on a demo site by next Sunday. It must run from a public repo and pass the recorded demo flow. I'm staking $400; failure refunds supporters and sends my stake to charity."
- "I'm TessaBuilds. I claim I can add Stripe checkout to my existing AI notes app by August 1. Success requires a merged PR, production deploy, test purchase in Stripe test mode, changelog, and demo video. I'm staking $250; failure goes to supporters."
- "I'm RueLabs. I claim I can ship a tiny AI app that turns meeting notes into Jira-ready tickets in 72 hours. It must accept pasted notes, produce structured output, and deploy publicly. I'm staking $150; failure goes to charity."

### Why Claim Ship Week First

Claim Ship Week is the best starting wedge because it has the cleanest combination of:

- Reachable early adopters: AI builders, Cursor users, indie hackers, hackathon builders, and build-in-public creators already post public shipping promises.
- Cleaner differentiation: it is not a streamer dare app, not betting, not a generic habit-staking tool, and not an OSS bounty marketplace.
- Strong proof surface: repo, deploy URL, demo video, checklist, README, smoke test, and public timestamped updates.
- Stronger supporter reason to pledge: supporters get early access, templates, private demos, source walkthroughs, launch credit, or a discounted lifetime deal.
- Implementation fit: a small AI-assisted team can build claim pages, pledge flow, evidence upload, AI evidence summaries, and manual review.
- Distribution fit: successful claims naturally produce X/LinkedIn/Indie Hackers/Product Hunt launch content.

Avoid initially:

- Dangerous stunts
- Public embarrassment dares
- Alcohol/sexual/illegal challenges
- Medical claims
- Weight-loss claims, until privacy and safety policies are mature
- Challenges involving minors
- Highly subjective judging

## Live Component

Public demo moments should be part of the first wedge because they create urgency and shareable outcomes.

Recommended format:

> Time-bounded shipping claim with a locked checklist, public progress updates, and a final demo.

Example:

- Claim: "I'm ArunBuilds. I claim I can ship a working Discord moderation bot by Sunday. It must join a server, respond to `/warn` and `/mute`, log actions to Supabase, and have a deployed demo. I'm staking $250; failure goes to Girls Who Code."
- Progress: repo link, checklist status, build notes, countdown, and supporter wall.
- Demo moment: final Loom or livestream walkthrough showing the locked checklist working.
- Verification: repo activity, deploy URL, demo video, checklist evidence, smoke test, and human review.

This gives the product urgency while avoiding vague "I will launch something" claims.

## Supporter Incentives

Supporters need reasons to join even if they cannot win money.

Possible incentives:

- Refund guarantee if the claimant fails.
- Early supporter badge.
- Limited proof-of-support NFT.
- Access to updates, livestreams, and final proof.
- Supporter leaderboard.
- Creator shoutouts.
- Referral rewards.
- Private community/chat.
- "I backed this before it happened" status.
- Unlockable perks if the claim succeeds.
- Charity impact if the claim fails.
- Optional supporter rebate if the claimant chose that failure route and the model has been approved for the launch jurisdiction.

### NFT Angle

NFTs can work as proof-of-support collectibles, not investment products.

Good framing:

- "This NFT proves you backed the challenge before it happened."
- It unlocks access, proof, badges, community status, and creator perks.

Avoid:

- Promising resale value.
- Marketing NFTs as investments.
- Tying NFT value directly to financial upside.

## Platform Revenue

Initial revenue model:

- 5-10% fee on successful supporter pledge payouts.
- Optional verification fee for premium claims.
- Optional creator tools subscription later.
- Optional brand-sponsored challenges later.

Recommendation:

- Do not take a large fee from failed charity stakes in the first version.
- If a fee is needed on failed claims, make it small and transparent.
- Treat supporter rebate routing as a separate, higher-risk revenue/payment model rather than the default.

## Verification System

Verification should combine data integrations, AI review, and human arbitration.

### Claim Ship Verification

Inputs:

- public or reviewer-accessible GitHub repo
- commit and PR activity during the claim window
- deployed URL
- demo video or livestream recording
- locked feature checklist
- smoke test or scripted acceptance flow, where practical
- README/setup notes
- changelog or release notes
- creator-submitted evidence package
- moderator/referee notes

Checks:

- Repo/deploy/demo evidence was created or updated during the claim window.
- Deployed URL is live at review time.
- Demo shows the locked checklist working without claimant handholding.
- README documents setup, known limitations, and any external dependencies.
- Prebuilt starter kits, copied templates, and prior work were disclosed before launch.
- Hardcoded mock flows do not count unless explicitly allowed by the claim template.
- Scope changes after launch are not accepted unless the claim is cancelled and restarted.
- Dispute packet is clear enough for human review.

### AI Role

AI should assist with:

- Reading claim terms.
- Checking submitted evidence against rules.
- Flagging suspicious activity.
- Summarizing proof for supporters.
- Preparing arbitration packets.
- Explaining success/failure decisions.

AI should not be the only final judge for disputed claims.

## Trust And Safety

Claim needs strict controls from day one.

Initial rules:

- 18+ only.
- No dangerous physical stunts.
- No illegal acts.
- No harassment, humiliation, threats, or coercion.
- No sexual content.
- No minors.
- No medical/self-harm claims.
- No claims requiring trespass or public disruption.
- No third-party events outside the claimant's control.

Operational requirements:

- Challenge templates.
- Moderation before public listing.
- Abuse reporting.
- Human dispute review.
- Clear refund/stake rules.
- Charity partner controls.
- Payment provider review.
- Tax and payout tracking.

## MVP Scope

### MVP Product

Claim Ship web app.

Core screens:

- Create claim
- Claim detail page
- Support/pledge page
- Progress timeline
- Evidence upload/sync
- Verification result
- Supporter wall
- Charity page
- Creator profile

### MVP Claim Types

Support only:

- Ship a public AI agent template by date
- Ship a GPT/Claude-powered micro-SaaS demo by date
- Ship a browser automation workflow with repo, deploy, and demo
- Ship an open-source Cursor/AI SDK starter with documented setup
- Ship a specific feature into an existing public app by date

Do not support in MVP:

- User-generated freeform challenge text without review
- Yes/no betting
- Public dare roulette
- Weight loss
- Dangerous live stunts
- Revenue/user-growth claims
- Vague "launch an app" claims without a locked checklist
- Boss-run, speedrun, streamer streak, and creator output claims until Claim Ship proves demand

### MVP Payments

Preferred flow:

- Claimant stake held via payment/escrow partner.
- Supporter pledges authorized or collected depending on payment provider capability.
- Success: payout pledge pool to claimant minus platform fee, return stake.
- Failure: route claimant stake according to the claim's locked failure option; supporter pledge refunded or optionally donated unless the supporter-rebate model has been approved.

## Initial User Acquisition

The first goal is not broad awareness. The first goal is to recruit enough credible challengers and supporters to prove a repeatable loop:

> builder creates claim -> supporters pledge -> builder ships/proves -> result page becomes social proof -> supporters and viewers become the next builders/supporters.

### Primary ICP

Focus on AI-native micro-builders with a small but real public audience.

Best-fit challenger profile:

- Builds in public on X, LinkedIn, YouTube, TikTok, Indie Hackers, or Discord.
- Uses Cursor, Claude Code, Replit, Lovable, Bolt, v0, Vercel, Supabase, or similar tools.
- Has roughly 500-25,000 followers or an active niche Discord/community.
- Posts demos, launch threads, "building this weekend" updates, or short coding videos.
- Can ship small artifacts in 3-14 days.
- Wants distribution, accountability, early users, and a stronger launch story.
- Is comfortable staking $100-$300 publicly.

Avoid initially:

- no-audience builders;
- private enterprise builders;
- founders making revenue/user-growth claims;
- large, complex app launches;
- people who want Claim to arbitrate product quality or market success.

### Where To Find Challengers

Start with direct, manual sourcing.

High-priority channels:

- X searches: `built with Cursor`, `v0 shipped`, `built with Lovable`, `AI agent demo`, `weekend build`, `build in public`, `shipping this week`, `Cursor app`, `Claude Code`.
- X communities and lists around AI builders, indie hackers, Vercel, Cursor, Replit, Lovable, and micro-SaaS.
- Indie Hackers product logs and "building in public" posts.
- Product Hunt upcoming launches and maker profiles.
- GitHub repos recently created around AI agents, browser automation, RAG demos, Cursor starters, or AI SDK templates.
- Discords: Cursor community, Vercel/Next.js builders, Supabase, Replit, Indie Hackers, AI Tinkerers, hackathon groups, local AI builder groups.
- Hackathon participant lists from AI hackathons, Vercel/AI SDK events, Cerebral Valley events, HF/Replicate/Convex/Supabase events.
- YouTube/TikTok creators posting "I built X with AI" content.

Manual sourcing target:

- Build a list of 200 prospects.
- Personally contact 50.
- Get 15 calls or serious DMs.
- Launch 5-10 claims.

### Outreach Message

The message should not sound like a platform pitch. It should feel like an offer to create a launch event around something they already want to build.

Short DM:

> Saw your `[AI app/demo/tool]` posts. We're testing Claim Ship Week: builders stake $100-$300 that they'll ship a specific AI app/feature in 7 days, supporters back the sprint for early access/perks, and the final proof page shows repo, deploy, demo, and checklist. If you fail, your stake goes to a charity you pick. Want us to set up a free concierge claim page for your next build?

More specific DM:

> You'd be a strong fit for a pilot we're running. Pick one small AI build you can ship in 7 days: agent template, RAG demo, browser automation workflow, Cursor starter, or one feature in your app. We'll create the claim page, supporter wall, checklist, pledge/precommit flow, and final proof page. You bring the audience and the build. If it works, it becomes launch content for you.

Follow-up:

> The key difference from a normal build-in-public post is receipts: locked checklist, stake, supporter wall, final proof page, and a public outcome. Low cap for the pilot; we're optimizing for trust, not volume.

### Supporter Acquisition

Supporters should mostly come from each challenger. Claim's job is to make their audience convert.

Supporter ICP:

- Already follows the builder.
- Wants early access to the app/template/source walkthrough.
- Likes being publicly credited as an early backer.
- Is a builder who may want to run their own claim later.
- Is in a Discord/community where the artifact is useful.

Supporter CTA examples:

- "Back this sprint for $10 and get early access to the repo walkthrough."
- "Pledge $20 to join the private demo and get your name on the launch page."
- "Back the claim to receive the starter template if it ships."
- "If I fail, you can get refunded or donate your pledge; my stake goes to charity."

Supporter perks to test:

- early access;
- source-code walkthrough;
- private demo;
- office-hours invite;
- supporter wall credit;
- launch-page credit;
- discounted lifetime deal;
- template/prompt pack;
- "backed before launch" badge.

### Keeping Prospects Warm

Before they launch a claim:

- Send 3-5 example claim pages tailored to their niche.
- Offer to help scope the claim into a 7-day checklist.
- Give them suggested pledge perks and launch copy.
- Keep a visible "next cohort" date so there is urgency.

During the claim:

- Post daily progress prompts they can reuse.
- Maintain the claim page with checklist updates.
- Highlight backers and new pledges.
- Prepare shareable milestone cards at 25%, 50%, 75%, and final demo.
- Encourage supporters to ask questions or vote on small non-critical product choices.

After the claim:

- Publish a proof receipt page.
- Send the builder a launch thread and recap assets.
- Send supporters a completion email with perks.
- Invite supporters to create their own claim.
- Invite the builder to run a second claim within 30 days.

### Referral And Flywheel Loops

Out-of-the-box acquisition should reward both sides, but avoid anything that looks like a multi-level marketing scheme or wagering incentive.

Safer referral loops:

- **Builder referral credit:** a builder who refers another builder gets reduced platform fees on their next successful claim.
- **Supporter-to-builder credit:** a supporter who launches their own claim gets their first platform fee waived.
- **Supporter referral badge:** supporters get visible credit for bringing other supporters to the same claim.
- **Launch guilds:** groups of 5-10 builders launch in the same Ship Week cohort and cross-promote each other.
- **Community pot:** if a cohort collectively ships 80%+ of claims, Claim funds a small public prize/perk pool from platform marketing budget, not user losses.
- **Creator affiliate:** a builder can earn a capped referral fee from Claim's platform fee for directly referred successful claims.
- **Proof leaderboard:** rank builders by shipped claims, repeat claims, supporter satisfaction, and dispute-free outcomes, not by money won.

Avoid:

- multi-level referral payouts;
- rewards based on supporter losses;
- referral trees;
- pressure to recruit as a condition of payout;
- anything that pays people for bringing wagering volume.

### Getting To Flywheel

Claim has a flywheel only when supporters become challengers and challengers bring supporters.

Minimum flywheel threshold:

- 10 successful claims in one cohort;
- 100+ unique supporters;
- 20%+ of supporters click "create my own claim";
- 5+ supporters apply to become challengers;
- 3+ builders run a second claim;
- 30%+ of new supporters come from supporter referrals or cross-promotion, not founder outreach.

If the flywheel does not start, narrow further rather than broadening. The likely next narrower wedge is:

> AI agent/template builders who can offer supporters the shipped artifact itself.

## Starter Execution Plan

### Phase 1: No-Code Validation

Goal: prove people want to create and back claims.

Actions:

- Landing page with Claim positioning.
- Waitlist segmented by claimant/supporter.
- Manual applications for first 20 AI builders.
- Concierge verification using repo, deploy URL, demo video, checklist, and manual review.
- No automated payouts at first if legal/payment rails are not ready.

Success metrics:

- 100+ waitlist signups from target communities.
- 20 serious AI builder applications.
- 5-10 builders willing to stake real money.
- 100+ supporters willing to pledge or precommit.

### Phase 2: Closed Pilot

Goal: prove end-to-end challenge lifecycle.

Actions:

- Run 5-10 verified AI shipping claims.
- Use strict templates.
- Use one or two approved charities.
- Cap stakes and pledges.
- Web-only, no app store.
- Manual human review for all claims.

Success metrics:

- 70%+ claims reach completion/failure decision without dispute.
- 20%+ supporter-to-claim share/referral rate.
- 30%+ supporters return to back another claim.
- At least a few claim pages convert cold visitors.

### Phase 3: Productized MVP

Goal: automate the repeatable parts.

Build:

- Account creation
- Claim templates
- Pledge checkout
- Evidence package upload
- Evidence timeline
- AI verification assistant
- Human review queue
- Shareable claim pages
- Supporter badges/NFT prototype

### Phase 4: Expansion

Potential new categories:

- OSS delivery claims
- Build-in-public shipping claims beyond AI apps
- Streamer streak claims
- Gamer proof runs: boss fights, speedruns, ranked climbs, no-death/no-hit runs
- Fitness endurance claims
- Creative output claims
- Reading/learning challenges
- Brand-sponsored challenges

Only expand after Claim Ship has proven verification, payments, moderation, and retention.

## Open Questions

- Which payment/escrow partner will support this model?
- Should supporters pay immediately or authorize payment until success?
- Are supporter NFTs free proof collectibles, paid add-ons, or minted only on success?
- Which charities are supported at launch?
- What states/countries should be excluded initially?
- How should disputes be handled if repo, deploy, demo, or checklist evidence is ambiguous?
- Should claims be public by default or invite-only for early pilots?
- What is the minimum claimant stake that signals seriousness without blocking adoption?

## Recommended Starting Position

Start with:

> Claim Ship: stake a specific AI shipping sprint, prove it with repo, deploy, demo, and checklist evidence, get paid by supporters if you succeed, and pre-commit where your stake goes if you fail.

Do not start with:

- Open yes/no betting
- Public dare chaos
- App-store-first launch
- Broad user-generated challenge categories

The wedge should be narrow, credible, and safe enough to earn trust. Virality can come from public progress, live finale moments, supporter badges, creator narratives, charity-backed stakes, and later, carefully reviewed supporter-rebate claims.

