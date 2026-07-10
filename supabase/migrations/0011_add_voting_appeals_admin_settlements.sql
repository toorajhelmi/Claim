alter table public.profiles
add column if not exists platform_role text not null default 'user'
check (platform_role in ('user', 'admin')),
add column if not exists account_status text not null default 'active'
check (account_status in ('active', 'suspended', 'terminated'));

alter table public.claim_pledges
add column if not exists wants_donate boolean not null default false,
add column if not exists settled_at timestamptz,
add column if not exists settlement_note text;

alter table public.claim_results
add column if not exists outcome_source text not null default 'admin'
check (outcome_source in ('admin', 'vote', 'appeal_admin')),
add column if not exists vote_deadline_at timestamptz,
add column if not exists appeal_deadline_at timestamptz,
add column if not exists settlement_ready_at timestamptz,
add column if not exists admin_notes text;

create table if not exists public.claim_votes (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  voter_id uuid references auth.users (id) on delete set null,
  voter_email text not null,
  vote text not null check (vote in ('accepted', 'declined')),
  reason text,
  created_at timestamptz not null default now(),
  unique (claim_id, voter_email)
);

create table if not exists public.claim_appeals (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  appellant_id uuid references auth.users (id) on delete set null,
  appellant_email text not null,
  appellant_role text not null check (appellant_role in ('claimer', 'supporter')),
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  admin_response text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (claim_id, appellant_email)
);

create table if not exists public.claim_admin_decisions (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  admin_id uuid references auth.users (id) on delete set null,
  decision text not null check (decision in ('accepted', 'declined', 'cancelled')),
  summary text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.claim_settlements (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null unique references public.claims (id) on delete cascade,
  outcome text not null check (outcome in ('accepted', 'declined', 'cancelled')),
  status text not null default 'pending' check (status in ('pending', 'blocked_by_appeal', 'ready', 'processed')),
  platform_commission_bps integer not null default 750 check (platform_commission_bps >= 0 and platform_commission_bps <= 10000),
  gross_pledge_cents integer not null default 0 check (gross_pledge_cents >= 0),
  net_pledge_cents integer not null default 0 check (net_pledge_cents >= 0),
  locked_amount_cents integer not null default 0 check (locked_amount_cents >= 0),
  net_locked_amount_cents integer not null default 0 check (net_locked_amount_cents >= 0),
  donation_cents integer not null default 0 check (donation_cents >= 0),
  notes text,
  ready_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create schema if not exists private;

create or replace function private.get_supporter_pledge_total(target_claim_id uuid, target_supporter_email text)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(amount_cents), 0)::integer
  from public.claim_pledges
  where claim_id = target_claim_id
    and target_supporter_email is not null
    and supporter_email is not null
    and lower(supporter_email) = lower(target_supporter_email)
    and status in ('intent', 'authorized', 'collected');
$$;

grant usage on schema private to anon, authenticated;
grant execute on function private.get_supporter_pledge_total(uuid, text) to anon, authenticated;

alter table public.claim_votes enable row level security;
alter table public.claim_appeals enable row level security;
alter table public.claim_admin_decisions enable row level security;
alter table public.claim_settlements enable row level security;

revoke update (platform_role, account_status) on public.profiles from authenticated;

drop policy if exists "admins can read all claims" on public.claims;
create policy "admins can read all claims"
on public.claims for select
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and profiles.platform_role = 'admin'
));

drop policy if exists "admins can read all pledges" on public.claim_pledges;
create policy "admins can read all pledges"
on public.claim_pledges for select
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and profiles.platform_role = 'admin'
));

drop policy if exists "admins can read all results" on public.claim_results;
create policy "admins can read all results"
on public.claim_results for select
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and profiles.platform_role = 'admin'
));

drop policy if exists "public can submit pledges" on public.claim_pledges;
create policy "public can submit pledges"
on public.claim_pledges for insert
to anon, authenticated
with check (exists (
  select 1 from public.claims
  where claims.id = claim_pledges.claim_id
    and claims.status in ('preview', 'open_for_backing', 'threshold_met', 'scheduled', 'live', 'verified')
    and (
      claim_pledges.amount_cents >= claims.pledge_threshold_cents
      or private.get_supporter_pledge_total(claim_pledges.claim_id, claim_pledges.supporter_email) >= claims.pledge_threshold_cents
    )
));

