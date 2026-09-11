-- LMメモ: ユーザー別自由メモ
-- 既存の memos / memo_photos / memo_master_items / memo_site_settings /
-- profiles / Storage は変更しません。

create table if not exists public.user_free_memos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_free_memos_set_updated_at on public.user_free_memos;
create trigger user_free_memos_set_updated_at
before update on public.user_free_memos
for each row
execute procedure public.set_updated_at();

alter table public.user_free_memos enable row level security;

drop policy if exists user_free_memos_select on public.user_free_memos;
drop policy if exists user_free_memos_insert on public.user_free_memos;
drop policy if exists user_free_memos_update on public.user_free_memos;
drop policy if exists user_free_memos_delete on public.user_free_memos;

create policy user_free_memos_select
  on public.user_free_memos
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy user_free_memos_insert
  on public.user_free_memos
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy user_free_memos_update
  on public.user_free_memos
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy user_free_memos_delete
  on public.user_free_memos
  for delete
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.user_free_memos from anon;
grant select, insert, update, delete on public.user_free_memos to authenticated;
