# Pending database work

Status as of **2026-08-15**. Run this when you get a chance — it needs no app update.

## Why

The live Supabase project (`sfgfxsprdleavleeuyax`) still has only the five tables from
the first version of the schema. The three added later were never created:

| Table | Live DB | Used by |
| --- | --- | --- |
| `users`, `items`, `categories`, `anchors`, `checks` | present | restock tracker |
| `todos` | **missing** | purchase list **and** to-do screen |
| `todo_categories` | **missing** | to-do screen |
| `purchase_entries` | missing | nothing yet — see below |

Purchase-list entries are stored in `todos` as `p-`-prefixed rows (see `PURCHASE_TABLE`
in `src/remote.ts`), so a missing `todos` table breaks the purchase list and the to-do
screen at once. Every write returns
`PGRST205: Could not find the table 'public.todos' in the schema cache`, entries stay in
each phone's local storage, and nothing syncs between devices.

Every column the app writes to the five existing tables was verified present — the
missing tables are the only schema problem.

## Step 1 — create the missing tables

Supabase dashboard → SQL Editor → New query → paste `db/2026-08-15-todos.sql` → Run.
It is `create table if not exists` throughout, so it is safe to re-run and touches
nothing that already exists.

## Step 2 — verify

```sql
select tablename,
       (select count(*) from pg_policies p
         where p.tablename = t.tablename and p.policyname = 'anon_all') as anon_policy
from pg_tables t
where schemaname = 'public' and tablename in ('todos','todo_categories');
```

Expect both tables listed with `anon_policy = 1`. A `0` means RLS will block every
request — re-run the `do $$` block at the end of the migration.

## Step 3 — check the phones

Force-close and reopen the app on two phones (it also polls every 20s). Add something to
the purchase list on one; it should appear on the other within ~20 seconds.

If it does not, the header now shows a red "Not saved to the server" banner with the
actual error — that message is the thing to report.

## Step 4 — re-add purchase entries created before the fix

Entries added while `todos` was missing are in each phone's **local storage only**. The
app pushes an entry at the moment it is added or deleted and never retroactively
uploads, so those rows will keep showing on the one phone that made them and never sync.
Delete and re-add them once.

## Not doing: `purchase_entries`

`supabase-setup.sql` defines it, but the app does not use it — purchase entries ride in
`todos`. Creating it now just leaves an empty unused table. The migration onto it is
described in the `PURCHASE_TABLE` comment in `src/remote.ts` if it is ever wanted.

## Note: `categories` is empty, and that is correct

The five built-in frequencies (Daily, Every 4 Days, Weekly, Every 15 Days, Monthly) live
in code (`src/categories.ts`). That table only holds custom frequencies created in-app.
