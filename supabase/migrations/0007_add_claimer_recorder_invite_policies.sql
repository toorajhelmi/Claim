drop policy if exists "claimers can manage own recorder invites" on public.claim_recorder_invites;
create policy "claimers can manage own recorder invites"
on public.claim_recorder_invites for all
to authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_recorder_invites.claim_id
    and claims.creator_id = auth.uid()
))
with check (exists (
  select 1 from public.claims
  where claims.id = claim_recorder_invites.claim_id
    and claims.creator_id = auth.uid()
));
