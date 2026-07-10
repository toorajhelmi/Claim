drop policy if exists "accepted recorders can read own invite" on public.claim_recorder_invites;
create policy "accepted recorders can read own invite"
on public.claim_recorder_invites for select
to authenticated
using (
  status = 'accepted'
  and invitee_contact is not null
  and lower(invitee_contact) = lower(coalesce(auth.jwt() ->> 'email', ''))
);
