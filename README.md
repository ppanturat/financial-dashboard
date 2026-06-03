# Stock Dashboard

A personal finance web app for tracking stocks, managing investment portfolios, and following other investors.

---

## Getting an Account

Open the app and click "Create Account". Registration requires a name, a username, an email address, and a password. After registering, check the inbox for a confirmation link before signing in.

Once signed in, the app opens on the Market View. The sidebar on the left switches between Market, Portfolio, and Social.

---

## Market View

Research individual stocks and ETFs.

**Adding a ticker:** Use the search bar at the top to find a stock by name or symbol. Selecting a result adds it to the active folder and opens it immediately.

**Folders:** Tickers are organised into folders — think of them as watchlists. Create as many as needed from the sidebar. Folders can be renamed or deleted at any time. The tickers in the active folder appear as tabs in the header; click any tab to switch to that stock.

**Price chart:** The chart shows price history for the selected ticker. The timeframe buttons (1W, 1M, 6M, 1Y) zoom in or out.

**Key Metrics:** Below the chart, five tiles summarise the company's financial health. Each tile is colour-coded and has a "?" button that explains what the metric means and how to read it.

| Metric | What it tells you |
|---|---|
| War Chest Ratio | Cash divided by total debt. Above 1.0 means the company holds more cash than it owes. |
| Free Cash Flow | Cash left over after running the business and investing in it. Positive is good. |
| Gross Margin | How much of each dollar of revenue the company keeps after cost of goods. Higher is better. |
| Forward P/E | The price paid per dollar of next year's expected earnings. Lower is cheaper. |
| Revenue YoY | Year-over-year revenue growth. Positive means the business is growing. |

Metrics are not shown for ETFs — the tile area will display "N/A" in that case.

**Assessment cards:** Below the metrics, a rule-based written assessment summarises whether the numbers lean bullish or bearish. An AI scan below that offers a more detailed take. The AI result is cached, so the first load for any ticker may take a moment; subsequent loads are instant.

**ETFs:** Opening an ETF replaces the metrics section with a breakdown of the fund's top holdings.

**Company Profile:** A collapsible section at the bottom shows a plain-language description of the business.

---

## Portfolio View

Track holdings and see P&L.

**Creating a portfolio:** Open the sidebar and create a new portfolio folder. Multiple portfolios are supported — for example, one for long-term holdings and one for shorter-term trades.

**Adding holdings:** Click "Add Holding" inside a portfolio. Enter the ticker, the number of shares or units held, and the price paid. The app fetches the current live price automatically and calculates the gain or loss.

**Importing from Market View:** A watchlist built in Market View can be imported directly into a new portfolio folder. The tickers are pre-populated with zero amounts to be filled in with actual positions.

**Charts and breakdowns:** The portfolio view shows:
- An allocation pie chart showing how concentrated the portfolio is
- A simulated growth chart showing how portfolio value has moved over a selected time range (1D, 1W, 1M, 3M, 1Y)
- Per-holding P&L and the overall total at the top

**Currency:** Values can be displayed in USD or THB. The conversion rate is fetched live.

**Privacy:** Each portfolio folder can be set to public or private. Public portfolios are visible to approved followers on the Social tab.

---

## Social View

Connect with other users and see their shared portfolios.

**Finding people:** The Social tab lists other users on the platform, searchable by name or username.

**Following:** Click "Follow" on a profile to send a follow request. The request must be accepted before their public portfolios become visible. Pending requests can be withdrawn, and followed users can be unfollowed, at any time.

**Incoming requests:** Incoming follow requests appear in a "Pending Requests" section at the top of the Social tab. Accept or decline from there.

**Feed:** Once following someone who has at least one public portfolio, their holdings appear in the feed. Allocation and tickers are visible, but not cost basis or P&L.

**Profile:** Display name, username, and profile photo can all be edited from the top of the Social tab.

---

## Running Locally

### Prerequisites

- Node.js 18 or later
- A Supabase project (for auth and database)
- The Python backend running locally on port 8000

### Environment variables

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Install and start

```bash
npm install
npm run dev
```

The frontend expects the Python backend at `http://localhost:8000/api` in development. In production it proxies requests to `/api` on the same origin.

### Required Supabase tables

| Table | Purpose |
|---|---|
| `profiles` | Display name, username, avatar URL |
| `folders` | Market watchlist folders |
| `folder_tickers` | Tickers within each watchlist folder |
| `portfolio_folders` | Portfolio folders with public/private flag |
| `portfolio_holdings` | Individual holdings (ticker, amount, buy price) |
| `follow_requests` | Follow relationships with pending/accepted status |
| `global_metrics` | Cached financial metrics and AI scan results per ticker |

Enable row-level security on all tables. The `portfolio_folders.is_public` flag controls what followers can see.

### Backend endpoints

The Python backend must expose:

| Endpoint | Used for |
|---|---|
| `GET /api/search/:query` | Ticker search |
| `GET /api/data/:ticker?timeframe=` | Price chart, metrics, description |
| `GET /api/ai/:ticker` | AI scan (cached in Supabase after first call) |
| `GET /api/etf-holdings/:ticker` | ETF top holdings breakdown |
| `GET /api/dividends?tickers=` | Dividend data |
| `GET /api/bulk_prices?tickers=` | Live prices for portfolio holdings |
