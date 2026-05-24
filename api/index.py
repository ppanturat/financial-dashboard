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
    
    # 1. format chart data
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
        # Safely extract metrics
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

        # scoring
        score = 50.0
        flags = []
        bull = []
        bear = []

        # Safely parse metrics for math logic
        war_chest = metrics.get('war_chest_ratio')
        fcf = metrics.get('fcf')
        gross_margin = metrics.get('gross_margin')
        forward_pe = metrics.get('forward_pe')
        rev_yoy = metrics.get('revenue_yoy')

        # 1. LIQUIDITY & SOLVENCY (War Chest Ratio) - Checks Debt Risk
        if war_chest is not None:
            if war_chest < 0.5:
                flags.append("High Debt Risk: The company has twice as much debt as cash. If revenues drop, they may struggle to survive without taking on bad loans or diluting shareholders.")
                score -= 15
            elif war_chest >= 1.5:
                bull.append("Bulletproof Balance Sheet: With significantly more cash than debt, the company can easily survive economic downturns, buy back stock, or acquire competitors.")
                score += 12
            elif war_chest >= 1.0:
                score += 5

        # 2. CASH GENERATION (Free Cash Flow) - Checks Operational Health
        if fcf is not None:
            if fcf < 0:
                # COMPLEXITY: Cross-reference cash burn with available cash reserves
                if war_chest is not None and war_chest < 1.0:
                    flags.append("Cash Burn Crisis: The business is losing money and doesn't have the cash reserves to sustain this for long.")
                    score -= 20
                else:
                    bear.append("Negative Cash Flow: The company is currently spending more cash than it makes. They have the reserves to survive, but it adds risk.")
                    score -= 5
            elif fcf > 1_000_000_000:
                bull.append("Massive Cash Generator: The business produces billions in excess cash, proving its core operations are highly lucrative and self-sustaining.")
                score += 15
            elif fcf > 0:
                score += 5

        # 3. PROFITABILITY & PRICING POWER (Gross Margin) - Checks Business Model
        if gross_margin is not None:
            if gross_margin < 0.20:
                bear.append("Low Profit Margins: The company keeps very little profit from what it sells. This leaves almost no room for error if costs go up.")
                score -= 10
            elif gross_margin > 0.50:
                bull.append("Strong Pricing Power: High profit margins show that customers are willing to pay a premium for their products, making the business highly efficient.")
                score += 12
            elif gross_margin > 0.30:
                score += 5

        # 4. VALUATION (Forward P/E) - Checks if it's a Trap or a Deal
        if forward_pe is not None:
            if forward_pe > 40:
                # COMPLEXITY: High P/E is only a trap if growth is low
                if rev_yoy is not None and rev_yoy < 0.10:
                    bear.append("Overvalued: The stock is extremely expensive (P/E over 40), but the company isn't growing fast enough to justify this premium price.")
                    score -= 15
                else:
                    bear.append("Priced for Perfection: The stock is expensive. While growth is good, any slight miss in future earnings could cause a sharp drop in the stock price.")
                    score -= 5
            elif forward_pe < 15 and forward_pe > 0:
                bull.append("Deep Value: The stock is trading at a bargain price compared to the earnings it is expected to generate next year.")
                score += 15
            else:
                score += 5

        # 5. GROWTH (Revenue YoY) - Checks Market Demand
        if rev_yoy is not None:
            if rev_yoy < 0:
                flags.append("Shrinking Business: Revenues are actively declining compared to last year. The company is losing market share or facing a severe downturn.")
                score -= 15
            elif rev_yoy > 0.20:
                bull.append("Rapid Growth: Sales are growing by over 20% year-over-year, showing that there is massive and expanding demand for what they offer.")
                score += 15
            elif rev_yoy > 0.05:
                score += 5

        # Cap the final score cleanly between 1 and 99
        score = int(max(1, min(99, score)))

        # Final Verdict Generation (Clear, accessible language)
        if len(flags) > 0 or score < 40:
            verdict = f"HIGH RISK (Score: {score}/100) — This company shows serious financial warning signs, such as heavy debt, shrinking sales, or cash burn. It is a highly risky asset right now."
        elif score >= 80:
            verdict = f"STRONG HEALTH (Score: {score}/100) — The company has excellent financials. A combination of strong cash flow, healthy growth, and a solid balance sheet makes this a highly resilient business."
        elif score >= 60:
            verdict = f"STABLE / POSITIVE (Score: {score}/100) — The business is generally healthy and growing, though it may have a few minor weaknesses or a slightly expensive valuation."
        else:
            verdict = f"NEUTRAL (Score: {score}/100) — The financials are a mixed bag. There are some decent metrics, but they are offset by notable risks or stagnation."

        ai_scan = {
            "terminal_red_flags": flags if flags else ["No immediate threats. The company has manageable debt and avoids critical cash burn."],
            "bull_case": " ".join(bull) if bull else "The company is stable but lacks any standout traits for aggressive growth or deep value.",
            "bear_case": " ".join(bear) if bear else "No major operational weaknesses detected at current reporting levels.",
            "neutral_verdict": verdict
        }