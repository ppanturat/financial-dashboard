# Financial Dashboard

A personal stock portfolio tracker with live market data, AI-powered stock analysis, and real dividend income tracking.

**[→ Try it live](https://financial-dashboard-six-liart.vercel.app)** — just create a free account, no setup needed.

## What it does

**Market View** — search and track stocks/ETFs in custom watchlists. Live price charts, fundamentals (P/E, FCF, gross margin, revenue growth), and an AI analysis powered by Gemini with a bull case, bear case, and scored verdict.

**Portfolio View** — log your holdings and track real P&L against live prices. Includes a growth chart (1D–1Y), real dividend income pulled from Yahoo Finance broken down by month and by stock, and a USD ↔ THB currency toggle throughout.

## Tech stack

React + Vite · FastAPI · yfinance · Supabase · Gemini 2.5 Flash · Vercel

## Self-hosting

If you'd rather run your own instance:

```bash
git clone https://github.com/ppanturat/financial-dashboard.git
cd financial-dashboard
npm install
pip install -r requirements.txt
```

Create a `.env` with:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
```

Then:

```bash
# backend
uvicorn api.index:app --reload --port 8000

# frontend
npm run dev
```

Deploy to Vercel with `vercel deploy` — `vercel.json` already handles API routing.
