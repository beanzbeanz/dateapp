create extension if not exists pgcrypto;

create table if not exists public.dates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  mode text not null default 'in-person',
  location text not null default '',
  note text not null default '',
  proposer text not null,
  recipient text not null,
  status text not null default 'proposed' check (status in ('proposed', 'accepted', 'declined')),
  response_message text not null default '',
  photo_url text,
  created_at timestamptz not null default now()
);

create index if not exists dates_time_range_idx on public.dates (starts_at, ends_at);
alter table public.dates enable row level security;

drop policy if exists "couple can read dates" on public.dates;
drop policy if exists "couple can create dates" on public.dates;
drop policy if exists "couple can update dates" on public.dates;

create policy "couple can read dates"
on public.dates for select to anon
using ((coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'x-couple-key') = 'dc5f4afe50e34a488c5b0058969f7c92');

create policy "couple can create dates"
on public.dates for insert to anon
with check ((coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'x-couple-key') = 'dc5f4afe50e34a488c5b0058969f7c92');

create policy "couple can update dates"
on public.dates for update to anon
using ((coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'x-couple-key') = 'dc5f4afe50e34a488c5b0058969f7c92')
with check ((coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'x-couple-key') = 'dc5f4afe50e34a488c5b0058969f7c92');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('date-photos', 'date-photos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "couple can upload date photos" on storage.objects;
create policy "couple can upload date photos"
on storage.objects for insert to anon
with check (
  bucket_id = 'date-photos'
  and (storage.foldername(name))[1] = 'dc5f4afe50e34a488c5b0058969f7c92'
);

insert into public.dates (
  title,
  starts_at,
  ends_at,
  mode,
  location,
  note,
  proposer,
  recipient,
  status
)
select
  'finish up paranorman?',
  '2026-10-09 23:00:00-04',
  '2026-10-10 01:00:00-04',
  'in-person',
  'ur house :3',
  E'what’s included:\n- drinks\n- snacks\n- cuddling\n- spooooooky stuff',
  'nick',
  'kalilu',
  'accepted'
where not exists (
  select 1 from public.dates
  where lower(title) = 'finish up paranorman?'
    and starts_at = '2026-10-09 23:00:00-04'
);
