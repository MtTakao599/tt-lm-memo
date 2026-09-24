-- LMメモ: ユーザー別の手書きメモ
-- 既存の memos / memo_photos / memo_master_items / memo_site_settings /
-- user_free_memos / profiles / Storage は変更しません。

create table if not exists public.handwritten_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '手書きメモ',
  drawing_data jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists handwritten_notes_user_updated_idx
  on public.handwritten_notes (user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists handwritten_notes_set_updated_at on public.handwritten_notes;
create trigger handwritten_notes_set_updated_at
before update on public.handwritten_notes
for each row
execute procedure public.set_updated_at();

alter table public.handwritten_notes enable row level security;

drop policy if exists handwritten_notes_select on public.handwritten_notes;
drop policy if exists handwritten_notes_insert on public.handwritten_notes;
drop policy if exists handwritten_notes_update on public.handwritten_notes;
drop policy if exists handwritten_notes_delete on public.handwritten_notes;

create policy handwritten_notes_select
  on public.handwritten_notes
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy handwritten_notes_insert
  on public.handwritten_notes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy handwritten_notes_update
  on public.handwritten_notes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy handwritten_notes_delete
  on public.handwritten_notes
  for delete
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.handwritten_notes from anon;
revoke all on public.handwritten_notes from public;
grant select, insert, update, delete on public.handwritten_notes to authenticated;