drop policy if exists "supporters can read claim votes" on public.claim_votes;
create policy "supporters can read claim votes"
on public.claim_votes for select
to authenticated
using (
  voter_id = auth.uid()
  or exists (
    select 1 from public.claims
    where claims.id = claim_votes.claim_id
      and claims.creator_id = auth.uid()
  )
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.platform_role = 'admin'
  )
);

drop policy if exists "pledged supporters can vote during review window" on public.claim_votes;
create policy "pledged supporters can vote during review window"
on public.claim_votes for insert
to authenticated
with check (
  voter_id = auth.uid()
  and lower(voter_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  and exists (
    select 1 from public.claims
    where claims.id = claim_votes.claim_id
      and claims.status = 'under_review'
      and (claims.deadline_at is null or now() >= claims.deadline_at)
      and now() <= coalesce(claims.deadline_at, now()) + interval '24 hours'
  )
  and exists (
    select 1 from public.claim_pledges
    where claim_pledges.claim_id = claim_votes.claim_id
      and lower(claim_pledges.supporter_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and claim_pledges.status in ('intent', 'authorized', 'collected')
  )
);

drop policy if exists "appeal participants can read appeals" on public.claim_appeals;
create policy "appeal participants can read appeals"
on public.claim_appeals for select
to authenticated
using (
  appellant_id = auth.uid()
  or exists (
    select 1 from public.claims
    where claims.id = claim_appeals.claim_id
      and claims.creator_id = auth.uid()
  )
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.platform_role = 'admin'
  )
);

drop policy if exists "claimers and supporters can submit one appeal" on public.claim_appeals;
create policy "claimers and supporters can submit one appeal"
on public.claim_appeals for insert
to authenticated
with check (
  appellant_id = auth.uid()
  and lower(appellant_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  and exists (
    select 1 from public.claim_results
    join public.claims on claims.id = claim_results.claim_id
    where claim_results.claim_id = claim_appeals.claim_id
      and now() <= claim_results.published_at + interval '24 hours'
      and (
        (claim_appeals.appellant_role = 'claimer' and claims.creator_id = auth.uid())
        or (
          claim_appeals.appellant_role = 'supporter'
          and exists (
            select 1 from public.claim_pledges
            where claim_pledges.claim_id = claim_appeals.claim_id
              and lower(claim_pledges.supporter_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          )
        )
      )
  )
);

drop policy if exists "admins can manage appeals" on public.claim_appeals;
create policy "admins can manage appeals"
on public.claim_appeals for update
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and profiles.platform_role = 'admin'
))
with check (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and profiles.platform_role = 'admin'
));

drop policy if exists "admins can manage admin decisions" on public.claim_admin_decisions;
create policy "admins can manage admin decisions"
on public.claim_admin_decisions for all
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and profiles.platform_role = 'admin'
))
with check (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and profiles.platform_role = 'admin'
));

drop policy if exists "claim participants can read admin decisions" on public.claim_admin_decisions;
create policy "claim participants can read admin decisions"
on public.claim_admin_decisions for select
to authenticated
using (
  exists (
    select 1 from public.claims
    where claims.id = claim_admin_decisions.claim_id
      and claims.creator_id = auth.uid()
  )
  or exists (
    select 1 from public.claim_pledges
    where claim_pledges.claim_id = claim_admin_decisions.claim_id
      and lower(claim_pledges.supporter_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.platform_role = 'admin'
  )
);

drop policy if exists "claim participants can read settlements" on public.claim_settlements;
create policy "claim participants can read settlements"
on public.claim_settlements for select
to authenticated
using (
  exists (
    select 1 from public.claims
    where claims.id = claim_settlements.claim_id
      and claims.creator_id = auth.uid()
  )
  or exists (
    select 1 from public.claim_pledges
    where claim_pledges.claim_id = claim_settlements.claim_id
      and lower(claim_pledges.supporter_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.platform_role = 'admin'
  )
);

drop policy if exists "admins can manage settlements" on public.claim_settlements;
create policy "admins can manage settlements"
on public.claim_settlements for all
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and profiles.platform_role = 'admin'
))
with check (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and profiles.platform_role = 'admin'
));
