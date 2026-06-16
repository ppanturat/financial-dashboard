import os
import math
import requests
import yfinance as yf
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Utilities ─────────────────────────────────────────────────────────────────

SECTOR_MAP = {
    "Technology": "tech",
    "Communication Services": "comms",
    "Consumer Cyclical": "consumer",
    "Consumer Defensive": "consumer",
    "Financial Services": "finance",
    "Healthcare": "health",
    "Industrials": "industrial",
    "Basic Materials": "materials",
    "Real Estate": "realestate",
    "Energy": "energy",
    "Utilities": "utilities",
}

def normalise_sector(raw: str | None) -> str | None:
    if not raw:
        return None
    return SECTOR_MAP.get(raw, raw.lower().replace(" ", "_"))

def safe_value(val):
    """Ensures no NaN or Infinity values slip into the JSON response."""
    if val is None:
        return None
    try:
        f_val = float(val)
        if math.isnan(f_val) or math.isinf(f_val):
            return None
        return val
    except (ValueError, TypeError):
        return None


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/search/{query}")
def search_ticker(query: str):
    url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=8"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    try:
        res = requests.get(url, headers=headers, timeout=5)
        return {"results": [q for q in res.json().get('quotes', []) if q.get('quoteType') in ['EQUITY', 'ETF']]}
    except Exception:
        return {"results": []}


@app.get("/api/data/{ticker}")
def get_market_data(ticker: str, timeframe: str = "1M"):
    try:
        stock = yf.Ticker(ticker)
        period_map = {"1W": "5d", "1M": "1mo", "6M": "6mo", "1Y": "1y"}
        interval_map = {"1W": "15m", "1M": "1d", "6M": "1d", "1Y": "1d"}

        hist = stock.history(period=period_map.get(timeframe, "1mo"), interval=interval_map.get(timeframe, "1d"))
        
        chart_data = []
        if not hist.empty:
            # Strip out any rows where the closing price is missing (NaN)
            hist = hist.dropna(subset=['Close'])
            chart_data = [
                {"timestamp": d.isoformat(), "price": round(float(r['Close']), 2)} 
                for d, r in hist.iterrows()
            ]

        info = stock.info
        quote_type = info.get('quoteType', 'EQUITY')

        metrics = None
        if quote_type != 'ETF':
            cash = info.get('totalCash', 0)
            debt = info.get('totalDebt', 0)
            wcr = round(cash / debt, 4) if debt and debt > 0 else (999 if cash else None)

            forward_pe = info.get('forwardPE')
            if forward_pe is not None and forward_pe < 0:
                forward_pe = None

            trailing_pe = info.get('trailingPE')
            if trailing_pe is not None and trailing_pe < 0:
                trailing_pe = None

            metrics = {
                "war_chest_ratio": safe_value(wcr),
                "fcf": safe_value(info.get('freeCashflow')),
                "gross_margin": safe_value(info.get('grossMargins')),
                "operating_margin": safe_value(info.get('operatingMargins')),
                "net_margin": safe_value(info.get('profitMargins')),
                "forward_pe": safe_value(forward_pe),
                "trailing_pe": safe_value(trailing_pe),
                "ps_ratio": safe_value(info.get('priceToSalesTrailing12Months')),
                "pb_ratio": safe_value(info.get('priceToBook')),
                "revenue_yoy": safe_value(info.get('revenueGrowth')),
                "earnings_yoy": safe_value(info.get('earningsGrowth')),
                "debt_to_equity": safe_value(info.get('debtToEquity')),
                "current_ratio": safe_value(info.get('currentRatio')),
                "roe": safe_value(info.get('returnOnEquity')),
                "roa": safe_value(info.get('returnOnAssets')),
                "short_ratio": safe_value(info.get('shortRatio')),
                "insider_pct": safe_value(info.get('heldPercentInsiders')),
                "institution_pct": safe_value(info.get('heldPercentInstitutions')),
            }

        sector = normalise_sector(info.get('sector'))

        return {
            "quoteType": quote_type,
            "sector": sector,
            "chart": chart_data,
            "metrics": metrics,
            "description": info.get('longBusinessSummary', ''),
        }
    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        return {
            "quoteType": "EQUITY",
            "sector": None,
            "chart": [],
            "metrics": None,
            "description": "Data temporarily unavailable.",
        }

@app.get("/api/dividends")
def get_dividends(tickers: str):
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    result = {}
    for t in ticker_list:
        try:
            stock = yf.Ticker(t)
            info = stock.info
            dps = info.get("dividendRate") or info.get("trailingAnnualDividendRate") or 0.0
            dy  = info.get("dividendYield") or 0.0
            result[t] = {
                "dps": round(float(safe_value(dps) or 0.0), 4), 
                "yield": round(float(safe_value(dy) or 0.0), 6)
            }
        except Exception:
            result[t] = {"dps": 0.0, "yield": 0.0}
    return result

@app.get("/api/bulk_prices")
def get_bulk_prices(tickers: str):
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    result = {}
    for t in ticker_list:
        try:
            stock = yf.Ticker(t)
            price = None
            try:
                price = stock.fast_info.get('last_price') or stock.fast_info.get('previousClose')
            except Exception:
                pass
            if not price:
                hist = stock.history(period="2d", interval="1d")
                if not hist.empty:
                    hist = hist.dropna(subset=['Close'])
                    if not hist.empty:
                        price = float(hist['Close'].iloc[-1])
            if not price:
                info = stock.info
                price = info.get('regularMarketPrice') or info.get('previousClose') or info.get('currentPrice')
            
            clean_p = safe_value(price)
            if clean_p is not None:
                result[t] = round(float(clean_p), 2)
        except Exception:
            pass
    return result

@app.get("/api/bulk_sectors")
def get_bulk_sectors(tickers: str):
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    result = {}
    for t in ticker_list:
        try:
            info = yf.Ticker(t).info
            qt = info.get('quoteType', 'EQUITY')
            sector = normalise_sector(info.get('sector')) if qt != 'ETF' else None
            result[t] = {"quoteType": qt, "sector": sector}
        except Exception:
            result[t] = {"quoteType": "EQUITY", "sector": None}
    return result

@app.get("/api/etf-holdings/{ticker}")
def get_etf_holdings(ticker: str):
    try:
        stock = yf.Ticker(ticker)
        df = stock.funds_data.top_holdings 

        if df is None or df.empty:
            return []

        result = []
        for symbol, row in df.iterrows():
            weight = safe_value(row.get("Holding Percent", 0)) or 0
            result.append({
                "ticker": str(symbol),
                "weight": round(float(weight), 6),
                "name": str(row.get("Name", "")) or None,
            })

        result.sort(key=lambda x: x["weight"], reverse=True)
        return result[:25]

    except Exception:
        return []