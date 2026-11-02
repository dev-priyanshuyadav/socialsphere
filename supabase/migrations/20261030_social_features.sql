-- Social features migration. Apply after supabase/schema.sql.
create table if not exists public.follow_requests (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  likes boolean not null default true,
  comments boolean not null default true,
  follows boolean not null default true,
  messages boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,48}$'),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 1000),
  is_private boolean not null default false,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','moderator','owner')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.community_join_requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (community_id, user_id)
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image','video')),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.hashtags (
  id uuid primary key default gen_random_uuid(),
  tag text not null unique check (tag ~ '^[a-zA-Z0-9_]{1,100}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.post_hashtags (
  post_id uuid not null references public.posts(id) on delete cascade,
  hashtag_id uuid not null references public.hashtags(id) on delete cascade,
  primary key (post_id, hashtag_id)
);

create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 5000),
  scheduled_for timestamptz not null,
  published_post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.post_drafts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_analytics (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  metric text not null check (metric in ('impressions','engagements','follower_growth')),
  value bigint not null check (value >= 0),
  measured_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (char_length(action) between 1 and 100),
  target_type text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.conversations add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like','comment','follow','follow_request','follow_request_accepted','message','mention','community_invite','moderation'));

create index if not exists follow_requests_recipient_idx on public.follow_requests (following_id, created_at desc);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);
create index if not exists community_posts_feed_idx on public.community_posts (community_id, created_at desc);
create index if not exists communities_created_idx on public.communities (created_at desc);

