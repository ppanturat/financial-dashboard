# File Map

What every source file does and how it connects to the rest of the app.

## Entry points

| File | Purpose |
|---|---|
| `src/main.jsx` | React root. Wraps `<App />` in an error boundary that catches render crashes and shows a fallback instead of a blank white screen. |
| `src/App.jsx` | The whole app's state and routing lives here. Owns the active tab, active ticker/folder, and wires every hook to every page. Decides which top-level page renders: `AuthPage`, `SetNewPasswordPage`, or the main dashboard (`MarketView` / `PortfolioView` / `SocialView` behind `Sidebar` + `Header`). |
| `api/index.py` | The entire backend. One file, no routers/blueprints — every endpoint is a `@app.get(...)` function. |

## Pages (`src/pages/`)

One file per tab/screen.

| File | Renders when | Talks to |
|---|---|---|
| `AuthPage.jsx` | no session | `useAuth` (signIn/signUp/resetPassword) |
| `SetNewPasswordPage.jsx` | a password-recovery session is active (user clicked the reset-password email link) | `useAuth` (updatePassword) |
| `MarketView.jsx` | "Market View" tab | `useStockData`, `api.js` (chart/metrics/valuation/technicals), `assessmentEngine.js`, `metricsSummary.js` |
| `PortfolioView.jsx` | "Portfolio" tab | `usePortfolio`, `api.js` (bulk_prices, dividends) |
| `SocialView.jsx` | "Network" tab | `useSocial`, `usePortfolio` (for the Portfolios stat/privacy toggle), embeds `NetworkFeed` |
| `NetworkFeed.jsx` | rendered inside `SocialView`, not a standalone tab | `useSocial`'s `feed`/`feedHoldings` |
| `GlobalIntelligence.jsx` | "News Feed" tab | `api.js` (market-news) |

## Components (`src/components/`)

| File | Purpose |
|---|---|
| `Sidebar.jsx` | left nav, folder list, folder create/rename/delete/import UI. Collapsible (desktop) / off-canvas (mobile). |
| `Header.jsx` | top bar. Shows ticker tabs + ticker search on Market View, the `InvestorSearchBar` on Network, nothing ("clean") on News Feed. |
| `SearchBar.jsx` | ticker search dropdown (used by `Header` on Market View) |
| `InvestorSearchBar.jsx` | investor search dropdown (used by `Header` on Network) — searches `social.profiles` client-side, no debounce needed since the list is already loaded |
| `MetricsGrid.jsx` | the Key Metrics section — category-pill selector + metric tiles with info tooltips |
| `MetricsSummaryCard.jsx` | weighted 0–100 score card, one of the two "verdict" cards (see `metricsSummary.js`) |
| `RuleBasedAssessmentCard.jsx` | narrative sweep + Bear/Bull probability text, the other "verdict" card — shares its score/verdict with `MetricsSummaryCard` via `metricsSummary.js` so they can't disagree |
| `AdoptionRedFlagCards.jsx` | Adoption Reality Check + Terminal Red Flag Sweep cards, rendered side-by-side via `AssessmentModulesAB` |
| `TechnicalSignalCard.jsx` | RSI/SMA/volume breakout signal, each criterion with an info tooltip |
| `ValuationBadge.jsx` | small valuation context strip (fetches `/api/valuation/{ticker}`) |
| `StockNewsFeed.jsx` | ticker-specific news list, shown under the stock chart |
| `StockChart.jsx` | the price chart itself (Recharts line/area chart) |
| `PriceRow.jsx` | ticker chip/row with segment tags (uses `stockSegments.js`) |
| `HoldingModal.jsx` | add/edit a portfolio holding — ticker search + amount + buy price |
| `TradeModal.jsx` | buy/sell an existing holding, with a buy/sell toggle inside the modal |
| `FearGreedBanner.jsx` | market sentiment gauge, reads `/api/macro` |
| `ConfirmModal.jsx` | generic "are you sure?" confirmation dialog |
| `EmptyState.jsx` | generic empty-list placeholder |

