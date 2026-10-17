-- Run once in the existing project's Supabase SQL editor before publishing.
-- Transactional: existing invalid/overlapping dates cause a rollback, never deletion.
begin;
create extension if not exists btree_gist;
alter table public.dates add column if not exists alternative_date date;
alter table public.dates add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_date_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;
drop trigger if exists dates_updated_at on public.dates;
create trigger dates_updated_at before update on public.dates
for each row execute function public.touch_date_updated_at();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'dates_valid_times' and conrelid = 'public.dates'::regclass) then
    alter table public.dates add constraint dates_valid_times check (ends_at > starts_at);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dates_no_overlap' and conrelid = 'public.dates'::regclass) then
    alter table public.dates add constraint dates_no_overlap exclude using gist
      (tstzrange(starts_at, ends_at, '[)') with &&)
      where (status in ('proposed', 'accepted'));
  end if;
end $$;
create index if not exists dates_history_idx on public.dates (status, starts_at desc, id);
notify pgrst, 'reload schema';
commit;
