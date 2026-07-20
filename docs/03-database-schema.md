# Database Schema

Postgres via Supabase. The full setup script is `local.sql` at the repo root — run it in the Supabase SQL editor to (re)create everything from scratch. It **drops and recreates every table**, so only run it against a fresh project or one you're okay wiping.

## Entity overview

```
auth.users (managed by Supabase)
   │
   └─ profiles (1:1, via trigger on signup)
       │
       ├─ folders ─────────────┬─ portfolio_items      (market view watchlists)
       │                       └─ (FK → global_metrics)
       │
       ├─ portfolio_folders ───┴─ portfolio_holdings    (actual investment portfolios)
       │
       ├─ follow_requests      (who follows whom, pending/accepted)
       └─ follows              (legacy table, see "known issues" below — not used by the app)

global_metrics                 (ticker lookup table, see "known issues")
```

**Two separate "list of tickers" systems, on purpose:** `folders`/`portfolio_items` are Market View *watchlists* (just tickers, no position data). `portfolio_folders`/`portfolio_holdings` are actual *investment portfolios* (ticker + shares + buy price). They're intentionally separate features, not duplicated code.

## Tables

### `profiles`

One row per user, created automatically by the `handle_new_user()` trigger on `auth.users` insert.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | same as `auth.users.id` |
| `username` | text | **no uniqueness constraint at the DB level** — see known issues |
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

`portfolio_items.ticker` also has an implicit dependency: the frontend upserts a bare `{ ticker }` row into `global_metrics` before inserting into `portfolio_items`, to satisfy a foreign key relationship that exists on some deployments (see `global_metrics` below).

### `portfolio_folders` + `portfolio_holdings`

Actual investment portfolios.

| Table | Key columns |
|---|---|
| `portfolio_folders` | `id` (int8 identity PK), `user_id` → `profiles`, `name`, `is_public` (bool) |
| `portfolio_holdings` | `id` (int8 identity PK), `folder_id` → `portfolio_folders`, `user_id` → `profiles`, `ticker`, `amount`, `buy_price` |

`is_public` is the flag that controls what shows up in other users' Network feed and holdings view.

### `global_metrics`

| Column | Type |
|---|---|
| `ticker` | varchar, PK |
| `revenue_yoy`, `fcf`, `war_chest_ratio` | numeric |
| `last_updated` | timestamptz |
| `ai_scan` | jsonb |

**This table is effectively a leftover.** It used to be populated by a nightly GitHub Actions job (`engine.py`) that has since been deleted, and none of its metric/AI columns are read by the current frontend — metrics are computed live from the FastAPI backend instead. The only thing that still touches this table is a bare `{ ticker }` upsert from `useFolders.js`, purely to satisfy the FK from `portfolio_items.ticker`. See "known issues" below for what to do about it.

### `follow_requests`

The social graph the app actually uses.

| Column | Type |
|---|---|
| `id` | int8 identity, PK |
| `requester_user_id`, `target_user_id` | uuid → `profiles` |
| `status` | text, `'pending'` \| `'accepted'` |
| unique on `(requester_user_id, target_user_id)` | prevents duplicate/spam requests |

### `follows`

A second, differently-shaped follow table (`follower_id`/`followee_id` instead of `requester_user_id`/`target_user_id`). **Not used anywhere in the current frontend** — every follow-related feature reads and writes `follow_requests` exclusively. Kept in the schema for now; see known issues.

## Row-Level Security (RLS)

RLS is enabled on every table. The general pattern: users have full `ALL` access to rows where `auth.uid() = user_id`, and narrower `SELECT`-only policies grant read access to followers for public content.

Notable policies:

- **`portfolio_folders`**: owners get full access; other authenticated users can `SELECT` a folder only if `is_public = true` AND there's an `accepted` row in `follow_requests` linking them to the owner.
- **`portfolio_holdings`**: same pattern, checked via a join back to `portfolio_folders`.
- **`global_metrics`**: `SELECT` is open to all authenticated users. `INSERT` is open with `WITH CHECK (true)` (no restriction on what values can be inserted). `UPDATE` is also open with `USING (true)` — see known issues, this is a real gap.

## Known issues / recommendations

These are documented here rather than silently fixed, since they involve either a live security decision or a data-model decision that's this project's to make:

1. **`global_metrics` UPDATE policy is wide open** (`FOR UPDATE TO authenticated USING (true)`). Since this table is global (shared across all users, not scoped per-user), any authenticated user can currently overwrite any row — including tickers other users are looking at. Recommended fix: drop the UPDATE policy entirely (nothing in the current app needs to update this table from the client) and restrict INSERT to only allow bare placeholder rows.
2. **`global_metrics`'s metric columns are dead weight.** Nothing populates `revenue_yoy`/`fcf`/`war_chest_ratio`/`ai_scan` anymore, and nothing reads them. Either drop the columns and keep the table as a lightweight "known tickers" lookup, or repurpose it if a caching layer comes back.
3. **`profiles.username` has no DB-level uniqueness.** It's currently enforced only in application code (`useAuth.js` does a check-then-insert), which is a race condition — two simultaneous signups could both pass the check. Recommended fix: a case-insensitive unique index, e.g. `CREATE UNIQUE INDEX ON profiles (lower(username)) WHERE username IS NOT NULL AND username <> ''`.
4. **`follows` table is unused.** Confirmed via a full-codebase grep — zero references anywhere in the frontend. Safe to drop once confirmed there's no external/future dependency on it.

## Indexes

```sql
idx_folders_user_id              ON folders(user_id)
idx_portfolio_items_folder_id    ON portfolio_items(folder_id)
idx_portfolio_folders_user_id    ON portfolio_folders(user_id)
idx_portfolio_holdings_folder_id ON portfolio_holdings(folder_id)
idx_follow_requests_lookup       ON follow_requests(requester_user_id, target_user_id, status)
```