create or replace function public.is_community_member(target_community_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.community_members m
    where m.community_id = target_community_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_blocked(first_user_id uuid, second_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b where
      (b.blocker_id = first_user_id and b.blocked_id = second_user_id) or
      (b.blocker_id = second_user_id and b.blocked_id = first_user_id)
  );
$$;

alter table public.follow_requests enable row level security;
alter table public.blocks enable row level security;
alter table public.story_views enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_join_requests enable row level security;
alter table public.community_posts enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.community_events enable row level security;
alter table public.post_media enable row level security;
alter table public.hashtags enable row level security;
alter table public.post_hashtags enable row level security;
alter table public.scheduled_posts enable row level security;
alter table public.post_drafts enable row level security;
alter table public.creator_analytics enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are publicly discoverable" on public.profiles for select using (true);
drop policy if exists "Users can join as themselves" on public.conversation_members;
drop policy if exists "Authenticated users create conversations" on public.conversations;
drop policy if exists "Posts are viewable when public or owned" on public.posts;
create policy "Posts respect author privacy and visibility" on public.posts for select using (
  author_id = auth.uid() or exists (
    select 1 from public.profiles author where author.id = author_id and (
      not public.is_blocked(auth.uid(), author.id) and (
      (not author.is_private and visibility = 'public') or
      (visibility in ('public','followers') and exists (
        select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = author.id
      ))
      )
    )
  )
);
drop policy if exists "Users create their own posts" on public.posts;
create policy "Users create posts with owned media" on public.posts for insert
  with check (
    auth.uid() = author_id and
    (media_url is null or (storage.foldername(media_url))[1] = auth.uid()::text)
  );
drop policy if exists "Users follow as themselves" on public.follows;
create policy "Users follow eligible public profiles" on public.follows for insert
  with check (
    auth.uid() = follower_id and exists (
      select 1 from public.profiles p where p.id = following_id and not p.is_private
    ) and not exists (
      select 1 from public.blocks b where
        (b.blocker_id = follower_id and b.blocked_id = following_id) or
        (b.blocker_id = following_id and b.blocked_id = follower_id)
    )
  );
drop policy if exists "Likes are readable" on public.likes;
create policy "Likes visible for readable posts" on public.likes for select
  using (exists (select 1 from public.posts p where p.id = post_id));
drop policy if exists "Users like as themselves" on public.likes;
create policy "Users like readable posts" on public.likes for insert
  with check (auth.uid() = user_id and exists (select 1 from public.posts p where p.id = post_id));
drop policy if exists "Users create comments as themselves" on public.comments;
create policy "Users comment on readable posts" on public.comments for insert
  with check (
    auth.uid() = author_id and exists (select 1 from public.posts p where p.id = post_id) and
    (comments.parent_id is null or exists (
      select 1 from public.comments parent where parent.id = comments.parent_id and parent.post_id = comments.post_id
    ))
  );
drop policy if exists "Users create own bookmarks" on public.bookmarks;
create policy "Users bookmark readable posts" on public.bookmarks for insert
  with check (auth.uid() = user_id and exists (select 1 from public.posts p where p.id = post_id));
create policy "Members can access their block relation" on public.blocks for select
  using (auth.uid() = blocker_id);
create policy "Users block as themselves" on public.blocks for insert
  with check (auth.uid() = blocker_id);
create policy "Users unblock as themselves" on public.blocks for delete
  using (auth.uid() = blocker_id);
drop policy if exists "Follows are readable" on public.follows;
create policy "Follows visible without blocks" on public.follows for select
  using (follower_id = auth.uid() or following_id = auth.uid() or not public.is_blocked(auth.uid(), follower_id));
create policy "Participants can view follow requests" on public.follow_requests for select
  using (auth.uid() = follower_id or auth.uid() = following_id);
create policy "Users request to follow as themselves" on public.follow_requests for insert
  with check (
    auth.uid() = follower_id and exists (select 1 from public.profiles p where p.id = following_id and p.is_private)
    and not public.is_blocked(follower_id, following_id)
  );
create policy "Recipient can decide follow request" on public.follow_requests for delete
  using (auth.uid() = following_id or auth.uid() = follower_id);
create policy "Story owners see views" on public.story_views for select
  using (auth.uid() = viewer_id or exists (
    select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid()
  ));
create policy "Users record own story views" on public.story_views for insert
  with check (auth.uid() = viewer_id and exists (
    select 1 from public.stories s where s.id = story_id and s.expires_at > now()
  ));
create policy "Users manage notification preferences" on public.notification_preferences for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users create own stories" on public.stories;
create policy "Users create stories with owned media" on public.stories for insert
  with check (auth.uid() = author_id and (storage.foldername(media_url))[1] = auth.uid()::text);
drop policy if exists "Active stories are visible" on public.stories;
create policy "Stories visible to owners and permitted followers" on public.stories for select using (
  expires_at > now() and (
    author_id = auth.uid() or exists (
      select 1 from public.profiles p where p.id = author_id and not p.is_private
        and not public.is_blocked(auth.uid(), author_id)
    ) or exists (
      select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = author_id
        and not public.is_blocked(auth.uid(), author_id)
    )
  )
);
create policy "Communities are visible when public or joined" on public.communities for select
  using (true);
create policy "Users create communities" on public.communities for insert
  with check (auth.uid() = owner_id);
create policy "Owners update communities" on public.communities for update
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Community members view membership" on public.community_members for select
  using (exists (
    select 1 from public.communities c where c.id = community_id and
    (not c.is_private or public.is_community_member(c.id))
  ));
create policy "Users join public communities" on public.community_members for insert
  with check (auth.uid() = user_id and role = 'member' and exists (
    select 1 from public.communities c where c.id = community_id and not c.is_private
  ));
create policy "Users leave communities" on public.community_members for delete
  using (auth.uid() = user_id and role <> 'owner');
create policy "Users and community moderators view join requests" on public.community_join_requests for select
  using (
    auth.uid() = user_id or exists (
      select 1 from public.community_members m where m.community_id = community_join_requests.community_id
        and m.user_id = auth.uid() and m.role in ('owner','moderator')
    )
  );
create policy "Users request private community membership" on public.community_join_requests for insert
  with check (
    auth.uid() = user_id and exists (
      select 1 from public.communities c where c.id = community_id and c.is_private
    ) and not exists (
      select 1 from public.community_members m where m.community_id = community_join_requests.community_id and m.user_id = auth.uid()
    )
  );
create policy "Users cancel or moderators decide join requests" on public.community_join_requests for delete
  using (auth.uid() = user_id or exists (
    select 1 from public.community_members m where m.community_id = community_join_requests.community_id
      and m.user_id = auth.uid() and m.role in ('owner','moderator')
  ));
create policy "Members view community posts" on public.community_posts for select
  using (exists (select 1 from public.community_members m where m.community_id = community_posts.community_id and m.user_id = auth.uid()));
create policy "Members create community posts" on public.community_posts for insert
  with check (auth.uid() = author_id and exists (
    select 1 from public.community_members m where m.community_id = community_posts.community_id and m.user_id = auth.uid()
  ));
create policy "Authors delete community posts" on public.community_posts for delete
  using (auth.uid() = author_id);
create policy "Admins view audit logs" on public.admin_audit_logs for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins write audit logs" on public.admin_audit_logs for insert
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' and admin_id = auth.uid());
create policy "Admins review reports" on public.reports for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins update report status" on public.reports for update
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists "Members can view messages" on public.messages;
create policy "Conversation members view unblocked messages" on public.messages for select
  using (public.is_conversation_member(conversation_id) and not public.is_blocked(auth.uid(), sender_id));
drop policy if exists "Members can send messages as themselves" on public.messages;
create policy "Members send messages without block" on public.messages for insert
  with check (
    auth.uid() = sender_id and public.is_conversation_member(conversation_id) and not exists (
      select 1 from public.conversation_members member
      where member.conversation_id = messages.conversation_id and member.user_id <> auth.uid()
        and public.is_blocked(auth.uid(), member.user_id)
    )
  );
create policy "Community members view events" on public.community_events for select
  using (public.is_community_member(community_id));
create policy "Community moderators create events" on public.community_events for insert
  with check (auth.uid() = creator_id and exists (
    select 1 from public.community_members m where m.community_id = community_events.community_id
      and m.user_id = auth.uid() and m.role in ('owner','moderator')
  ));
create policy "Owners manage post media" on public.post_media for all
  using (auth.uid() = owner_id and exists (select 1 from public.posts p where p.id = post_media.post_id and p.author_id = auth.uid()))
  with check (auth.uid() = owner_id and exists (select 1 from public.posts p where p.id = post_media.post_id and p.author_id = auth.uid()));
create policy "Hashtags are searchable" on public.hashtags for select using (true);
create policy "Hashtags on visible posts are readable" on public.post_hashtags for select
  using (exists (select 1 from public.posts p where p.id = post_hashtags.post_id));
create policy "Users attach hashtags to own posts" on public.post_hashtags for all
  using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()))
  with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));
