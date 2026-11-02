-- SocialSphere initial production schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  bio text check (char_length(bio) <= 300),
  avatar_url text,
  website text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 5000),
  media_url text,
  media_type text check (media_type in ('image','video') or media_type is null),
  visibility text not null default 'public' check (visibility in ('public','followers','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint post_has_content_or_media check (char_length(trim(content)) > 0 or media_url is not null)
);

create table if not exists public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

create table if not exists public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image','video')),
  caption text check (char_length(caption) <= 500),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('like','comment','follow','message','mention')),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 3 and 1000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  constraint report_has_target check (reported_user_id is not null or post_id is not null)
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_author_created_idx on public.posts (author_id, created_at desc);
create index if not exists comments_post_created_idx on public.comments (post_id, created_at asc);
create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);
create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at asc);
create index if not exists stories_expiry_idx on public.stories (expires_at);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  desired_username text;
begin
  desired_username := lower(coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)));
  insert into public.profiles (id, username, display_name)
  values (new.id, desired_username, coalesce(nullif(new.raw_user_meta_data ->> 'display_name',''), 'New user'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at before update on public.posts for each row execute function public.set_updated_at();
drop trigger if exists comments_updated_at on public.comments;
create trigger comments_updated_at before update on public.comments for each row execute function public.set_updated_at();

-- Enable row-level security on every user-facing table.
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.bookmarks enable row level security;
alter table public.stories enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users update their own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Posts are viewable when public or owned" on public.posts for select using (visibility = 'public' or author_id = auth.uid() or (visibility = 'followers' and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = author_id)));
create policy "Users create their own posts" on public.posts for insert with check (auth.uid() = author_id);
create policy "Users update their own posts" on public.posts for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "Users delete their own posts" on public.posts for delete using (auth.uid() = author_id);
create policy "Likes are readable" on public.likes for select using (true);
create policy "Users like as themselves" on public.likes for insert with check (auth.uid() = user_id);
create policy "Users remove their own likes" on public.likes for delete using (auth.uid() = user_id);
create policy "Comments are readable for visible posts" on public.comments for select using (exists (select 1 from public.posts p where p.id = post_id));
create policy "Users create comments as themselves" on public.comments for insert with check (auth.uid() = author_id);
create policy "Users update own comments" on public.comments for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "Users delete own comments" on public.comments for delete using (auth.uid() = author_id);
create policy "Follows are readable" on public.follows for select using (true);
create policy "Users follow as themselves" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users unfollow as themselves" on public.follows for delete using (auth.uid() = follower_id);
create policy "Bookmarks are private" on public.bookmarks for select using (auth.uid() = user_id);
create policy "Users create own bookmarks" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "Users delete own bookmarks" on public.bookmarks for delete using (auth.uid() = user_id);
create policy "Active stories are visible" on public.stories for select using (expires_at > now());
create policy "Users create own stories" on public.stories for insert with check (auth.uid() = author_id);
create policy "Users delete own stories" on public.stories for delete using (auth.uid() = author_id);
create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = target_conversation_id and m.user_id = auth.uid()
  );
$$;

create policy "Conversation members can view conversations" on public.conversations for select using (public.is_conversation_member(id));
create policy "Authenticated users create conversations" on public.conversations for insert with check (auth.uid() is not null);
create policy "Members can view membership" on public.conversation_members for select using (public.is_conversation_member(conversation_id));
create policy "Users can join as themselves" on public.conversation_members for insert with check (auth.uid() = user_id);
create policy "Members can view messages" on public.messages for select using (public.is_conversation_member(conversation_id));
create policy "Members can send messages as themselves" on public.messages for insert with check (auth.uid() = sender_id and public.is_conversation_member(conversation_id));
create policy "Recipients view notifications" on public.notifications for select using (auth.uid() = recipient_id);
create policy "Recipients update notifications" on public.notifications for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
create policy "Users create reports as themselves" on public.reports for insert with check (auth.uid() = reporter_id);
create policy "Users view their own reports" on public.reports for select using (auth.uid() = reporter_id);

-- Public media bucket for public feed images; writes remain restricted to each authenticated user's folder. Adjust size/MIME limits in Storage settings as needed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social-media', 'social-media', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do nothing;
create policy "Authenticated users upload to their own folder" on storage.objects for insert to authenticated with check (bucket_id = 'social-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users read own media" on storage.objects for select to authenticated using (bucket_id = 'social-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users update own media" on storage.objects for update to authenticated using (bucket_id = 'social-media' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'social-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own media" on storage.objects for delete to authenticated using (bucket_id = 'social-media' and (storage.foldername(name))[1] = auth.uid()::text);
