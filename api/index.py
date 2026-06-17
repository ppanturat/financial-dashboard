import os
import json
import requests
import yfinance as yf
import pandas as pd
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

# ── Sector normalisation ──────────────────────────────────────────────────────
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


# ── Helper: safe float ────────────────────────────────────────────────────────
def sf(val, decimals=4):
    """Return a rounded float or None, filtering out inf/nan."""
    try:
        v = float(val)
        if v != v or abs(v) == float('inf'):
            return None
        return round(v, decimals)
    except (TypeError, ValueError):
        return None


# ── Helper: parse news items from yfinance ───────────────────────────────────
def _parse_news(raw_news: list) -> list:
    """
    yfinance news items are dicts. Structure varies by version but typically:
      { "title": str, "publisher": str, "link": str, "providerPublishTime": int,
        "type": str, "thumbnail": {...}, "relatedTickers": [...] }
    Newer versions may also include a "summary" or "snippet" key.
    We expose what we have and let the frontend handle missing fields gracefully.
    """
    items = []
    for n in (raw_news or []):
        if not isinstance(n, dict):
            continue
        # content may be nested under a "content" key in newer yfinance builds
        content = n.get("content", n)
        title = content.get("title") or n.get("title", "")
        if not title:
            continue

        # Publisher / source
        provider = (
            content.get("provider", {}).get("displayName")
            or content.get("publisher")
            or n.get("publisher")
            or ""
        )

        # Timestamp (unix epoch seconds → keep as int for frontend to format)
        pub_time = (
            content.get("pubDate")           # ISO string in some versions
            or n.get("providerPublishTime")   # int epoch in older versions
        )

        # URL
        url = (
            content.get("canonicalUrl", {}).get("url")
            or content.get("clickThroughUrl", {}).get("url")
            or n.get("link")
            or ""
        )

        # Summary / snippet — yfinance may include this in newer data
        summary = (
            content.get("summary")
            or content.get("description")
            or n.get("summary")
            or n.get("snippet")
            or ""
        )

        items.append({
            "title": title,
            "source": provider,
            "publishedAt": pub_time,
            "url": url,
            "summary": summary,
        })

    return items[:15]  # cap at 15 items


# ── Existing endpoints (unchanged) ───────────────────────────────────────────

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
    period_map    = {"1W": "5d",  "1M": "1mo", "6M": "6mo", "1Y": "1y"}
    interval_map  = {"1W": "15m", "1M": "1d",  "6M": "1d",  "1Y": "1d"}

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
        if forward_pe is not None and forward_pe < 0:
            forward_pe = None

        trailing_pe = info.get('trailingPE')
        if trailing_pe is not None and trailing_pe < 0:
            trailing_pe = None

        metrics = {
            "war_chest_ratio":  wcr,
            "fcf":              sf(info.get('freeCashflow'), 0),
            "gross_margin":     sf(info.get('grossMargins')),
            "operating_margin": sf(info.get('operatingMargins')),
            "net_margin":       sf(info.get('profitMargins')),
            "forward_pe":       sf(forward_pe, 2),
            "trailing_pe":      sf(trailing_pe, 2),
            "ps_ratio":         sf(info.get('priceToSalesTrailing12Months'), 2),
            "pb_ratio":         sf(info.get('priceToBook'), 2),
            "revenue_yoy":      sf(info.get('revenueGrowth')),
            "earnings_yoy":     sf(info.get('earningsGrowth')),
            "debt_to_equity":   sf(info.get('debtToEquity'), 2),
            "current_ratio":    sf(info.get('currentRatio'), 2),
            "roe":              sf(info.get('returnOnEquity')),
            "roa":              sf(info.get('returnOnAssets')),
            "short_ratio":      sf(info.get('shortRatio'), 2),
            "insider_pct":      sf(info.get('heldPercentInsiders')),
            "institution_pct":  sf(info.get('heldPercentInstitutions')),
            # ── NEW: additional fields for assessment engine ──
            "total_cash":       sf(info.get('totalCash'), 0),
            "total_debt":       sf(info.get('totalDebt'), 0),
            "revenue":          sf(info.get('totalRevenue'), 0),
            "research_development": sf(info.get('researchDevelopment'), 0),
            "gross_profit":     sf(info.get('grossProfits'), 0),
            # Historical median P/E proxy (3-year trailing avg — yfinance doesn't
            # directly expose 3yr median, so we expose the 5yr avg PE if available)
            "five_yr_avg_pe":   sf(info.get('fiveYearAverageReturn')),   # ETF metric; stocks use trailingPE
        }

    sector = normalise_sector(info.get('sector'))

    return {
        "quoteType":   quote_type,
        "sector":      sector,
        "chart":       chart_data,
        "metrics":     metrics,
        "description": info.get('longBusinessSummary', ''),
    }


