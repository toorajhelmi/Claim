create table if not exists public.user_payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'stripe' check (provider in ('stripe')),
  provider_customer_id text not null,
  provider_payment_method_id text not null,
  brand text,
  last4 text,
  exp_month integer check (exp_month is null or (exp_month >= 1 and exp_month <= 12)),
  exp_year integer check (exp_year is null or exp_year >= 2024),
  status text not null default 'active' check (status in ('active', 'failed', 'deleted')),
  is_default boolean not null default true,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_method_id)
);

alter table public.user_payment_methods enable row level security;

drop trigger if exists user_payment_methods_set_updated_at on public.user_payment_methods;
create trigger user_payment_methods_set_updated_at
before update on public.user_payment_methods
for each row execute function public.set_updated_at();

create index if not exists user_payment_methods_user_id_status_idx
on public.user_payment_methods (user_id, status, is_default);

drop policy if exists "users can read own payment methods" on public.user_payment_methods;
create policy "users can read own payment methods"
on public.user_payment_methods for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "admins can read payment methods" on public.user_payment_methods;
create policy "admins can read payment methods"
on public.user_payment_methods for select
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and profiles.platform_role = 'admin'
));
