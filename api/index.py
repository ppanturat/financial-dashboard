import os
import json
import requests
import yfinance as yf
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure the real AI
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

@app.get("/api/search/{query}")
def search_ticker(query: str):
    url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=8"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    try:
        res = requests.get(url, headers=headers, timeout=5)
        data = res.json()
        quotes = [q for q in data.get('quotes', []) if q.get('quoteType') in ['EQUITY', 'ETF']]
        return {"results": quotes}
    except Exception:
        return {"results": []}

@app.get("/api/data/{ticker}")
def get_market_data(ticker: str, timeframe: str = "1M"):
    stock = yf.Ticker(ticker)
    
    # 1. Format chart data
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

        # 2. Feed data to Gemini for real analysis
        prompt = f"""
        Act as a professional institutional quantitative analyst. Analyze the following financial metrics for {ticker}:
        {json.dumps(metrics)}
        
        Provide a concise, highly accurate assessment of the asset's financial health.
        You MUST return your response in raw JSON format (no markdown formatting, no code blocks) using this exact schema:
        {{
            "terminal_red_flags": ["List any major liquidity/debt/cash burn threats here, or state 'Clear'"],
            "bull_case": "Detail the core positive operational metrics.",
            "bear_case": "Detail the core vulnerabilities or valuation risks.",
            "neutral_verdict": "VERDICT (Score: X/100) — A short, well-explained summary of their overall health."
        }}
        """

        try:
            # Force the model to output JSON
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            ai_scan = json.loads(response.text)
        except Exception as e:
            print("Gemini API Error:", e)
            ai_scan = {
                "terminal_red_flags": ["Failed to connect to AI server."],
                "bull_case": "Data unavailable.",
                "bear_case": "Data unavailable.",
                "neutral_verdict": "ERROR (Score: ?/100) — AI evaluation failed to process."
            }

    return {
        "quoteType": quote_type,
        "chart": chart_data,
        "metrics": metrics,
        "description": description,
        "ai_scan": ai_scan
    }