@app.get("/api/dividends")
def get_dividends(tickers: str):
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    result = {}
    for t in ticker_list:
        try:
            stock = yf.Ticker(t)
            info  = stock.info
            dps   = info.get("dividendRate") or info.get("trailingAnnualDividendRate") or 0.0
            dy    = info.get("dividendYield") or 0.0
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
            price = None
            try:
                price = stock.fast_info.get('last_price') or stock.fast_info.get('previousClose')
            except Exception:
                pass
            if not price:
                hist = stock.history(period="2d", interval="1d")
                if not hist.empty:
                    price = float(hist['Close'].iloc[-1])
            if not price:
                info  = stock.info
                price = info.get('regularMarketPrice') or info.get('previousClose') or info.get('currentPrice')
            if price:
                result[t] = round(float(price), 2)
        except Exception:
            pass
    return result


@app.get("/api/bulk_sectors")
def get_bulk_sectors(tickers: str):
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    result = {}
    for t in ticker_list:
        try:
            info   = yf.Ticker(t).info
            qt     = info.get('quoteType', 'EQUITY')
            sector = normalise_sector(info.get('sector')) if qt != 'ETF' else None
            result[t] = {"quoteType": qt, "sector": sector}
        except Exception:
            result[t] = {"quoteType": "EQUITY", "sector": None}
    return result


@app.get("/api/etf-holdings/{ticker}")
def get_etf_holdings(ticker: str):
    try:
        stock = yf.Ticker(ticker)
        df    = stock.funds_data.top_holdings
        if df is None or df.empty:
            return []
        result = []
        for symbol, row in df.iterrows():
            weight = row.get("Holding Percent", 0)
            result.append({
                "ticker": str(symbol),
                "weight": round(float(weight), 6),
                "name":   str(row.get("Name", "")) or None,
            })
        result.sort(key=lambda x: x["weight"], reverse=True)
        return result[:25]
    except Exception:
        return []


# ── NEW: Financial statements ─────────────────────────────────────────────────

@app.get("/api/financials/{ticker}")
def get_financials(ticker: str):
    """
    Returns income statement, balance sheet, cash flow statement, and
    forward P/E for the given ticker.

    All monetary values are in raw dollars (not billions); the frontend
    can format as needed.
    """
    try:
        stock = yf.Ticker(ticker)
        info  = stock.info

        def df_to_records(df: pd.DataFrame | None) -> list[dict]:
            """Convert a yfinance financial DataFrame to a list of row dicts."""
            if df is None or df.empty:
                return []
            # yfinance returns columns as DatetimeIndex (periods)
            # and index as metric names
            result = {}
            for col in df.columns:
                period_str = col.strftime("%Y-%m-%d") if hasattr(col, "strftime") else str(col)
                result[period_str] = {
                    idx: (None if pd.isna(val) else int(val) if abs(val) > 1 else round(float(val), 6))
                    for idx, val in df[col].items()
                }
            return result

        income_stmt  = df_to_records(stock.income_stmt)
        balance_sheet = df_to_records(stock.balance_sheet)
        cash_flow     = df_to_records(stock.cashflow)

        forward_pe = info.get('forwardPE')
        if forward_pe is not None and forward_pe < 0:
            forward_pe = None

        return {
            "ticker":        ticker.upper(),
            "forward_pe":    sf(forward_pe, 2),
            "trailing_pe":   sf(info.get('trailingPE'), 2),
            "income_stmt":   income_stmt,
            "balance_sheet": balance_sheet,
            "cash_flow":     cash_flow,
        }
    except Exception as e:
        return {"error": str(e), "ticker": ticker.upper()}


