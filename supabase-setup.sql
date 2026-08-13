-- Restock Tracker — Supabase schema (pilot).
-- Paste this into the Supabase SQL Editor and run it once.
--
-- NOTE: RLS is enabled with fully-permissive policies for the `anon` role so the
-- Expo app (which ships the anon key) can read/write freely. This is fine for a
-- pilot but means anyone with the app can access the DB. Tighten before prod.

create table if not exists users (
  id         text primary key,
  name       text not null,
  role       text not null default 'staff',
  approved   boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists items (
  id         text primary key,
  name       text,
  category   text,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists categories (
  id         text primary key,
  label      text,
  days       int,
  color      text,
  tint       text,
  icon       text,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists anchors (
  category_id text primary key,
  anchor      text,
  updated_at  timestamptz not null default now()
);

create table if not exists checks (
  item_id    text primary key,
  cycle      text,
  checked    boolean not null default false,
  by_id      text,
  by_name    text,
  at         timestamptz,
  updated_at timestamptz not null default now()
);

-- Enable RLS + permissive anon policies on every table.
do $$
declare t text;
begin
  foreach t in array array['users','items','categories','anchors','checks'] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists anon_all on %I;', t);
    execute format(
      'create policy anon_all on %I for all to anon using (true) with check (true);', t);
  end loop;
end $$;
