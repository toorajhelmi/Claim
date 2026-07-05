do $$
begin
  if exists (
    select 1
    from pg_enum
    where enumtypid = 'public.participant_role'::regtype
      and enumlabel = 'challenger'
  ) and not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.participant_role'::regtype
      and enumlabel = 'claimer'
  ) then
    alter type public.participant_role rename value 'challenger' to 'claimer';
  elsif not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.participant_role'::regtype
      and enumlabel = 'claimer'
  ) then
    alter type public.participant_role add value 'claimer';
  end if;
end $$;
