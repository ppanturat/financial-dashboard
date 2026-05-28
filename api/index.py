import os
import json
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
    stock = yf.Ticker(ticker)
    period_map = {"1W": "5d", "1M": "1mo", "6M": "6mo", "1Y": "1y"}
    interval_map = {"1W": "15m", "1M": "1d", "6M": "1d", "1Y": "1d"}
    
    hist = stock.history(period=period_map.get(timeframe, "1mo"), interval=interval_map.get(timeframe, "1d"))
    chart_data = [{"timestamp": d.isoformat(), "price": round(r['Close'], 2)} for d, r in hist.iterrows()] if not hist.empty else []

    info = stock.info
    quote_type = info.get('quoteType', 'EQUITY')
    
    metrics = None
    if quote_type != 'ETF':
        cash = info.get('totalCash', 0)
        debt = info.get('totalDebt', 0)
        wcr = round(cash / debt, 4) if debt and debt > 0 else (999 if cash else None)
        
        forward_pe = info.get('forwardPE')
        if forward_pe is not None and forward_pe < 0: forward_pe = None
            
        metrics = {
            "war_chest_ratio": wcr,
            "fcf": info.get('freeCashflow'),
            "gross_margin": info.get('grossMargins'),
            "forward_pe": forward_pe,
            "revenue_yoy": info.get('revenueGrowth')
        }

    return {
        "quoteType": quote_type,
        "chart": chart_data,
        "metrics": metrics,
        "description": info.get('longBusinessSummary', '')
    }

@app.get("/api/dividends")
def get_dividends(tickers: str):
    """
    Returns real annual dividend per share for each ticker using yfinance.
    Response: { "AAPL": { "dps": 0.96, "yield": 0.005 }, ... }
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    result = {}
    for t in ticker_list:
        try:
            stock = yf.Ticker(t)
            info = stock.info
            # dividendRate = declared annual cash dividend per share
            dps = info.get("dividendRate") or info.get("trailingAnnualDividendRate") or 0.0
            dy  = info.get("dividendYield") or 0.0
            result[t] = {"dps": round(float(dps), 4), "yield": round(float(dy), 6)}
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
            # Try fast_info first (cheapest)
            price = None
            try:
                price = stock.fast_info.get('last_price') or stock.fast_info.get('previousClose')
            except Exception:
                pass
            # Fallback: pull last 2 days of history and grab the Close
            if not price:
                hist = stock.history(period="2d", interval="1d")
                if not hist.empty:
                    price = float(hist['Close'].iloc[-1])
            # Fallback: info dict
            if not price:
                info = stock.info
                price = info.get('regularMarketPrice') or info.get('previousClose') or info.get('currentPrice')
            if price:
                result[t] = round(float(price), 2)
        except Exception:
            pass
    return result