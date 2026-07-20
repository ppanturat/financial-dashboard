# Architecture & Infrastructure

## The stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend framework | React 19 | function components + hooks only, no class components except the top-level error boundary |
| Build tool | Vite 8 | dev server + production bundler |
| Styling | Plain CSS (`src/styles/*.css`) + inline `style={{}}` for dynamic/one-off styling | no Tailwind, no CSS-in-JS, no CSS modules |
| Charts | Recharts | pie, line, bar, area charts throughout |
| Backend framework | FastAPI (Python) | single file, `api/index.py` |
| Market data | `yfinance` | scrapes/queries Yahoo Finance, no API key needed, no other data provider |
| Database | Supabase Postgres | also provides authentication |
| Auth | Supabase Auth | email/password, session stored client-side, RLS enforces access control server-side |
| Hosting | Vercel | see below |

## How a request flows

```
Browser (React app)
   │
   ├── Supabase JS client ──► Supabase (Postgres + Auth)
   │                          watchlists, portfolios, profiles, follows — all user data
   │
   └── fetch('/api/...') ───► FastAPI backend ──► yfinance ──► Yahoo Finance
                               live prices, charts, fundamentals, news — all market data
```

Two completely separate backends, and the frontend talks to both directly:

- **Supabase** owns anything that's *the user's own data*: watchlists, portfolio holdings, profile, follow relationships. The frontend calls Supabase directly via `@supabase/supabase-js` — there's no FastAPI endpoint that touches the database at all. Row-Level Security (RLS) policies in Postgres are the only thing enforcing who can read/write what (see [Database Schema](./03-database-schema.md)).
- **FastAPI** owns anything that's *market data*: prices, charts, fundamentals, news, valuation. It has no database connection and no persistent state — every request hits `yfinance` fresh. This means the backend is fully stateless and horizontally scalable, at the cost of being slower than a cached lookup and being at the mercy of Yahoo Finance's own rate limits.

## Hosting (Vercel)

`vercel.json` defines the routing:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.py" },
    { "source": "/((?!api/|assets/).*)", "destination": "/index.html" }
  ]
}
```

- Anything under `/api/*` is routed to `api/index.py`, which Vercel runs as a Python serverless function.
- Everything else falls through to `index.html` — this is what makes client-side routing work (there's no server-side router; `App.jsx` decides what to show based on React state, not URL paths).
- Static assets (`/assets/*`) are served directly from the Vite build output.

In local development this split is simulated by running two separate processes: `npm run dev` (Vite dev server, usually port 5173) and `uvicorn api.index:app --port 8000` (FastAPI). The frontend's `src/lib/api.js` auto-detects which environment it's in and points `BASE` at `http://localhost:8000/api` locally or `/api` in production.

## Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend (`src/lib/supabaseClient.js`) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | frontend | Supabase anon/public key — safe to expose client-side, RLS does the actual access control |

The backend currently needs no environment variables — `yfinance` requires no API key. `python-dotenv` is imported in `api/index.py` in case that changes later.

If Supabase env vars are missing, `supabaseClient.js` falls back to a **noop client** that returns real `Promise.resolve({ data: null, error })` shapes from every method instead of `undefined`/throwing — this means the app doesn't crash when misconfigured, it just fails auth gracefully with a clear error message instead of an infinite loading spinner.

## What's *not* in this stack

- **No AI/LLM APIs anywhere.** An earlier version of the app had an "AI scan" feature (a component called `AiScanCard`) that called an external AI API — it was removed. `assessmentEngine.js` and `metricsSummary.js` are both explicitly rule-based/deterministic, not AI-generated.
- **No server-side caching layer.** There used to be a nightly GitHub Actions job (`engine.py` + `.github/workflows/audit.yaml`) that pre-computed metrics into a `global_metrics` table. Both were removed — metrics are now computed live, per-request, in the FastAPI backend.
- **No test suite.** Verification currently relies on ESLint + `npm run build` (frontend) and `python -m py_compile` (backend) — there are no unit or integration tests.
