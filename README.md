# Stock Dashboard

A personal finance web app for tracking stocks, managing investment portfolios, and following other investors. Built with **React (Vite)** on the frontend and a **FastAPI** backend that pulls market data from Yahoo Finance (`yfinance`).

📖 **For architecture, file map, database schema, design system, and the full build history, see the [wiki](./docs/README.md).** This README covers how to use the app and how to run it locally.

---

## ⚠️ Disclaimer

This project is a personal side project, **not a financial product**, and nothing in it is financial advice.

- **Not financial advice.** Prices, metrics, charts, and assessment cards are for informational and educational purposes only. Nothing here is a recommendation to buy, sell, or hold any security. Always do your own research and consult a licensed financial advisor before making investment decisions.
- **We don't generate market data — we just fetch it.** All prices, fundamentals, dividends, and news are pulled live from third-party sources (primarily Yahoo Finance via the `yfinance` library). This app has no control over that data's accuracy, completeness, or timeliness. Data can be delayed, incomplete, or wrong — verify anything important against your broker or an official source before acting on it.
- **No warranty.** This software is provided "as is" (see [LICENSE](./LICENSE)) with no guarantee of uptime, correctness, or fitness for any particular purpose. Use at your own risk.

---

## Getting an Account

Open the app and click "Create Account". Registration requires a name, a username, an email address, and a password. After registering, check the inbox for a confirmation link before signing in.

Forgot your password? Use the "Forgot password?" link on the sign-in form — a reset link is emailed to you, with a 60-second cooldown before it can be resent.

Once signed in, the app opens on the Market View. The sidebar on the left switches between **Market**, **Portfolio**, and **Network**.

---

## Market View

Research individual stocks and ETFs.

**Adding a ticker:** Use the search bar at the top to find a stock by name or symbol. Selecting a result adds it to the active folder and opens it immediately.

**Folders:** Tickers are organised into folders — think of them as watchlists. Create as many as needed from the sidebar. Folders can be renamed or deleted at any time. The tickers in the active folder appear as tabs in the header; click any tab to switch to that stock.

**Price chart:** The chart shows price history for the selected ticker. The timeframe buttons (1W, 1M, 6M, 1Y) zoom in or out.

**Key Metrics:** Below the chart, metrics are organised into a "Key" view (5 headline metrics) plus category pills — Financial Health, Profitability, Valuation, Growth, and Ownership & Sentiment. Click a pill to switch to that category; each metric has an "i" button explaining what it means and how to read it.

| Metric | Meaning |
|---|---|
| War Chest Ratio | Cash divided by total debt. Above 1.0 means the company holds more cash than it owes. |
| Free Cash Flow | Cash left over after running the business and investing in it. Positive is good. |
| Gross Margin | How much of each dollar of revenue the company keeps after cost of goods. Higher is better. |
| Forward P/E | The price paid per dollar of next year's expected earnings. Lower is cheaper. |
| Revenue YoY | Year-over-year revenue growth. Positive means the business is growing. |

Metrics are not shown for ETFs — the tile area will display "N/A" in that case.

**Assessment cards:** Below the metrics — a rule-based Metrics Summary and Quantitative Assessment (both driven by the same underlying scoring, so they always agree), a Technical Trigger card (RSI/SMA/volume breakout check, each criterion with its own explanation), and side-by-side Adoption Reality Check / Terminal Red Flag cards where applicable. All of this is informational only, not investment advice.

**ETFs:** Opening an ETF replaces the metrics section with a breakdown of the fund's top holdings.

**Company Profile:** A collapsible section at the bottom shows a plain-language description of the business.

---

## Portfolio View

Track holdings and see P&L.

**Creating a portfolio:** Open the sidebar and create a new portfolio folder. Multiple portfolios are supported — for example, one for long-term holdings and one for shorter-term trades.

**Adding holdings:** Click "Add Holding" inside a portfolio. Enter the ticker, the number of shares or units held, and the price paid. The app fetches the current live price automatically and calculates the gain or loss.

**Your Assets:** Each holding is a tappable row showing Asset / Value / P&L at a glance — tap it to expand Shares, Avg Cost, Live Price, and P&L%, plus a single **Trade** button (buy/sell is a toggle inside the trade modal), Edit, and Remove.

**Importing from Market View:** A watchlist built in Market View can be imported directly into a new portfolio folder. The tickers are pre-populated with zero amounts to be filled in with actual positions.

**Charts and breakdowns:** The portfolio view shows an allocation pie chart, a simulated growth chart over a selected time range (1D/1W/1M/3M/1Y), and per-holding P&L with the overall total.

**Currency:** Values can be displayed in USD or THB. The conversion rate is fetched live.

**Privacy:** Each portfolio folder can be set to public or private, toggled from the Network tab (see below).

---

## Network View

Your profile, connections, and activity feed all live on one tab.

**Profile card (top):** Avatar, display name, username, an Edit Profile button, and four stats — Following, Followers, Portfolios, Public. Tap **Following** or **Followers** to see that list in a popup; tap **Portfolios** to see and toggle each portfolio's public/private visibility.

**Finding people:** Use the search bar at the top of the page (same spot as the ticker search in Market View) to find other users by name or username and send a follow request.

**Incoming requests:** Pending follow requests appear near the top — accept or decline from there.

**Feed:** Below your profile, the activity feed shows trades from people you follow — both the price they traded at and the current live price with live P&L.

---

## Running Locally

### Prerequisites

- Node.js 18 or later
- Python 3.10+ (for the FastAPI backend)
- A Supabase project (for auth and database)

### Environment variables

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Install and start the frontend

```bash
npm install
npm run dev
```

### Install and start the backend

```bash
pip install -r requirements.txt
uvicorn api.index:app --reload --port 8000
```

The frontend expects the Python backend at `http://localhost:8000/api` in development. In production it proxies requests to `/api` on the same origin (see `vercel.json`).

### Database setup

Run `local.sql` in the Supabase SQL editor to create all tables, RLS policies, and indexes. Full schema documentation — including known issues and recommendations — is in the [wiki](./docs/03-database-schema.md).

### Backend endpoints

See the [API reference](./docs/06-api-reference.md) in the wiki for the full endpoint list.

All market data is sourced from Yahoo Finance via `yfinance` — see the [Disclaimer](#️-disclaimer) above.

---

## License

This project is licensed under the [MIT License](./LICENSE) — free to use, modify, and distribute, with no warranty. \
*Note this covers the code only; it does not grant any rights to the third-party market data the app fetches at runtime (that data belongs to its original providers, e.g. Yahoo Finance, and is subject to their own terms of use).*
