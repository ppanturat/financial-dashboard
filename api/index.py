from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import requests
import json
import g4f 

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
    
    # Format chart data
    period_map = {"1W": "5d", "1M": "1mo", "6M": "6mo", "1Y": "1y"}
    interval_map = {"1W": "15m", "1M": "1d", "6M": "1d", "1Y": "1d"}
    
    hist = stock.history(period=period_map.get(timeframe, "1mo"), interval=interval_map.get(timeframe, "1d"))
    chart_data = []
    if not hist.empty:
        for date, row in hist.iterrows():
            chart_data.append({
                "timestamp": date.isoformat(),
                "price": round(row['Close'], 2)
            })

    info = stock.info
    quote_type = info.get('quoteType', 'EQUITY')
    description = info.get('longBusinessSummary', '')
    
    metrics = None
    ai_scan = None

    if quote_type != 'ETF':
        cash = info.get('totalCash', 0)
        debt = info.get('totalDebt', 0)
        wcr = round(cash / debt, 4) if debt and debt > 0 else (999 if cash else None)
        
        metrics = {
            "war_chest_ratio": wcr,
            "fcf": info.get('freeCashflow'),
            "gross_margin": info.get('grossMargins'),
            "forward_pe": info.get('forwardPE'),
            "revenue_yoy": info.get('revenueGrowth')
        }

        prompt = f"""
        Act as a Wall Street analyst. Analyze these metrics for {ticker}: {json.dumps(metrics)}
        Return ONLY a raw JSON response (no markdown, no formatting) with exactly these keys:
        "terminal_red_flags": [array of strings detailing risks],
        "bull_case": "string with the positive case",
        "bear_case": "string with the negative case",
        "neutral_verdict": "VERDICT (Score: X/100) - short explanation"
        """

        try:
            # This reaches out to free LLM endpoints on the web automatically
            response = g4f.ChatCompletion.create(
                model=g4f.models.gpt_4o_mini, 
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Clean up the response in case the AI wraps it in ```json ... ``` markdown
            clean_response = response.replace("```json", "").replace("```", "").strip()
            ai_scan = json.loads(clean_response)
            
        except Exception as e:
            # Fallback just in case the free web endpoints are temporarily busy
            print("AI Error:", e)
            ai_scan = {
                "terminal_red_flags": ["Failed to connect to AI server."],
                "bull_case": "Data unavailable.",
                "bear_case": "Data unavailable.",
                "neutral_verdict": "ERROR (Score: ?/100) — AI evaluation temporarily offline."
            }

    return {
        "quoteType": quote_type,
        "chart": chart_data,
        "metrics": metrics,
        "description": description,
        "ai_scan": ai_scan
    }