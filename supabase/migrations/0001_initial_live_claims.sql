create extension if not exists pgcrypto;

do $$
begin
  create type public.claim_type as enum ('city_walk', 'public_statement');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.claim_status as enum (
    'draft',
    'preview',
    'open_for_backing',
    'threshold_met',
    'scheduled',
    'live',
    'under_review',
    'verified',
    'not_proven',
    'cancelled',
    'disputed'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.participant_role as enum (
    'challenger',
    'recorder',
    'witness',
    'supporter',
    'moderator',
    'reviewer'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.invite_status as enum ('pending', 'accepted', 'declined', 'expired');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.pledge_status as enum ('intent', 'authorized', 'collected', 'refunded', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.proof_event_type as enum (
    'rules_locked',
    'threshold_reached',
    'recorder_accepted',
    'live_room_opened',
    'proof_code_shown',
    'attempt_started',
    'supporter_input_selected',
    'checkin_submitted',
    'statement_attempted',
    'deadline_reached',
    'attempt_finished',
    'reviewer_decision'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.result_status as enum ('verified', 'not_proven', 'disputed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  handle text unique,
  avatar_url text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  creator_id uuid references public.profiles (id) on delete set null,
  creator_name text not null,
  creator_handle text,
  creator_platform text,
  contact_email text,
  claim_type public.claim_type not null,
  status public.claim_status not null default 'preview',
  title text not null,
  description text,
  teaser_title text,
  teaser_description text,
  teaser_video_url text,
  preview_image_url text,
  stake_amount_cents integer not null default 0 check (stake_amount_cents >= 0),
  pledge_threshold_cents integer not null default 0 check (pledge_threshold_cents >= 0),
  pledge_pool_cents integer not null default 0 check (pledge_pool_cents >= 0),
  supporter_count integer not null default 0 check (supporter_count >= 0),
  recorder_count integer not null default 0 check (recorder_count >= 0),
  pledge_deadline_at timestamptz,
  live_starts_at timestamptz,
  deadline_at timestamptz,
  failure_route text,
  payout_split jsonb not null default '{}'::jsonb,
  exact_statement text,
  event_context text,
  event_window_start_at timestamptz,
  event_window_end_at timestamptz,
  start_area text,
  destination_rule text,
  allowed_transport text,
  checkin_interval_minutes integer check (checkin_interval_minutes is null or checkin_interval_minutes > 0),
  proof_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint claims_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.claim_proof_rules (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  position integer not null default 0,
  rule text not null,
  required boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.claim_share_assets (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  share_title text not null,
  share_description text,
  launch_copy text,
  preview_image_url text,
  preview_video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.claim_pledges (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  supporter_name text not null,
  supporter_handle text,
  supporter_email text,
  amount_cents integer not null check (amount_cents > 0),
  status public.pledge_status not null default 'intent',
  wants_live_reminder boolean not null default true,
  source_channel text,
  created_at timestamptz not null default now()
);

create table if not exists public.claim_recorder_invites (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  invite_token uuid not null unique default gen_random_uuid(),
  role public.participant_role not null default 'recorder',
  invitee_name text,
  invitee_contact text,
  payout_share_bps integer not null default 0 check (payout_share_bps >= 0 and payout_share_bps <= 10000),
  responsibilities text,
  status public.invite_status not null default 'pending',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.claim_live_rooms (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null unique references public.claims (id) on delete cascade,
  livekit_room_name text not null unique,
  proof_code text not null default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  opened_at timestamptz,
  closed_at timestamptz,
  recording_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.claim_live_participants (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  live_room_id uuid references public.claim_live_rooms (id) on delete cascade,
  role public.participant_role not null,
  display_name text not null,
  participant_identity text not null,
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.claim_supporter_inputs (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  supporter_name text,
  input_type text not null default 'chat',
  content text not null,
  selected boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.claim_proof_events (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  event_type public.proof_event_type not null,
  title text not null,
  description text,
  event_time timestamptz not null default now(),
  source_role public.participant_role,
  source_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.claim_checkins (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  label text not null,
  notes text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  media_url text,
  checked_in_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.claim_evidence (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  title text not null,
  evidence_type text not null,
  url text,
  notes text,
  submitted_by_role public.participant_role,
  submitted_by_name text,
  captured_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.claim_results (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null unique references public.claims (id) on delete cascade,
  status public.result_status not null,
  reviewer_name text,
  summary text not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_reviews (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  reviewer_name text not null,
  decision text not null,
  notes text,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists claims_set_updated_at on public.claims;
create trigger claims_set_updated_at
before update on public.claims
for each row execute function public.set_updated_at();

drop trigger if exists claim_share_assets_set_updated_at on public.claim_share_assets;
create trigger claim_share_assets_set_updated_at
before update on public.claim_share_assets
for each row execute function public.set_updated_at();

drop trigger if exists claim_recorder_invites_set_updated_at on public.claim_recorder_invites;
create trigger claim_recorder_invites_set_updated_at
before update on public.claim_recorder_invites
for each row execute function public.set_updated_at();

create or replace function public.refresh_claim_pledge_totals()
returns trigger
language plpgsql
as $$
declare
  target_claim_id uuid;
begin
  target_claim_id = coalesce(new.claim_id, old.claim_id);

  update public.claims
  set
    pledge_pool_cents = coalesce((
      select sum(amount_cents)
      from public.claim_pledges
      where claim_id = target_claim_id
        and status in ('intent', 'authorized', 'collected')
    ), 0),
    supporter_count = (
      select count(*)
      from public.claim_pledges
      where claim_id = target_claim_id
        and status in ('intent', 'authorized', 'collected')
    ),
    status = case
      when status = 'open_for_backing'
        and coalesce((
          select sum(amount_cents)
          from public.claim_pledges
          where claim_id = target_claim_id
            and status in ('intent', 'authorized', 'collected')
        ), 0) >= pledge_threshold_cents
        and pledge_threshold_cents > 0
      then 'threshold_met'::public.claim_status
      else status
    end
  where id = target_claim_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists claim_pledges_refresh_totals on public.claim_pledges;
create trigger claim_pledges_refresh_totals
after insert or update or delete on public.claim_pledges
for each row execute function public.refresh_claim_pledge_totals();

create or replace function public.refresh_claim_recorder_count()
returns trigger
language plpgsql
as $$
declare
  target_claim_id uuid;
begin
  target_claim_id = coalesce(new.claim_id, old.claim_id);

  update public.claims
  set recorder_count = (
    select count(*)
    from public.claim_recorder_invites
    where claim_id = target_claim_id
      and status = 'accepted'
  )
  where id = target_claim_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists claim_recorder_invites_refresh_count on public.claim_recorder_invites;
create trigger claim_recorder_invites_refresh_count
after insert or update or delete on public.claim_recorder_invites
for each row execute function public.refresh_claim_recorder_count();

alter table public.profiles enable row level security;
alter table public.claims enable row level security;
alter table public.claim_proof_rules enable row level security;
alter table public.claim_share_assets enable row level security;
alter table public.claim_pledges enable row level security;
alter table public.claim_recorder_invites enable row level security;
alter table public.claim_live_rooms enable row level security;
alter table public.claim_live_participants enable row level security;
alter table public.claim_supporter_inputs enable row level security;
alter table public.claim_proof_events enable row level security;
alter table public.claim_checkins enable row level security;
alter table public.claim_evidence enable row level security;
alter table public.claim_results enable row level security;
alter table public.admin_reviews enable row level security;

drop policy if exists "profiles can read own profile" on public.profiles;
create policy "profiles can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles can update own profile" on public.profiles;
create policy "profiles can update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles can insert own profile" on public.profiles;
create policy "profiles can insert own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "public can read launched claims" on public.claims;
create policy "public can read launched claims"
on public.claims for select
to anon, authenticated
using (status <> 'draft');

drop policy if exists "authenticated creators can manage own claims" on public.claims;
create policy "authenticated creators can manage own claims"
on public.claims for all
to authenticated
using (creator_id = auth.uid())
with check (creator_id = auth.uid());

drop policy if exists "public can submit preview claims" on public.claims;
create policy "public can submit preview claims"
on public.claims for insert
to anon, authenticated
with check (creator_id is null and status in ('preview', 'open_for_backing'));

drop policy if exists "public can read proof rules for launched claims" on public.claim_proof_rules;
create policy "public can read proof rules for launched claims"
on public.claim_proof_rules for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_proof_rules.claim_id
    and claims.status <> 'draft'
));

drop policy if exists "public can add proof rules to preview claims" on public.claim_proof_rules;
create policy "public can add proof rules to preview claims"
on public.claim_proof_rules for insert
to anon, authenticated
with check (exists (
  select 1 from public.claims
  where claims.id = claim_proof_rules.claim_id
    and claims.creator_id is null
    and claims.status in ('preview', 'open_for_backing')
));

drop policy if exists "public can read share assets" on public.claim_share_assets;
create policy "public can read share assets"
on public.claim_share_assets for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_share_assets.claim_id
    and claims.status <> 'draft'
));

drop policy if exists "public can add share assets to preview claims" on public.claim_share_assets;
create policy "public can add share assets to preview claims"
on public.claim_share_assets for insert
to anon, authenticated
with check (exists (
  select 1 from public.claims
  where claims.id = claim_share_assets.claim_id
    and claims.creator_id is null
    and claims.status in ('preview', 'open_for_backing')
));

drop policy if exists "public can submit pledges" on public.claim_pledges;
create policy "public can submit pledges"
on public.claim_pledges for insert
to anon, authenticated
with check (exists (
  select 1 from public.claims
  where claims.id = claim_pledges.claim_id
    and claims.status in ('preview', 'open_for_backing', 'threshold_met', 'scheduled', 'live')
));

drop policy if exists "public can read non-sensitive pledge wall" on public.claim_pledges;
create policy "public can read non-sensitive pledge wall"
on public.claim_pledges for select
to anon, authenticated
using (supporter_email is null and exists (
  select 1 from public.claims
  where claims.id = claim_pledges.claim_id
    and claims.status <> 'draft'
));

drop policy if exists "public can read pending recorder invites" on public.claim_recorder_invites;
create policy "public can read pending recorder invites"
on public.claim_recorder_invites for select
to anon, authenticated
using (status = 'pending');

drop policy if exists "public can create recorder invites for launched claims" on public.claim_recorder_invites;
create policy "public can create recorder invites for launched claims"
on public.claim_recorder_invites for insert
to anon, authenticated
with check (exists (
  select 1 from public.claims
  where claims.id = claim_recorder_invites.claim_id
    and claims.status in ('preview', 'open_for_backing', 'threshold_met', 'scheduled')
));

drop policy if exists "public can accept recorder invites" on public.claim_recorder_invites;
create policy "public can accept recorder invites"
on public.claim_recorder_invites for update
to anon, authenticated
using (status = 'pending')
with check (status in ('accepted', 'declined'));

drop policy if exists "public can read live rooms for launched claims" on public.claim_live_rooms;
create policy "public can read live rooms for launched claims"
on public.claim_live_rooms for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_live_rooms.claim_id
    and claims.status <> 'draft'
));

drop policy if exists "public can read live participants" on public.claim_live_participants;
create policy "public can read live participants"
on public.claim_live_participants for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_live_participants.claim_id
    and claims.status <> 'draft'
));

drop policy if exists "public can submit supporter inputs" on public.claim_supporter_inputs;
create policy "public can submit supporter inputs"
on public.claim_supporter_inputs for insert
to anon, authenticated
with check (exists (
  select 1 from public.claims
  where claims.id = claim_supporter_inputs.claim_id
    and claims.status in ('scheduled', 'live')
));

drop policy if exists "public can read supporter inputs" on public.claim_supporter_inputs;
create policy "public can read supporter inputs"
on public.claim_supporter_inputs for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_supporter_inputs.claim_id
    and claims.status <> 'draft'
));

drop policy if exists "public can read proof events" on public.claim_proof_events;
create policy "public can read proof events"
on public.claim_proof_events for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_proof_events.claim_id
    and claims.status <> 'draft'
));

drop policy if exists "public can submit proof events for live claims" on public.claim_proof_events;
create policy "public can submit proof events for live claims"
on public.claim_proof_events for insert
to anon, authenticated
with check (exists (
  select 1 from public.claims
  where claims.id = claim_proof_events.claim_id
    and claims.status in ('scheduled', 'live', 'under_review')
));

drop policy if exists "public can read checkins" on public.claim_checkins;
create policy "public can read checkins"
on public.claim_checkins for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_checkins.claim_id
    and claims.status <> 'draft'
));

drop policy if exists "public can submit checkins" on public.claim_checkins;
create policy "public can submit checkins"
on public.claim_checkins for insert
to anon, authenticated
with check (exists (
  select 1 from public.claims
  where claims.id = claim_checkins.claim_id
    and claims.status in ('scheduled', 'live', 'under_review')
));

drop policy if exists "public can read evidence" on public.claim_evidence;
create policy "public can read evidence"
on public.claim_evidence for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_evidence.claim_id
    and claims.status in ('under_review', 'verified', 'not_proven', 'cancelled', 'disputed')
));