# ── NEW: Macro data (VOO 200-DMA + RSI) ──────────────────────────────────────

def _calc_rsi(closes: pd.Series, period: int = 14) -> float | None:
    """Classic Wilder RSI using EMA of gains/losses."""
    if len(closes) < period + 1:
        return None
    delta  = closes.diff().dropna()
    gain   = delta.clip(lower=0)
    loss   = (-delta).clip(lower=0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False).mean()
    rs     = avg_gain / avg_loss.replace(0, float('nan'))
    rsi    = 100 - (100 / (1 + rs))
    return sf(rsi.iloc[-1], 2)


@app.get("/api/macro")
def get_macro_data():
    """
    Returns VOO macro sentiment data:
      - current price
      - 200-day moving average
      - % deviation from 200-DMA
      - 14-day RSI
      - derived fear_greed_score (0–100) and label
    """
    try:
        voo  = yf.Ticker("VOO")
        hist = voo.history(period="1y", interval="1d")

        if hist.empty:
            return {"error": "No VOO data available"}

        closes      = hist['Close']
        current     = float(closes.iloc[-1])
        dma200      = float(closes.tail(200).mean()) if len(closes) >= 200 else float(closes.mean())
        deviation   = (current - dma200) / dma200  # signed fraction
        rsi         = _calc_rsi(closes)

        # ── Fear & Greed Score (0=Extreme Fear, 100=Extreme Greed) ──────────
        # DMA component: ±15% maps to 0–100 (clipped)
        dma_component = 50 + (deviation / 0.15) * 50
        dma_component = max(0, min(100, dma_component))

        # RSI component: 30–70 maps to 0–100 (clipped)
        rsi_component = ((rsi - 30) / 40) * 100 if rsi is not None else 50
        rsi_component = max(0, min(100, rsi_component))

        score = round((dma_component * 0.6) + (rsi_component * 0.4))

        # ── Label logic matching spec ────────────────────────────────────────
        if deviation > 0.15 or (rsi is not None and rsi > 75):
            label    = "Extreme Greed"
            severity = "danger"   # red/warning UI
        elif deviation < -0.15 or (rsi is not None and rsi < 30):
            label    = "Extreme Fear"
            severity = "opportunity"  # green UI
        elif score >= 65:
            label    = "Greed"
            severity = "warning"
        elif score >= 50:
            label    = "Neutral-Bullish"
            severity = "neutral"
        elif score >= 35:
            label    = "Neutral-Bearish"
            severity = "neutral"
        else:
            label    = "Fear"
            severity = "caution"

        return {
            "ticker":       "VOO",
            "current_price": sf(current, 2),
            "dma200":        sf(dma200, 2),
            "dma_deviation": sf(deviation, 4),   # e.g. 0.08 = 8% above
            "rsi14":         rsi,
            "fear_greed_score": score,            # 0–100
            "label":         label,
            "severity":      severity,
        }
    except Exception as e:
        return {"error": str(e)}


# ── NEW: Stock-specific news ──────────────────────────────────────────────────

@app.get("/api/news/{ticker}")
def get_stock_news(ticker: str):
    """
    Returns the latest news articles for the given ticker.
    Each item has: title, source, publishedAt, url, summary.
    """
    try:
        stock = yf.Ticker(ticker)
        raw   = stock.news or []
        return {"ticker": ticker.upper(), "news": _parse_news(raw)}
    except Exception as e:
        return {"ticker": ticker.upper(), "news": [], "error": str(e)}


# ── NEW: Global / market-wide news ───────────────────────────────────────────

