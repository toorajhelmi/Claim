# Claim

Claim is a platform for making claims, backing them, and proving whether they happened.

Core loop:

1. A challenger makes a public claim.
2. The challenger puts a stake behind it.
3. Supporters pledge to back/watch the claim and receive access, status, or perks.
4. The claim is verified with evidence.
5. If the challenger proves the claim, they earn the supporter pledge pool minus platform fee.
6. If the challenger fails, supporter pledges are refunded or donated according to locked claim rules, and the challenger's stake goes where they committed.

## Starting wedge

Start with **creator-led public claims**: time-bound, interesting, livestreamable or documentable claims with clear proof conditions.

This can include challenges around skills, creation, building, performance, endurance, experiments, or audience-driven goals. Claim should not be publicly positioned as "positive challenges" or "AI shipping." The broad public promise is simpler:

> Say it. Stake it. Prove it.

Claim should be commitment and verification infrastructure, not a betting market:

- No yes/no positions.
- No odds.
- No trading.
- No variable betting-style payouts.
- No supporter financial upside by default.
- Creator monetary upside comes from earning supporter pledges after proving the claim.
- Initial failure route should favor supporter refund/donation plus a locked claimant stake route.

## Repository structure

```text
apps/
  web/
    src/
      App.tsx
      main.tsx
      styles.css
docs/
  current-direction.md
  mvp-live-proof-flows.md
  product-brief.md
  mvp-scope.md
  verification.md
  trust-and-safety.md
  go-to-market.md
  open-questions.md
```

## Current priority

The next product step is no-code or concierge validation:

1. Landing page and waitlist.
2. Creator outreach with a monetary-upside pitch.
3. Concierge claim pages for the first few creators.
4. Manual pledge/precommit collection.
5. Manual evidence review and final result pages.
6. No automated payouts until legal and payment-provider review is complete.

Read `docs/current-direction.md` and `docs/mvp-live-proof-flows.md` before making product or implementation decisions.

## Local development

This repo is structured as a future monorepo. The first app lives at `apps/web`.

```bash
npm install
npm run dev
npm run build
```
