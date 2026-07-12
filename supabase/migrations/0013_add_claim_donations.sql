create table if not exists public.donation_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  every_org_identifier text not null unique,
  ein text,
  logo_url text,
  profile_url text,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.claim_donation_settings (
  claim_id uuid primary key references public.claims (id) on delete cascade,
  organization_id uuid not null references public.donation_organizations (id),
  success_donation_bps integer not null default 0 check (success_donation_bps >= 0 and success_donation_bps <= 10000),
  public_note text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.claim_charity_payments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  organization_id uuid not null references public.donation_organizations (id),
  payment_reason text not null check (payment_reason in ('success_share', 'supporter_failure_donation', 'manual_adjustment')),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  payment_url text,
  invoice_url text,
  receipt_url text,
  admin_notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (claim_id, payment_reason)
);

drop trigger if exists donation_organizations_set_updated_at on public.donation_organizations;
create trigger donation_organizations_set_updated_at
before update on public.donation_organizations
for each row execute function public.set_updated_at();

drop trigger if exists claim_donation_settings_set_updated_at on public.claim_donation_settings;
create trigger claim_donation_settings_set_updated_at
before update on public.claim_donation_settings
for each row execute function public.set_updated_at();

drop trigger if exists claim_charity_payments_set_updated_at on public.claim_charity_payments;
create trigger claim_charity_payments_set_updated_at
before update on public.claim_charity_payments
for each row execute function public.set_updated_at();

insert into public.donation_organizations (name, every_org_identifier, ein, profile_url, description)
values
  ('GiveDirectly', 'givedirectly', '27-1661997', 'https://www.every.org/givedirectly', 'Cash relief to people living in poverty.'),
  ('Feeding America', 'feedingamerica', '36-3673599', 'https://www.every.org/feedingamerica', 'Food bank network serving communities across the United States.'),
  ('Doctors Without Borders USA', 'doctorswithoutborders', '13-3433452', 'https://www.every.org/doctorswithoutborders', 'Emergency medical aid where it is needed most.'),
  ('American Red Cross', 'american-red-cross', '53-0196605', 'https://www.every.org/american-red-cross', 'Disaster relief, blood donation, and emergency support.'),
  ('St. Jude Children''s Research Hospital', 'stjude', '62-0646012', 'https://www.every.org/stjude', 'Research and treatment for children with catastrophic diseases.')
on conflict (every_org_identifier) do update
set
  name = excluded.name,
  ein = excluded.ein,
  profile_url = excluded.profile_url,
  description = excluded.description,
  status = 'active';

alter table public.donation_organizations enable row level security;
alter table public.claim_donation_settings enable row level security;
alter table public.claim_charity_payments enable row level security;

drop policy if exists "public can read active donation organizations" on public.donation_organizations;
create policy "public can read active donation organizations"
on public.donation_organizations for select
using (status = 'active');

drop policy if exists "admins can manage donation organizations" on public.donation_organizations;
create policy "admins can manage donation organizations"
on public.donation_organizations for all
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

drop policy if exists "claim participants can read donation settings" on public.claim_donation_settings;
create policy "claim participants can read donation settings"
on public.claim_donation_settings for select
using (
  exists (
    select 1 from public.claims
    where claims.id = claim_donation_settings.claim_id
      and claims.status in ('preview', 'open_for_backing', 'threshold_met', 'scheduled', 'live', 'under_review', 'verified', 'not_proven', 'cancelled', 'disputed')
  )
  or exists (
    select 1 from public.claims
    where claims.id = claim_donation_settings.claim_id
      and claims.creator_id = auth.uid()
  )
  or exists (
    select 1 from public.claim_pledges
    where claim_pledges.claim_id = claim_donation_settings.claim_id
      and lower(claim_pledges.supporter_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.platform_role = 'admin'
  )
);

drop policy if exists "claim creators can manage draft donation settings" on public.claim_donation_settings;
create policy "claim creators can manage draft donation settings"
on public.claim_donation_settings for all
to authenticated
using (
  exists (
    select 1 from public.claims
    where claims.id = claim_donation_settings.claim_id
      and claims.creator_id = auth.uid()
      and claims.status = 'draft'
  )
)
with check (
  exists (
    select 1 from public.claims
    where claims.id = claim_donation_settings.claim_id
      and claims.creator_id = auth.uid()
      and claims.status = 'draft'
  )
);

drop policy if exists "admins can manage donation settings" on public.claim_donation_settings;
create policy "admins can manage donation settings"
on public.claim_donation_settings for all
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

drop policy if exists "claim participants can read charity payments" on public.claim_charity_payments;
create policy "claim participants can read charity payments"
on public.claim_charity_payments for select
to authenticated
using (
  exists (
    select 1 from public.claims
    where claims.id = claim_charity_payments.claim_id
      and claims.creator_id = auth.uid()
  )
  or exists (
    select 1 from public.claim_pledges
    where claim_pledges.claim_id = claim_charity_payments.claim_id
      and lower(claim_pledges.supporter_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.platform_role = 'admin'
  )
);

drop policy if exists "admins can manage charity payments" on public.claim_charity_payments;
create policy "admins can manage charity payments"
on public.claim_charity_payments for all
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

create index if not exists claim_donation_settings_organization_id_idx
on public.claim_donation_settings (organization_id);

create index if not exists claim_charity_payments_claim_id_idx
on public.claim_charity_payments (claim_id);

create index if not exists claim_charity_payments_status_idx
on public.claim_charity_payments (status);