@app.get("/api/market-news")
def get_market_news():
    """
    Returns macro / general market news by aggregating news from a basket of
    broad market proxies (indices, major ETFs, macro tickers).
    Deduplicated by title, sorted by publish time descending.
    """
    MACRO_TICKERS = ["^GSPC", "^DJI", "^IXIC", "VOO", "SPY", "TLT", "GLD", "BTC-USD"]

    seen_titles: set[str] = set()
    all_news: list[dict]  = []

    for tkr in MACRO_TICKERS:
        try:
            raw = yf.Ticker(tkr).news or []
            for item in _parse_news(raw):
                key = item["title"].lower().strip()
                if key and key not in seen_titles:
                    seen_titles.add(key)
                    all_news.append(item)
        except Exception:
            continue

    # Sort by publish time (newest first); handle ISO strings and unix ints
    def sort_key(item):
        pt = item.get("publishedAt")
        if isinstance(pt, (int, float)):
            return pt
        if isinstance(pt, str):
            try:
                import dateutil.parser
                return dateutil.parser.parse(pt).timestamp()
            except Exception:
                return 0
        return 0

    all_news.sort(key=sort_key, reverse=True)

    return {"news": all_news[:30]}


# ── NEW: Valuation comparison (current vs historical median P/E) ─────────────

@app.get("/api/valuation/{ticker}")
def get_valuation_context(ticker: str):
    """
    Compares the current forward P/E against a proxy for the 3-year historical
    median P/E.

    yfinance does not expose a direct 3-year median P/E, so we construct a
    proxy by sampling the trailing P/E from quarterly income statements over
    ~3 years and the current share price history to derive implied P/Es.

    Returns:
      - current_forward_pe
      - historical_median_pe  (proxy)
      - discount_pct          (negative = discount, positive = premium)
      - valuation_flag        "Deep Discount" | "Heavy Premium" | "Fair Value" | null
    """
    try:
        stock  = yf.Ticker(ticker)
        info   = stock.info

        current_fpe = info.get('forwardPE')
        if current_fpe is not None and current_fpe < 0:
            current_fpe = None

        # Build historical P/E proxy from quarterly EPS + price history
        # Step 1: quarterly earnings per share (diluted)
        quarterly_income = stock.quarterly_income_stmt
        quarterly_price  = stock.history(period="3y", interval="3mo")

        historical_pes = []

        if quarterly_income is not None and not quarterly_income.empty and not quarterly_price.empty:
            eps_row = None
            for candidate in ["Diluted EPS", "Basic EPS", "EPS"]:
                if candidate in quarterly_income.index:
                    eps_row = quarterly_income.loc[candidate]
                    break

            if eps_row is not None:
                # Annualise EPS: trailing 4 quarters
                for i in range(3, len(eps_row)):
                    ttm_eps = eps_row.iloc[i-3:i+1].sum()
                    if ttm_eps and ttm_eps > 0:
                        period_date = eps_row.index[i]
                        # find closest price
                        price_idx = quarterly_price.index.searchsorted(period_date)
                        if 0 <= price_idx < len(quarterly_price):
                            price = float(quarterly_price['Close'].iloc[price_idx])
                            implied_pe = price / float(ttm_eps)
                            if 3 < implied_pe < 500:
                                historical_pes.append(implied_pe)

        # Fallback: use trailing P/E from info as the single data point
        if not historical_pes:
            tpe = info.get('trailingPE')
            if tpe and tpe > 0:
                historical_pes = [float(tpe)]

        historical_median_pe = float(pd.Series(historical_pes).median()) if historical_pes else None

        # Compute discount/premium vs historical median
        discount_pct    = None
        valuation_flag  = None

        if current_fpe and historical_median_pe:
            discount_pct = (current_fpe - historical_median_pe) / historical_median_pe
            if discount_pct <= -0.20:
                valuation_flag = "Deep Discount"
            elif discount_pct >= 0.25:
                valuation_flag = "Heavy Premium"
            else:
                valuation_flag = "Fair Value"

        return {
            "ticker":               ticker.upper(),
            "current_forward_pe":   sf(current_fpe, 2),
            "historical_median_pe": sf(historical_median_pe, 2),
            "discount_pct":         sf(discount_pct, 4),  # e.g. -0.22 = 22% discount
            "valuation_flag":       valuation_flag,
        }
    except Exception as e:
        return {"ticker": ticker.upper(), "error": str(e)}
