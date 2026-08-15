-- Add the two tables the live database is missing.
--
-- Context and verification steps: see DB-TODO.md at the repo root.
--
-- `todos` backs BOTH the to-do screen and the restock purchase list (purchase entries
-- are the `p-`-prefixed rows — see PURCHASE_TABLE in src/remote.ts). Without it, both
-- features fail every read and write with PGRST205 and never sync between devices.
--
-- Safe to re-run: `create table if not exists` throughout, and the policy block drops
-- before it creates. Nothing already in the database is touched.

create table if not exists todo_categories (
  id         text primary key,
  label      text,
  color      text,
  tint       text,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists todos (
  id         text primary key,
  title      text,
  category   text,
  done       boolean not null default false,
  by_id      text,
  by_name    text,
  at         timestamptz,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now()
);

-- RLS with permissive anon policies, matching every other table in this project. The
-- app ships the publishable (anon) key, so without these policies every request is
-- rejected and the symptom looks identical to the table being absent.
do $$
declare t text;
begin
  foreach t in array array['todo_categories','todos'] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists anon_all on %I;', t);
    execute format(
      'create policy anon_all on %I for all to anon using (true) with check (true);', t);
  end loop;
end $$;
