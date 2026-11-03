alter table public.conversation_members
  add column if not exists archived_at timestamptz;

create or replace function public.set_conversation_archived(
  target_conversation_id uuid,
  archived boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.conversation_members
  set archived_at = case when archived then now() else null end
  where conversation_id = target_conversation_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Conversation membership is required';
  end if;
end;
$$;

revoke all on function public.set_conversation_archived(uuid, boolean) from public;
grant execute on function public.set_conversation_archived(uuid, boolean) to authenticated;
