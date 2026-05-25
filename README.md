# Financial Dashboard

A personal stock portfolio tracker with live market data, AI-powered stock analysis, and real dividend income tracking. Built with React + Vite on the frontend and a FastAPI/Python backend, deployed on Vercel.

## Features

**Market View**
- Search and track stocks and ETFs organised into custom watchlist folders
- Live price charts with multiple timeframes (1W, 1M, 6M, 1Y)
- Fundamental metrics: forward P/E, gross margin, FCF, revenue growth, war chest ratio
- AI analysis powered by Gemini — bull case, bear case, red flags, and a scored verdict (cached in Supabase to avoid redundant API calls)

**Portfolio View**
- Track holdings with buy price and share count across multiple portfolio folders
- Live P&L per position with green/red colouring, plus total portfolio balance
- Asset allocation donut chart
- Portfolio growth area chart with 1D / 1W / 1M / 3M / 1Y range selector
- Real dividend income from Yahoo Finance — annual, monthly, and daily figures — broken down by month and by stock
- USD ↔ THB currency toggle on all charts (live exchange rate from open.er-api.com)

**Auth & Storage**
- Email/password auth via Supabase
- Watchlists, portfolio folders, and holdings all persisted in Supabase

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Recharts |
| Backend | FastAPI, yfinance, Python |
| Database / Auth | Supabase (Postgres + Auth) |
| Deployment | Vercel (frontend + serverless Python API) |
| AI | Google Gemini 2.5 Flash |
| Exchange rates | open.er-api.com |
| Market data | Yahoo Finance via yfinance |

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- A Supabase project
- A Google Gemini API key

### 1. Clone the repo

```bash
git clone https://github.com/ppanturat/financial-dashboard.git
cd financial-dashboard
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### 5. Run locally

In one terminal, start the FastAPI backend:

```bash
uvicorn api.index:app --reload --port 8000
```

In another, start the frontend dev server:

```bash
npm run dev
```

The app will be at `http://localhost:5173`. The frontend automatically points API calls to `localhost:8000` in dev mode and to `/api` in production.

### 6. Deploy to Vercel

```bash
npm run build
vercel deploy
```

Set the same environment variables in your Vercel project settings. The `vercel.json` already routes `/api/*` to the Python backend.

## Project Structure

```
├── api/
│   └── index.py          # FastAPI backend (market data, dividends, AI analysis)
├── src/
│   ├── components/       # Shared UI components (Sidebar, Header, Modals, etc.)
│   ├── hooks/            # React hooks (auth, portfolio, folders, search, stock data)
│   ├── lib/              # API client, Supabase client, formatters, constants
│   ├── pages/
│   │   ├── AuthPage.jsx
│   │   ├── MarketView.jsx
│   │   └── PortfolioView.jsx
│   ├── App.jsx
│   └── App.css
├── requirements.txt
├── vercel.json
└── package.json
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/search/{query}` | Search for tickers (equities and ETFs) |
| `GET /api/data/{ticker}?timeframe=1M` | Price chart + fundamental metrics |
| `GET /api/bulk_prices?tickers=AAPL,VOO` | Latest prices for multiple tickers |
| `GET /api/dividends?tickers=AAPL,VOO` | Annual dividend per share + yield from Yahoo Finance |
| `GET /api/ai/{ticker}` | AI analysis via Gemini |
