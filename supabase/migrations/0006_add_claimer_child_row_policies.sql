drop policy if exists "claimers can manage own proof rules" on public.claim_proof_rules;
create policy "claimers can manage own proof rules"
on public.claim_proof_rules for all
to authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_proof_rules.claim_id
    and claims.creator_id = auth.uid()
))
with check (exists (
  select 1 from public.claims
  where claims.id = claim_proof_rules.claim_id
    and claims.creator_id = auth.uid()
));

drop policy if exists "claimers can manage own share assets" on public.claim_share_assets;
create policy "claimers can manage own share assets"
on public.claim_share_assets for all
to authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_share_assets.claim_id
    and claims.creator_id = auth.uid()
))
with check (exists (
  select 1 from public.claims
  where claims.id = claim_share_assets.claim_id
    and claims.creator_id = auth.uid()
));
