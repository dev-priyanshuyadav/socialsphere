update storage.buckets
set public = false
where id = 'social-media';

update public.posts
set media_url = split_part(
  regexp_replace(media_url, '^https?://[^/]+/storage/v1/object/public/social-media/', '', 'i'),
  '?',
  1
)
where media_url ~* '^https?://[^/]+/storage/v1/object/public/social-media/.+$';

drop policy if exists "Users read own media" on storage.objects;
drop policy if exists "Legacy post media readable only with post access" on storage.objects;
create policy "Legacy post media readable only with post access" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'social-media' and (
      (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
      or exists (
        select 1 from public.posts p
        where p.media_url = name and p.author_id::text = (storage.foldername(name))[1]
      )
    )
  );

drop policy if exists "Post media readable only with post access" on storage.objects;
create policy "Post media readable only with post access" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'social-media-private' and (
      (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
        or exists (
          select 1 from public.posts p
          where p.media_url = name and p.author_id::text = (storage.foldername(name))[1]
        )
    )
  );

drop policy if exists "Users create posts with owned media" on public.posts;
create policy "Users create posts with uploaded media" on public.posts
  for insert with check (
    auth.uid() = author_id and (
      media_url is null or (
        (storage.foldername(media_url))[1] = auth.uid()::text
        and exists (
          select 1 from storage.objects o
          where o.bucket_id = 'social-media-private' and o.name = media_url
        )
      )
    )
  );

drop policy if exists "Users create stories with owned media" on public.stories;
create policy "Users create stories with uploaded media" on public.stories
  for insert with check (
    auth.uid() = author_id
    and (storage.foldername(media_url))[1] = auth.uid()::text
    and exists (
      select 1 from storage.objects o
      where o.bucket_id = 'story-media' and o.name = media_url
    )
  );
