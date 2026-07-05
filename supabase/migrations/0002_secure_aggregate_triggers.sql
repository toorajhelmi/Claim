create or replace function public.refresh_claim_pledge_totals()
returns trigger
language plpgsql
security definer
set search_path = public
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

create or replace function public.refresh_claim_recorder_count()
returns trigger
language plpgsql
security definer
set search_path = public
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
