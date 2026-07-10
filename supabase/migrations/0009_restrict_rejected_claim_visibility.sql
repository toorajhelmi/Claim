drop policy if exists "public can read launched claims" on public.claims;
create policy "public can read launched claims"
on public.claims for select
to anon, authenticated
using (
  status <> 'draft'
  and (
    status <> 'not_proven'
    or creator_id = auth.uid()
  )
);

drop policy if exists "public can read proof rules for launched claims" on public.claim_proof_rules;
create policy "public can read proof rules for launched claims"
on public.claim_proof_rules for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_proof_rules.claim_id
    and claims.status <> 'draft'
    and (
      claims.status <> 'not_proven'
      or claims.creator_id = auth.uid()
    )
));

drop policy if exists "public can read share assets" on public.claim_share_assets;
create policy "public can read share assets"
on public.claim_share_assets for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_share_assets.claim_id
    and claims.status <> 'draft'
    and (
      claims.status <> 'not_proven'
      or claims.creator_id = auth.uid()
    )
));

drop policy if exists "public can read non-sensitive pledge wall" on public.claim_pledges;
create policy "public can read non-sensitive pledge wall"
on public.claim_pledges for select
to anon, authenticated
using (supporter_email is null and exists (
  select 1 from public.claims
  where claims.id = claim_pledges.claim_id
    and claims.status <> 'draft'
    and (
      claims.status <> 'not_proven'
      or claims.creator_id = auth.uid()
    )
));

drop policy if exists "public can read live rooms for launched claims" on public.claim_live_rooms;
create policy "public can read live rooms for launched claims"
on public.claim_live_rooms for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_live_rooms.claim_id
    and claims.status <> 'draft'
    and (
      claims.status <> 'not_proven'
      or claims.creator_id = auth.uid()
    )
));

drop policy if exists "public can read live participants" on public.claim_live_participants;
create policy "public can read live participants"
on public.claim_live_participants for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_live_participants.claim_id
    and claims.status <> 'draft'
    and (
      claims.status <> 'not_proven'
      or claims.creator_id = auth.uid()
    )
));

drop policy if exists "public can read supporter inputs" on public.claim_supporter_inputs;
create policy "public can read supporter inputs"
on public.claim_supporter_inputs for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_supporter_inputs.claim_id
    and claims.status <> 'draft'
    and (
      claims.status <> 'not_proven'
      or claims.creator_id = auth.uid()
    )
));

drop policy if exists "public can read proof events" on public.claim_proof_events;
create policy "public can read proof events"
on public.claim_proof_events for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_proof_events.claim_id
    and claims.status <> 'draft'
    and (
      claims.status <> 'not_proven'
      or claims.creator_id = auth.uid()
    )
));

drop policy if exists "public can read checkins" on public.claim_checkins;
create policy "public can read checkins"
on public.claim_checkins for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_checkins.claim_id
    and claims.status <> 'draft'
    and (
      claims.status <> 'not_proven'
      or claims.creator_id = auth.uid()
    )
));

drop policy if exists "public can read evidence" on public.claim_evidence;
create policy "public can read evidence"
on public.claim_evidence for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_evidence.claim_id
    and claims.status in ('under_review', 'verified', 'not_proven', 'cancelled', 'disputed')
    and (
      claims.status <> 'not_proven'
      or claims.creator_id = auth.uid()
    )
));

drop policy if exists "public can read results" on public.claim_results;
create policy "public can read results"
on public.claim_results for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_results.claim_id
    and claims.status in ('verified', 'not_proven', 'cancelled', 'disputed')
    and (
      claims.status <> 'not_proven'
      or claims.creator_id = auth.uid()
    )
));
