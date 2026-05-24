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

# FAST ENDPOINT: Returns chart and numbers instantly
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
        
        # FIX: Catch and remove meaningless negative Forward P/E ratios
        forward_pe = info.get('forwardPE')
        if forward_pe is not None and forward_pe < 0:
            forward_pe = None
            
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

@app.get("/api/ai/{ticker}")
def get_ai_analysis(ticker: str):
    stock = yf.Ticker(ticker)
    info = stock.info
    
    cash = info.get('totalCash', 0)
    debt = info.get('totalDebt', 0)
    wcr = round(cash / debt, 4) if debt and debt > 0 else (999 if cash else None)
    
    forward_pe = info.get('forwardPE')
    if forward_pe is not None and forward_pe < 0:
        forward_pe = None
            
    metrics = {
        "war_chest_ratio": wcr,
        "fcf": info.get('freeCashflow'),
        "gross_margin": info.get('grossMargins'),
        "forward_pe": forward_pe,
        "revenue_yoy": info.get('revenueGrowth')
    }

    api_key = os.environ.get("GEMINI_API_KEY")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    prompt = f"""
    Act as an institutional quantitative analyst. Analyze these metrics for {ticker}: {json.dumps(metrics)}
    Return raw JSON schema ONLY (no markdown), keep the tone short and concise, but well-explained:
    {{
        "terminal_red_flags": ["List major risks here or state 'Clear'"],
        "bull_case": "Detail positive operational metrics.",
        "bear_case": "Detail vulnerabilities or valuation risks.",
        "neutral_verdict": "VERDICT (Score: X/100) — Well-explained summary."
    }}
    """

    try:
        res = requests.post(url, headers={"Content-Type": "application/json"}, json={"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"responseMimeType": "application/json"}}, timeout=10)
        res_data = res.json()
        if "error" in res_data: raise Exception(res_data["error"].get("message"))
        return json.loads(res_data['candidates'][0]['content']['parts'][0]['text'].replace("```json", "").replace("```", "").strip())
    except Exception as e:
        return {
            "terminal_red_flags": [f"Analysis Error: {str(e)}"],
            "bull_case": "Data temporarily unavailable.",
            "bear_case": "Data temporarily unavailable.",
            "neutral_verdict": "ERROR (Score: ?/100) — Failed to process AI generation."
        }