## Hooks (`src/hooks/`)

Each hook owns one slice of state and the Supabase/API calls for it. `App.jsx` calls all of them at the top level and passes the results down as props.

| File | Owns |
|---|---|
| `useAuth.js` | session, sign in/up/out, password reset + recovery-session detection, password update |
| `useFolders.js` | Market View watchlist folders + tickers (`folders` / `portfolio_items` tables) |
| `usePortfolio.js` | portfolio folders + holdings (`portfolio_folders` / `portfolio_holdings` tables), privacy toggle |
| `useSocial.js` | profile, followers/following, follow requests, the public activity feed |
| `useSearch.js` | debounced ticker search (calls `/api/search/{query}`) |
| `useStockData.js` | fetches chart/metrics/description for the active ticker (calls `/api/data/{ticker}`) |
| `useModal.js` | small generic open/close modal state helper |

## Lib (`src/lib/`) — pure logic, no React

| File | Purpose |
|---|---|
| `api.js` | the only place that calls the FastAPI backend. One `get()` helper + one named method per endpoint. `BASE` auto-switches between local dev and production. |
| `supabaseClient.js` | creates the Supabase client, or a noop fallback if env vars are missing |
| `assessmentEngine.js` | rule-based engine: adoption check, terminal red flag sweep, the 5-point fundamental sweep, and the technical trigger (RSI/SMA/volume). No AI — every output is a deterministic threshold on the input metrics. |
| `metricsSummary.js` | the canonical 0–100 score + verdict, shared by `MetricsSummaryCard` and `RuleBasedAssessmentCard` so they never disagree. Exports `VERDICT_HEX` for consistent verdict coloring. |
| `stockSegments.js` | ticker → sector/segment tag lookup, used for the colored tag chips on `PriceRow` |
| `constants.js` | the 18 `METRIC_DEFS` (key, label, category, formatter, thresholds) that drive `MetricsGrid` |
| `formatters.js` | currency/number/date formatting helpers shared across the app |

## Styles (`src/styles/`)

Loaded via `@import` chain: `src/App.css` imports everything in order (tokens first, feature overrides last). See [Design System](./04-design-system.md) for the actual tokens.

| File | Covers |
|---|---|
| `variables.css` | design tokens: fonts, colors, spacing, radii (loaded first) |
| `base.css` | reset + base element styles |
| `layout.css` | page shell/grid structure |
| `sidebar.css` | imports `sidebar-v2.css` and `sidebar-additions.css` (collapsed-state styles) |
| `sidebar-v2.css`, `sidebar-additions.css` | sidebar-specific rules, split across two files for historical reasons |
| `header.css` | top bar, ticker tabs, ticker chips |
| `dashboard.css` | metric cards, verdict badges |
| `components.css` | shared small components (buttons, avatars, badges) |
| `modals.css` | modal overlay/card chrome |
| `auth.css` | login/signup/reset-password screens |
| `responsive.css` | breakpoints (1280 / 960 / 768 / 480 / 360px) |
| `new-features.css` | trade button colors and other recent additions — a catch-all for newer styles not yet sorted into the files above |

## Backend (`api/index.py`)

Single file. Roughly top-to-bottom:

1. Imports + FastAPI app + CORS (wide open — this backend serves no user-specific data, only public market data, so there's nothing to protect with strict CORS)
2. `_clean_text` / `_parse_news` — strips HTML from Yahoo's raw news feed, normalizes fields
3. `_calc_rsi` — shared RSI calculation (used by both `/api/macro`'s Fear & Greed gauge and available for reuse)
4. One `@app.get` function per endpoint — see [API Reference](./06-api-reference.md) for the full list

## Root-level files

| File | Purpose |
|---|---|
| `local.sql` | full database setup script — drops and recreates every table, RLS policy, and index. The source of truth for the schema (see [Database Schema](./03-database-schema.md)). |
| `vercel.json` | routing config, see [Architecture](./01-architecture.md) |
| `requirements.txt` | Python dependencies |
| `package.json` | Node dependencies + npm scripts |
