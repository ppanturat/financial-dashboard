# Database Schema

Postgres via Supabase. The full setup script is `local.sql` at the repo root — run it in the Supabase SQL editor to (re)create everything from scratch. It **drops and recreates every table**, so only run it against a fresh project or one you're okay wiping. To apply schema changes to an *existing* database without losing data, use a targeted migration instead (see `schema_fixes_v2.sql` for the migration that brought an earlier deployment in line with what's documented here).

## Entity overview

```
auth.users (managed by Supabase)
   │
   └─ profiles (1:1, via trigger on signup)
       │
       ├─ folders ─────────── portfolio_items      (market view watchlists)
       │
       ├─ portfolio_folders ─ portfolio_holdings    (actual investment portfolios)
       │
       └─ follow_requests    (who follows whom, pending/accepted)

global_metrics                (lightweight ticker lookup, see below)
```

**Two separate "list of tickers" systems, on purpose:** `folders`/`portfolio_items` are Market View *watchlists* (just tickers, no position data). `portfolio_folders`/`portfolio_holdings` are actual *investment portfolios* (ticker + shares + buy price). They're intentionally separate features, not duplicated code.

## Tables

### `profiles`

One row per user, created automatically by the `handle_new_user()` trigger on `auth.users` insert.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | same as `auth.users.id` |
| `username` | text | case-insensitive unique index — see RLS/indexes below |
| `name` | text | |
| `display_name` | text | |
| `avatar_url` | text | |
| `portfolio_public` | bool, default false | legacy column, not read anywhere in current frontend code |
| `created_at` | timestamptz | |

### `folders` + `portfolio_items`

Market View watchlists.

| Table | Key columns |
|---|---|
| `folders` | `id` (uuid PK), `user_id` → `profiles`, `name` |
| `portfolio_items` | `id` (uuid PK), `folder_id` → `folders`, `user_id` → `profiles`, `ticker`, unique on `(folder_id, ticker)` |

The frontend upserts a bare `{ ticker }` row into `global_metrics` before inserting into `portfolio_items` (see `useFolders.js`) — this predates the current schema and is kept as a defensive no-op in case any deployment still has a foreign key from `portfolio_items.ticker` to `global_metrics.ticker`.

### `portfolio_folders` + `portfolio_holdings`

Actual investment portfolios.

| Table | Key columns |
|---|---|
| `portfolio_folders` | `id` (int8 identity PK), `user_id` → `profiles`, `name`, `is_public` (bool) |
| `portfolio_holdings` | `id` (int8 identity PK), `folder_id` → `portfolio_folders`, `user_id` → `profiles`, `ticker`, `amount`, `buy_price` |

`is_public` is the flag that controls what shows up in other users' Network feed and holdings view.

### `global_metrics`

```sql
CREATE TABLE public.global_metrics (
    ticker varchar PRIMARY KEY
);
```

Just a ticker lookup — nothing else. This table used to carry `revenue_yoy`/`fcf`/`war_chest_ratio`/`last_updated`/`ai_scan` columns, populated nightly by a since-deleted GitHub Actions job (`engine.py`). None of that data was read by the current frontend (metrics are computed live by the FastAPI backend instead), so the dead columns were dropped. The `SELECT`/`INSERT` policies remain open to all authenticated users since there's nothing left in this table worth restricting; there is deliberately **no UPDATE policy** (see RLS below).

### `follow_requests`

The social graph — the only follow table in the schema.

| Column | Type |
|---|---|
| `id` | int8 identity, PK |
| `requester_user_id`, `target_user_id` | uuid → `profiles` |
| `status` | text, `'pending'` \| `'accepted'` |
| unique on `(requester_user_id, target_user_id)` | prevents duplicate/spam requests |

An earlier, differently-shaped `follows` table (`follower_id`/`followee_id`) existed alongside this one but was never used by any frontend feature — confirmed via a full-codebase grep before removing it.

## Row-Level Security (RLS)

RLS is enabled on every table. The general pattern: users have full `ALL` access to rows where `auth.uid() = user_id`, and narrower `SELECT`-only policies grant read access to followers for public content.

Notable policies:

- **`portfolio_folders`**: owners get full access; other authenticated users can `SELECT` a folder only if `is_public = true` AND there's an `accepted` row in `follow_requests` linking them to the owner.
- **`portfolio_holdings`**: same pattern, checked via a join back to `portfolio_folders`.
- **`global_metrics`**: `SELECT` and `INSERT` are open to all authenticated users. There is **no UPDATE policy** — an earlier version had `FOR UPDATE TO authenticated USING (true)`, which let any logged-in user overwrite any row in this shared/global table (including tickers other users were actively looking at). Since the table now only holds a ticker column with nothing else worth protecting, the simplest fix was removing the ability to update rows at all rather than trying to scope it.

## Indexes

```sql
idx_folders_user_id              ON folders(user_id)
idx_portfolio_items_folder_id    ON portfolio_items(folder_id)
idx_portfolio_folders_user_id    ON portfolio_folders(user_id)
idx_portfolio_holdings_folder_id ON portfolio_holdings(folder_id)
idx_follow_requests_lookup       ON follow_requests(requester_user_id, target_user_id, status)
idx_profiles_username_unique     ON profiles(lower(username)) WHERE username IS NOT NULL AND username <> ''
```

The username index is case-insensitive and partial (excludes null/empty usernames) — it replaced an application-level check-then-insert in `useAuth.js` that was a race condition (two simultaneous signups could both pass the uniqueness check before either finished inserting).

## Resolved issues

Earlier drafts of this page listed four open issues against this schema. All four have since been applied to `local.sql` (and, for an already-provisioned database, via `schema_fixes_v2.sql`):

1. ~~`global_metrics` UPDATE policy wide open~~ — policy removed.
2. ~~`global_metrics` dead metric columns~~ — dropped, table is now ticker-only.
3. ~~`profiles.username` no DB-level uniqueness~~ — case-insensitive unique index added.
4. ~~`follows` table unused~~ — dropped.
