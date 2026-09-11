-- LMメモ: マスタ共通保存
-- 既存の memos / memo_photos / profiles / Storage は変更しません。

create table if not exists public.memo_master_items (
  id uuid primary key default gen_random_uuid(),
  mansion_key text not null,
  type text not null,
  name text not null,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  treat_as_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memo_master_items_type_check
    check (type in ('building', 'floor', 'place', 'category', 'status')),
  constraint memo_master_items_unique_name
    unique (mansion_key, type, name)
);

create index if not exists memo_master_items_mansion_type_sort_idx
  on public.memo_master_items (mansion_key, type, sort_order);

create table if not exists public.memo_site_settings (
  mansion_key text primary key,
  use_building boolean not null default true,
  use_floor boolean not null default true,
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

drop trigger if exists memo_master_items_set_updated_at on public.memo_master_items;
create trigger memo_master_items_set_updated_at
before update on public.memo_master_items
for each row
execute procedure public.set_updated_at();

drop trigger if exists memo_site_settings_set_updated_at on public.memo_site_settings;
create trigger memo_site_settings_set_updated_at
before update on public.memo_site_settings
for each row
execute procedure public.set_updated_at();

alter table public.memo_master_items enable row level security;
alter table public.memo_site_settings enable row level security;

drop policy if exists memo_master_items_select on public.memo_master_items;
drop policy if exists memo_master_items_insert on public.memo_master_items;
drop policy if exists memo_master_items_update on public.memo_master_items;
drop policy if exists memo_master_items_delete on public.memo_master_items;

create policy memo_master_items_select
  on public.memo_master_items
  for select
  to authenticated
  using (true);

create policy memo_master_items_insert
  on public.memo_master_items
  for insert
  to authenticated
  with check (true);

create policy memo_master_items_update
  on public.memo_master_items
  for update
  to authenticated
  using (true)
  with check (true);

create policy memo_master_items_delete
  on public.memo_master_items
  for delete
  to authenticated
  using (true);

drop policy if exists memo_site_settings_select on public.memo_site_settings;
drop policy if exists memo_site_settings_insert on public.memo_site_settings;
drop policy if exists memo_site_settings_update on public.memo_site_settings;
drop policy if exists memo_site_settings_delete on public.memo_site_settings;

create policy memo_site_settings_select
  on public.memo_site_settings
  for select
  to authenticated
  using (true);

create policy memo_site_settings_insert
  on public.memo_site_settings
  for insert
  to authenticated
  with check (true);

create policy memo_site_settings_update
  on public.memo_site_settings
  for update
  to authenticated
  using (true)
  with check (true);

create policy memo_site_settings_delete
  on public.memo_site_settings
  for delete
  to authenticated
  using (true);

grant select, insert, update, delete on public.memo_master_items to authenticated;
grant select, insert, update, delete on public.memo_site_settings to authenticated;

create or replace function public.replace_memo_master_items(
  p_mansion_key text,
  p_items jsonb,
  p_use_building boolean default true,
  p_use_floor boolean default true
)
returns void
language plpgsql
security invoker
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_mansion_key is null or length(trim(p_mansion_key)) = 0 then
    raise exception 'invalid mansion_key';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid items';
  end if;

  insert into public.memo_site_settings (mansion_key, use_building, use_floor)
  values (p_mansion_key, p_use_building, p_use_floor)
  on conflict (mansion_key) do update
    set use_building = excluded.use_building,
        use_floor = excluded.use_floor,
        updated_at = now();

  delete from public.memo_master_items
  where mansion_key = p_mansion_key;

  insert into public.memo_master_items (
    mansion_key,
    type,
    name,
    sort_order,
    enabled,
    treat_as_done
  )
  select
    p_mansion_key,
    item->>'type',
    item->>'name',
    coalesce((item->>'sort_order')::integer, 0),
    coalesce((item->>'enabled')::boolean, true),
    coalesce((item->>'treat_as_done')::boolean, false)
  from jsonb_array_elements(p_items) as item;

  if exists (
    select 1
    from public.memo_master_items
    where mansion_key = p_mansion_key
      and type not in ('building', 'floor', 'place', 'category', 'status')
  ) then
    raise exception 'invalid master type';
  end if;
end;
$$;

grant execute on function public.replace_memo_master_items(text, jsonb, boolean, boolean)
  to authenticated;
