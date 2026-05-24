from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import requests

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
        data = res.json()
        quotes = [q for q in data.get('quotes', []) if q.get('quoteType') in ['EQUITY', 'ETF']]
        return {"results": quotes}
    except Exception as e:
        return {"results": []}

@app.get("/api/data/{ticker}")
def get_market_data(ticker: str, timeframe: str = "1M"):
    stock = yf.Ticker(ticker)
    
    # 1. format chart data with raw timestamps for React to format
    period_map = {"1W": "5d", "1M": "1mo", "6M": "6mo", "1Y": "1y"}
    interval_map = {"1W": "15m", "1M": "1d", "6M": "1d", "1Y": "1wk"}
    
    try:
        hist = stock.history(
            period=period_map.get(timeframe, "1mo"), 
            interval=interval_map.get(timeframe, "1d")
        )
        
        chart_data = []
        for date, row in hist.iterrows():
            if not row.isna()['Close']:
                # Pass the raw millisecond timestamp to the frontend
                chart_data.append({"timestamp": int(date.timestamp() * 1000), "price": round(row['Close'], 2)})
    except Exception:
        chart_data = []

    # 2. extract metrics & company description
    info = stock.info
    quote_type = info.get('quoteType', 'EQUITY')
    description = info.get('longBusinessSummary', 'No description available for this asset.')
    
    metrics = None
    ai_scan = None

    if quote_type != 'ETF':
        cash = info.get('totalCash', 0)
        debt = info.get('totalDebt', 0)
        
        if debt > 0:
            war_chest = cash / debt
        elif cash > 0:
            war_chest = 999.0
        else:
            war_chest = None
            
        metrics = {
            "war_chest_ratio": war_chest,
            "fcf": info.get('freeCashflow'),
            "revenue_yoy": info.get('revenueGrowth'),
            "gross_margin": info.get('grossMargins'),
            "forward_pe": info.get('forwardPE', info.get('trailingPE'))
        }
        
        # Strict Neutrality: Bear vs Bull & Terminal Red Flag Sweep
        flags = []
        bull_points = []
        bear_points = []

        if war_chest is not None:
            if war_chest < 0.5:
                flags.append("Critically low War Chest (Cash/Debt < 0.5). High survival risk.")
                bear_points.append("Balance sheet under severe stress.")
            elif war_chest > 1.5:
                bull_points.append("Fortress balance sheet covers debt easily.")
            else:
                bear_points.append("Moderate debt load restricts extreme capital flexibility.")
        
        if metrics['fcf'] is not None:
            if metrics['fcf'] < 0:
                flags.append("Negative Free Cash Flow. Cash burn is active.")
                bear_points.append("Operations are draining capital.")
            else:
                bull_points.append("Operations generate positive cash flow.")

        if metrics['forward_pe'] is not None:
            if metrics['forward_pe'] > 40:
                bear_points.append("Stretched valuation prices in near-perfection.")
            elif metrics['forward_pe'] < 15:
                bull_points.append("Trading at a relative value discount.")

        ai_scan = {
            "terminal_red_flags": flags if flags else ["None detected in primary metrics."],
            "bull_case": " ".join(bull_points) if bull_points else "No overwhelming bull signals in core metrics.",
            "bear_case": " ".join(bear_points) if bear_points else "No overwhelming bear signals in core metrics.",
            "neutral_verdict": "Proceed with caution. Validate thesis beyond core metrics." if flags else "Metrics are stable. Monitor valuation and broader macroeconomic trends."
        }

    return {
        "quoteType": quote_type,
        "chart": chart_data,
        "metrics": metrics,
        "description": description,
        "ai_scan": ai_scan
    }