drop policy if exists "public can submit evidence" on public.claim_evidence;
create policy "public can submit evidence"
on public.claim_evidence for insert
to anon, authenticated
with check (exists (
  select 1 from public.claims
  where claims.id = claim_evidence.claim_id
    and claims.status in ('live', 'under_review')
));

drop policy if exists "public can read results" on public.claim_results;
create policy "public can read results"
on public.claim_results for select
to anon, authenticated
using (exists (
  select 1 from public.claims
  where claims.id = claim_results.claim_id
    and claims.status in ('verified', 'not_proven', 'cancelled', 'disputed')
));

drop policy if exists "service role can manage admin reviews" on public.admin_reviews;
create policy "service role can manage admin reviews"
on public.admin_reviews for all
to service_role
using (true)
with check (true);

create index if not exists claims_status_idx on public.claims (status);
create index if not exists claims_claim_type_idx on public.claims (claim_type);
create index if not exists claim_proof_rules_claim_id_idx on public.claim_proof_rules (claim_id);
create index if not exists claim_pledges_claim_id_idx on public.claim_pledges (claim_id);
create index if not exists claim_recorder_invites_claim_id_idx on public.claim_recorder_invites (claim_id);
create index if not exists claim_supporter_inputs_claim_id_idx on public.claim_supporter_inputs (claim_id);
create index if not exists claim_proof_events_claim_id_time_idx on public.claim_proof_events (claim_id, event_time);
create index if not exists claim_checkins_claim_id_time_idx on public.claim_checkins (claim_id, checked_in_at);
create index if not exists claim_evidence_claim_id_idx on public.claim_evidence (claim_id);