create policy "Users manage own scheduled posts" on public.scheduled_posts for all
  using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "Users manage their own drafts" on public.post_drafts for all
  using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "Creators view their measured analytics" on public.creator_analytics for select
  using (auth.uid() = creator_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('story-media', 'story-media', false, 52428800, array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social-media-private', 'social-media-private', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do nothing;
create policy "Users upload post media to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'social-media-private' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Post media readable only with post access" on storage.objects for select to authenticated
  using (bucket_id = 'social-media-private' and (
    (storage.foldername(name))[1] = auth.uid()::text or exists (
      select 1 from public.posts p where p.media_url = name and p.author_id::text = (storage.foldername(name))[1]
    )
  ));
create policy "Users delete their own post media" on storage.objects for delete to authenticated
  using (bucket_id = 'social-media-private' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users upload story media to their own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'story-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Story media visible only to authorized viewers" on storage.objects for select to authenticated
  using (bucket_id = 'story-media' and (
    (storage.foldername(name))[1] = auth.uid()::text or exists (
      select 1 from public.stories s
      where s.media_url = name and s.expires_at > now() and (
        not exists (select 1 from public.profiles p where p.id = s.author_id and p.is_private)
        or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = s.author_id)
        or s.author_id = auth.uid()
      ) and (storage.foldername(name))[1] = s.author_id::text
        and not public.is_blocked(auth.uid(), s.author_id)
    )
  ));
create policy "Users delete own story media" on storage.objects for delete to authenticated
  using (bucket_id = 'story-media' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.add_community_owner()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.community_members (community_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;
drop trigger if exists community_owner_membership on public.communities;
create trigger community_owner_membership after insert on public.communities
for each row execute function public.add_community_owner();

create or replace function public.create_conversation(member_ids uuid[])
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  conversation_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if member_ids is null or cardinality(member_ids) < 1 or cardinality(member_ids) > 19 then
    raise exception 'Choose between 1 and 19 other participants';
  end if;
  if exists (
    select 1 from unnest(member_ids) target_id
    where target_id = current_user_id or not exists (select 1 from public.profiles p where p.id = target_id)
  ) then raise exception 'Invalid participant'; end if;
  if exists (
    select 1 from unnest(member_ids) target_id
    join public.blocks b on (b.blocker_id = current_user_id and b.blocked_id = target_id)
       or (b.blocker_id = target_id and b.blocked_id = current_user_id)
  ) then raise exception 'A conversation cannot be created with a blocked account'; end if;
  insert into public.conversations (created_by) values (current_user_id) returning id into conversation_id;
  insert into public.conversation_members (conversation_id, user_id)
    values (conversation_id, current_user_id)
    on conflict do nothing;
  insert into public.conversation_members (conversation_id, user_id)
    select conversation_id, target_id from unnest(member_ids) target_id
    on conflict do nothing;
  return conversation_id;
end;
$$;
revoke all on function public.create_conversation(uuid[]) from public;
grant execute on function public.create_conversation(uuid[]) to authenticated;

create policy "Conversation creator creates row" on public.conversations for insert
  with check (auth.uid() = created_by);
create policy "Creator initializes conversation membership" on public.conversation_members for insert
  with check (exists (
    select 1 from public.conversations c where c.id = conversation_id and c.created_by = auth.uid()
  ));

create or replace function public.accept_follow_request(request_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  requester uuid;
  recipient uuid := auth.uid();
begin
  if recipient is null then raise exception 'Authentication required'; end if;
  select follower_id into requester from public.follow_requests
    where id = request_id and following_id = recipient for update;
  if requester is null then raise exception 'Follow request not found'; end if;
  if exists (
    select 1 from public.blocks b where
      (b.blocker_id = requester and b.blocked_id = recipient) or
      (b.blocker_id = recipient and b.blocked_id = requester)
  ) then raise exception 'Follow request is blocked'; end if;
  insert into public.follows (follower_id, following_id) values (requester, recipient)
    on conflict do nothing;
  delete from public.follow_requests where id = request_id;
  insert into public.notifications (recipient_id, actor_id, type)
    values (requester, recipient, 'follow_request_accepted');
end;
$$;
revoke all on function public.accept_follow_request(uuid) from public;
grant execute on function public.accept_follow_request(uuid) to authenticated;

create or replace function public.block_user(target_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  blocker uuid := auth.uid();
begin
  if blocker is null or target_user_id = blocker then raise exception 'Invalid account to block'; end if;
  if not exists (select 1 from public.profiles p where p.id = target_user_id) then
    raise exception 'Account not found';
  end if;
  insert into public.blocks (blocker_id, blocked_id) values (blocker, target_user_id) on conflict do nothing;
  delete from public.follows where
    (follower_id = blocker and following_id = target_user_id) or
    (follower_id = target_user_id and following_id = blocker);
  delete from public.follow_requests where
    (follower_id = blocker and following_id = target_user_id) or
    (follower_id = target_user_id and following_id = blocker);
end;
$$;
revoke all on function public.block_user(uuid) from public;
grant execute on function public.block_user(uuid) to authenticated;

create or replace function public.unblock_user(target_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.blocks where blocker_id = auth.uid() and blocked_id = target_user_id;
end;
$$;
revoke all on function public.unblock_user(uuid) from public;
grant execute on function public.unblock_user(uuid) to authenticated;

create or replace function public.decide_community_join_request(target_request_id uuid, approve boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  target_community uuid;
  target_user uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select community_id, user_id into target_community, target_user
    from public.community_join_requests where id = target_request_id for update;
  if target_community is null then raise exception 'Join request not found'; end if;
  if not exists (
    select 1 from public.community_members m where m.community_id = target_community
      and m.user_id = auth.uid() and m.role in ('owner','moderator')
  ) then raise exception 'Community moderator access is required'; end if;
  if approve then
    insert into public.community_members (community_id, user_id, role)
      values (target_community, target_user, 'member') on conflict do nothing;
  end if;
  delete from public.community_join_requests where id = target_request_id;
end;
$$;
revoke all on function public.decide_community_join_request(uuid,boolean) from public;
grant execute on function public.decide_community_join_request(uuid,boolean) to authenticated;

create or replace function public.review_report(target_report_id uuid, new_status text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Administrator access is required';
  end if;
  if new_status not in ('reviewing','resolved','dismissed') then
    raise exception 'Invalid report status';
  end if;
  update public.reports set status = new_status where id = target_report_id;
  if not found then raise exception 'Report not found'; end if;
  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, details)
    values (auth.uid(), 'report_' || new_status, 'report', target_report_id, jsonb_build_object('status', new_status));
end;
$$;
revoke all on function public.review_report(uuid,text) from public;
grant execute on function public.review_report(uuid,text) to authenticated;

create or replace function public.mark_conversation_read(target_conversation_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_conversation_member(target_conversation_id) then
    raise exception 'Conversation membership is required';
  end if;
  update public.messages set read_at = now()
    where conversation_id = target_conversation_id and sender_id <> auth.uid() and read_at is null;
end;
$$;
revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

create or replace function public.get_creator_metrics()
returns table(posts bigint, followers bigint, likes bigint, comments bigint)
language sql stable security definer set search_path = ''
as $$
  select
    (select count(*) from public.posts p where p.author_id = auth.uid()),
    (select count(*) from public.follows f where f.following_id = auth.uid()),
    (select count(*) from public.likes l join public.posts p on p.id = l.post_id where p.author_id = auth.uid()),
    (select count(*) from public.comments c join public.posts p on p.id = c.post_id where p.author_id = auth.uid())
  where auth.uid() is not null;
$$;
revoke all on function public.get_creator_metrics() from public;
grant execute on function public.get_creator_metrics() to authenticated;

create or replace function public.notify_social_event()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  recipient uuid;
  event_type text;
  target_post uuid;
  target_comment uuid;
  enabled boolean := true;
begin
  if tg_table_name = 'follows' then
    recipient := new.following_id;
    event_type := 'follow';
  elsif tg_table_name = 'follow_requests' then
    recipient := new.following_id;
    event_type := 'follow_request';
  elsif tg_table_name = 'likes' then
    select author_id into recipient from public.posts where id = new.post_id;
    event_type := 'like';
    target_post := new.post_id;
  elsif tg_table_name = 'comments' then
    select author_id into recipient from public.posts where id = new.post_id;
    event_type := 'comment';
    target_post := new.post_id;
    target_comment := new.id;
  end if;
  select case event_type
    when 'like' then coalesce(likes, true)
    when 'comment' then coalesce(comments, true)
    when 'follow' then coalesce(follows, true)
    when 'follow_request' then coalesce(follows, true)
    else true
  end into enabled
  from public.notification_preferences where user_id = recipient;
  if not found then enabled := true; end if;
  if recipient is not null and recipient <> auth.uid() and enabled then
    insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
      values (recipient, auth.uid(), event_type, target_post, target_comment);
  end if;
  return new;
end;
$$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify after insert on public.follows
for each row execute function public.notify_social_event();
drop trigger if exists follow_requests_notify on public.follow_requests;
create trigger follow_requests_notify after insert on public.follow_requests
for each row execute function public.notify_social_event();
drop trigger if exists likes_notify on public.likes;
create trigger likes_notify after insert on public.likes
for each row execute function public.notify_social_event();
drop trigger if exists comments_notify on public.comments;
create trigger comments_notify after insert on public.comments
for each row execute function public.notify_social_event();

create or replace function public.notify_message_recipients()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  member_user uuid;
  notifications_enabled boolean;
begin
  for member_user in
    select cm.user_id from public.conversation_members cm
    where cm.conversation_id = new.conversation_id and cm.user_id <> new.sender_id
  loop
    select coalesce(np.messages, true) into notifications_enabled
      from public.notification_preferences np where np.user_id = member_user;
    if not found then notifications_enabled := true; end if;
    if notifications_enabled then
      insert into public.notifications (recipient_id, actor_id, type)
        values (member_user, new.sender_id, 'message');
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists messages_notify on public.messages;
create trigger messages_notify after insert on public.messages
for each row execute function public.notify_message_recipients();

alter table public.messages replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
