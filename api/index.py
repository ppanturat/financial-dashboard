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

        # --- ADVANCED QUANTITATIVE ENGINE ---
        flags = []
        bull = []
        bear = []
        score = 50  # Start neutral 0-100

        fcf = metrics['fcf']
        pe = metrics['forward_pe']
        yoy = metrics['revenue_yoy']
        margin = metrics['gross_margin']

        # Cross-Reference 1: Liquidity & Runway
        if wcr is not None and fcf is not None:
            if fcf < 0 and wcr < 0.5:
                flags.append("SEVERE LIQUIDITY RISK: Burning cash while operating with a highly leveraged, cash-poor balance sheet. High risk of immediate shareholder dilution or debt restructuring.")
                score -= 25
            elif fcf < 0 and wcr > 1.5:
                bear.append("Operations are bleeding cash, but a massive war chest provides management a multi-year runway to execute a turnaround without facing immediate existential threats.")
                score -= 5
            elif fcf > 0 and wcr > 1.0:
                bull.append("Fortress Balance Sheet: The asset is an organic cash-printing machine sitting on excess reserves. High probability of upcoming share buybacks, dividend hikes, or M&A.")
                score += 15

        # Cross-Reference 2: Valuation vs. Growth (PEG Proxy)
        if pe is not None and yoy is not None:
            if pe > 40 and yoy < 0.10:
                flags.append("VALUATION DISCONNECT: Trading at an elite premium multiple (>40x P/E) while delivering sluggish, single-digit growth. This asset is priced for absolute perfection it is failing to deliver.")
                score -= 20
            elif pe < 15 and yoy > 0.15:
                bull.append("GARP (Growth at a Reasonable Price): The broader market is heavily mispricing this asset. It is sustaining double-digit top-line expansion while trading at a deep value discount.")
                score += 20
            elif pe > 40 and yoy >= 0.20:
                bull.append("Hyper-Growth Premium: Valuation is objectively stretched, but rapid >20% revenue expansion justifies a momentum premium as long as execution remains flawless.")
                bear.append("Priced for perfection. The extreme valuation multiple means any slight miss in future earnings will likely trigger a violent downside correction.")

        # Cross-Reference 3: Profitability Moat
        if margin is not None:
            if margin > 0.60:
                bull.append("Elite pricing power detected. Software-like gross margins provide the company immense flexibility to outspend competitors in R&D and marketing.")
                score += 10
            elif margin < 0.20:
                bear.append("Structurally weak business model. Razor-thin margins make the company highly susceptible to supply chain shocks or minor inflationary pressures.")
                score -= 10

        # Construct Final Verdict
        if len(flags) > 0:
            verdict = f"DANGER (Score: {score}/100) — Fundamental deterioration detected. Capital allocation here carries immense downside risk until red flags are resolved."
        elif score > 75:
            verdict = f"STRONG CONVICTION (Score: {score}/100) — Institutional metrics align perfectly. This asset exhibits highly scalable growth, excellent capital defense, and justifiable valuation."
        elif score < 40:
            verdict = f"WEAKNESS (Score: {score}/100) — Asset is facing significant structural headwinds. Better capital deployment opportunities exist elsewhere in the market."
        else:
            verdict = f"NEUTRAL (Score: {score}/100) — Company exhibits a muddy balance of decent and concerning metrics. Macro-economic factors will dictate future price action."

        ai_scan = {
            "terminal_red_flags": flags if flags else ["Balance sheet cleared. No immediate existential liquidity or debt threats detected."],
            "bull_case": " ".join(bull) if bull else "Lacks distinct fundamental upside catalysts.",
            "bear_case": " ".join(bear) if bear else "No glaring operational liabilities found in current reporting.",
            "neutral_verdict": verdict
        }

    return {
        "quoteType": quote_type,
        "chart": chart_data,
        "metrics": metrics,
        "description": description,
        "ai_scan": ai_scan
    }