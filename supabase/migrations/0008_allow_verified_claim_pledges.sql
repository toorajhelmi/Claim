drop policy if exists "public can submit pledges" on public.claim_pledges;
create policy "public can submit pledges"
on public.claim_pledges for insert
to anon, authenticated
with check (exists (
  select 1 from public.claims
  where claims.id = claim_pledges.claim_id
    and claims.status in ('preview', 'open_for_backing', 'threshold_met', 'scheduled', 'live', 'verified')
));

drop policy if exists "authenticated can read own pledge access" on public.claim_pledges;
create policy "authenticated can read own pledge access"
on public.claim_pledges for select
to authenticated
using (
  supporter_email is not null
  and lower(supporter_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);
