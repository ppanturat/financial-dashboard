# Features

Screen-by-screen detail on how each part of the app actually works. For a user-facing version of this, see the [README](../README.md); this page goes one layer deeper into the *why* and *how*.

## Market View

The research screen. State lives in `useFolders` (which folder/ticker is active) and `useStockData` (fetched chart/metrics/description for the active ticker).

**Key Metrics** (`MetricsGrid.jsx`) — 18 metrics total, defined in `constants.js`, each tagged with a `category` (Financial Health / Profitability / Valuation / Growth / Ownership & Sentiment) and 5 of them flagged `primary`. The UI defaults to a "Key" pill showing the 5 primary metrics; clicking any other category pill swaps the visible set to that category only. This replaced an earlier "show 5, expand to see all 18 stacked" design — the pill approach keeps only one small group on screen at a time instead of ever showing all 18 at once.

**Scoring — two cards, one source of truth.** `MetricsSummaryCard` and `RuleBasedAssessmentCard` both display a score and verdict for the same 5 core metrics (war chest ratio, FCF, gross margin, forward P/E, revenue YoY). They used to run two *independent* scoring formulas and could disagree on the same ticker — this was a real bug, fixed by making `metricsSummary.js`'s `generateMetricsSummary()` the single canonical source; `RuleBasedAssessmentCard` now calls it directly for its score/verdict/color, and only adds its own narrative "sweep" bullet points and Bear/Bull probability text on top.

**Technical Trigger** (`TechnicalSignalCard.jsx`) — a separate, purely technical (not fundamental) signal: `evaluateBuySignal(ticker)` returns `true` only if all three hold:
1. 14-day RSI (Wilder-smoothed) crossed from below 30 to above 30 within the last 3 trading days
2. current price is above the 50-day SMA
3. today's volume is at least 110% of the trailing 20-day average

Backed by `GET /api/technicals/{ticker}` (50 days of close/volume) and computed client-side in `assessmentEngine.js`. Each of the 3 criteria has its own info tooltip explaining what it measures and what counts as good/bad.

**Adoption Reality Check / Terminal Red Flag Sweep** (`AdoptionRedFlagCards.jsx`) — two independent rule-based checks (revenue growth vs R&D spend; cash runway vs FCF burn), rendered side-by-side via `AssessmentModulesAB` with `align-items: stretch` so both cards match height regardless of text length. Either, both, or neither can trigger depending on the ticker.

**Fear & Greed gauge** (`FearGreedBanner.jsx`) — a simplified two-factor sentiment index using VOO (S&P 500 ETF) as a market proxy: 60% weight on deviation from the 200-day moving average, 40% weight on 14-day RSI. This is *not* CNN's actual Fear & Greed Index (which uses 7 factors including VIX, put/call ratio, junk bond spreads) — it's a lightweight approximation with the same 0–100 scale and similar labels. The backend computes one authoritative `label` (Extreme Fear → Extreme Greed, plus Neutral-Bullish/Neutral-Bearish for the middle band) and the frontend displays that same label everywhere in the widget — this used to be computed twice (once server-side with override logic, once client-side from raw score buckets) and could show two different zone labels in the same widget; fixed by removing the duplicate client-side computation.

## Portfolio View

State lives in `usePortfolio`. Each portfolio folder holds tickers with `amount` (shares) and `buy_price`.

**Your Assets** — each holding is a click-to-expand row. Collapsed: ticker, current value, P&L. Expanded: shares, avg cost, live price, P&L%, and three actions — **Trade** (opens `TradeModal`, which has an internal buy/sell toggle — there used to be separate Buy/Sell buttons, but the `side` argument was never actually wired into the modal, so they were functionally identical; consolidated into one button), **Edit**, **Remove**. This replaced an actual `<table>` with a 560px `min-width` inside a horizontally-scrolling wrapper — a genuine mobile usability bug, not just a style preference.

**Currency conversion** — USD/THB toggle, live exchange rate fetched and cached, applied to every displayed number via a shared `fmt()` helper.

**Charts** — allocation pie chart (current holdings, live-priced), a simulated growth chart (cost basis vs current value over a selectable range), and a dividend income chart (calls `GET /api/dividends`).

## Network View

One merged tab — this used to be two separate tabs ("Network" for the activity feed, "Profile" for follow lists + settings), combined into one page (`SocialView.jsx`) because they were really the same feature split across two clicks.

**Profile header** — avatar, name, username, Edit Profile button, and 4 stats. Following/Followers/Portfolios are all click-to-reveal — clicking any of them opens a `ListModal` with that specific list, rather than showing all three lists inline at all times (which was the original, much longer layout). Portfolios opens the same privacy-toggle UI that used to be its own always-visible card.

**Investor search** moved from an inline card into the top header bar (`InvestorSearchBar.jsx`), in the same visual slot the ticker search occupies on Market View — searches the already-loaded `profiles` list client-side (no debounce needed, unlike ticker search which hits the backend).

**Feed** (`NetworkFeed.jsx`) — shows recent buy/sell activity from people you follow. Each item shows the price the trade happened at (top-right, labeled "bought at"/"sold at") and the live price + live P&L (next to each other, in the detail row) — these two used to be swapped (live price was top-right, trade price wasn't shown at all), fixed so users can actually compare entry price against current price.

## Authentication

`AuthPage.jsx` handles sign in, sign up (with email confirmation), and the full password-reset flow:

1. "Forgot password?" on the login form → email input → `onResetPassword` (Supabase `resetPasswordForEmail`)
2. Confirmation screen with a 60-second countdown before "Resend" is enabled
3. User clicks the emailed link → Supabase establishes a **recovery session** and fires a `PASSWORD_RECOVERY` auth event
4. `useAuth.js` listens for that event and flips a `passwordRecovery` flag; `App.jsx` checks this flag *before* rendering the normal dashboard and shows `SetNewPasswordPage.jsx` instead — this step is easy to miss (a recovery session looks like a normal logged-in session otherwise) and was specifically implemented to close that gap
5. New password + confirm, submit, success screen, back to normal sign-in

## News Feed

`GlobalIntelligence.jsx` shows market-wide news ranked into three tiers (major wire services → analyst/opinion outlets → everything else), backed by `GET /api/market-news`. `StockNewsFeed.jsx` (embedded in Market View) shows ticker-specific news via `GET /api/news/{ticker}`.

Both rely on the backend's `_clean_text()` helper to strip HTML tags/entities from Yahoo's raw news payload before it reaches the frontend — Yahoo's feed embeds real HTML in titles/summaries, and without stripping it the tags render as literal visible text on screen.
