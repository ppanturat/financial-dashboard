import os
import json
import html
import re
import requests
import yfinance as yf
import pandas as pd
from bs4 import BeautifulSoup
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# Vercel's serverless filesystem is read-only outside /tmp — yfinance's
# default tz/cookie cache location falls under the user's home dir, which
# fails there and logs a warning (harmless, but noisy) on every cold start.
# Redirect it to /tmp, which is writable in serverless environments.
try:
    yf.set_tz_cache_location("/tmp/py-yfinance")
except Exception:
    pass

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
        if val is None:
            return None
        v = float(val)
        if v != v or abs(v) == float('inf'):
            return None
        return round(v, decimals)
    except (TypeError, ValueError):
        return None


# ── Helper: parse news items from yfinance ───────────────────────────────────
def _clean_text(raw: str) -> str:
    """strips HTML tags/entities from yahoo's raw title/summary text and collapses whitespace"""
    if not raw:
        return ""
    text = BeautifulSoup(raw, "html.parser").get_text(separator=" ")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _parse_news(raw_news: list) -> list:
    """
    yfinance news items are dicts. structure varies by version but typically:
      { "title": str, "publisher": str, "link": str, "providerPublishTime": int,
        "type": str, "thumbnail": {...}, "relatedTickers": [...] }
    """
    items = []
    for n in (raw_news or []):
        if not isinstance(n, dict):
            continue
        content = n.get("content", n)
        title = content.get("title") or n.get("title", "")
        if not title:
            continue

        provider = (
            content.get("provider", {}).get("displayName")
            or content.get("publisher")
            or n.get("publisher")
            or ""
        )

        pub_time = (
            content.get("pubDate")           
            or n.get("providerPublishTime")   
        )

        url = (
            content.get("canonicalUrl", {}).get("url")
            or content.get("clickThroughUrl", {}).get("url")
            or n.get("link")
            or ""
        )

        summary = (
            content.get("summary")
            or content.get("description")
            or n.get("summary")
            or n.get("snippet")
            or ""
        )

        items.append({
            "title": _clean_text(title),
            "source": provider,
            "publishedAt": pub_time,
            "url": url,
            "summary": _clean_text(summary),
        })

    return items[:15]


# ── Helpers: two-period financial statement extraction ───────────────────────
# yfinance's balance_sheet / financials / cashflow are DataFrames with one
# column per fiscal period, most-recent first. Row labels vary slightly by
# ticker/version, so `row()` tries several candidate labels in order.

def _row(df, *names):
    """Return the row (Series across periods) for the first matching label, or None."""
    if df is None or df.empty:
        return None
    for name in names:
        if name in df.index:
            return df.loc[name]
    return None


def _val(series, idx):
    """Safe value extraction at column index idx (0 = most recent period)."""
    if series is None:
        return None
    try:
        if idx >= len(series):
            return None
        v = series.iloc[idx]
        if v is None or (isinstance(v, float) and v != v):
            return None
        return float(v)
    except Exception:
        return None


def _build_quant_model_inputs(stock, info):
    """
    Pulls the two most recent annual periods from balance_sheet / financials /
    cashflow and assembles the raw inputs needed for the Altman Z, Piotroski F,
    and Beneish M models. Returns (altman_inputs, piotroski_inputs, beneish_inputs),
    each either a fully-populated dict or None if required data is unavailable —
    never a partial/broken calculation.
    """
    try:
        bs = stock.balance_sheet
        fin = stock.financials
        cf = stock.cashflow
    except Exception:
        bs = fin = cf = None

    altman_inputs = None
    piotroski_inputs = None
    beneish_inputs = None

    has_current_period = bs is not None and not bs.empty and fin is not None and not fin.empty
    has_two_periods = (
        has_current_period
        and len(bs.columns) >= 2
        and len(fin.columns) >= 2
    )

    total_assets_row      = _row(bs, 'Total Assets')
    total_liab_row        = _row(bs, 'Total Liabilities Net Minority Interest', 'Total Liab')
    retained_earnings_row = _row(bs, 'Retained Earnings')
    current_assets_row    = _row(bs, 'Current Assets')
    current_liab_row      = _row(bs, 'Current Liabilities')
    ebit_row               = _row(fin, 'EBIT')
    revenue_row            = _row(fin, 'Total Revenue')
    net_income_row         = _row(fin, 'Net Income')
    ocf_row                = _row(cf, 'Operating Cash Flow', 'Total Cash From Operating Activities')
    ltd_row                = _row(bs, 'Long Term Debt')
    shares_row             = _row(bs, 'Share Issued', 'Ordinary Shares Number')
    if shares_row is None:
        shares_row = _row(fin, 'Basic Average Shares', 'Diluted Average Shares')
    gross_profit_row       = _row(fin, 'Gross Profit')
    recv_row                = _row(bs, 'Receivables', 'Accounts Receivable', 'Net Receivables')
    cogs_row                = _row(fin, 'Cost Of Revenue', 'Reconciled Cost Of Revenue')
    ppe_row                 = _row(bs, 'Net PPE', 'Gross PPE')
    sec_row                 = _row(bs, 'Other Short Term Investments', 'Investments And Advances')
    dep_row                 = _row(cf, 'Depreciation And Amortization', 'Depreciation Amortization Depletion', 'Depreciation')
    sga_row                 = _row(fin, 'Selling General And Administration')
    debt_row                = _row(bs, 'Total Debt')

    # ── Altman Z inputs (current period only) ──
    if has_current_period:
        ta0 = _val(total_assets_row, 0)
        tl0 = _val(total_liab_row, 0)
        re0 = _val(retained_earnings_row, 0)
        ca0 = _val(current_assets_row, 0)
        cl0 = _val(current_liab_row, 0)
        ebit0 = _val(ebit_row, 0)
        rev0 = _val(revenue_row, 0)
        mcap = info.get('marketCap')

        required = [ta0, tl0, re0, ca0, cl0, ebit0, rev0, mcap]
        if all(x is not None for x in required) and ta0 != 0 and tl0 != 0:
            altman_inputs = {
                "total_assets":      sf(ta0, 0),
                "total_liabilities": sf(tl0, 0),
                "retained_earnings": sf(re0, 0),
                "working_capital":   sf(ca0 - cl0, 0),
                "ebit":              sf(ebit0, 0),
                "market_cap":        sf(mcap, 0),
                "total_revenue":     sf(rev0, 0),
            }

    # ── Piotroski F inputs (current + prior) ──
    if has_two_periods:
        ta0, ta1 = _val(total_assets_row, 0), _val(total_assets_row, 1)
        ni0, ni1 = _val(net_income_row, 0), _val(net_income_row, 1)
        ocf0 = _val(ocf_row, 0)
        ltd0, ltd1 = _val(ltd_row, 0), _val(ltd_row, 1)
        ca0, ca1 = _val(current_assets_row, 0), _val(current_assets_row, 1)
        cl0, cl1 = _val(current_liab_row, 0), _val(current_liab_row, 1)
        sh0, sh1 = _val(shares_row, 0), _val(shares_row, 1)
        gp0, gp1 = _val(gross_profit_row, 0), _val(gross_profit_row, 1)
        rev0, rev1 = _val(revenue_row, 0), _val(revenue_row, 1)

        required = [ta0, ta1, ni0, ni1, ocf0, ltd0, ltd1, ca0, ca1, cl0, cl1,
                    sh0, sh1, gp0, gp1, rev0, rev1]
        if all(x is not None for x in required) and ta0 != 0 and ta1 != 0 and rev0 != 0 and rev1 != 0:
            piotroski_inputs = {
                "net_income":                sf(ni0, 0),
                "net_income_prior":          sf(ni1, 0),
                "total_assets":              sf(ta0, 0),
                "total_assets_prior":        sf(ta1, 0),
                "operating_cash_flow":       sf(ocf0, 0),
                "long_term_debt":            sf(ltd0, 0),
                "long_term_debt_prior":      sf(ltd1, 0),
                "current_assets":            sf(ca0, 0),
                "current_assets_prior":      sf(ca1, 0),
                "current_liabilities":       sf(cl0, 0),
                "current_liabilities_prior": sf(cl1, 0),
                "shares_outstanding":        sf(sh0, 0),
                "shares_outstanding_prior":  sf(sh1, 0),
                "gross_margin":              sf(gp0 / rev0, 6),
                "gross_margin_prior":        sf(gp1 / rev1, 6),
                "asset_turnover":            sf(rev0 / ta0, 6),
                "asset_turnover_prior":      sf(rev1 / ta1, 6),
            }
            if any(v is None for v in piotroski_inputs.values()):
                piotroski_inputs = None

    # ── Beneish M inputs (current + prior) ──
    if has_two_periods:
        recv0, recv1 = _val(recv_row, 0), _val(recv_row, 1)
        rev0, rev1 = _val(revenue_row, 0), _val(revenue_row, 1)
        cogs0, cogs1 = _val(cogs_row, 0), _val(cogs_row, 1)
        ca0, ca1 = _val(current_assets_row, 0), _val(current_assets_row, 1)
        ppe0, ppe1 = _val(ppe_row, 0), _val(ppe_row, 1)
        # securities can legitimately be absent for many firms — default 0
        # rather than fail the whole model over a line item most companies
        # don't carry
        sec0 = _val(sec_row, 0)
        sec1 = _val(sec_row, 1)
        sec0 = sec0 if sec0 is not None else 0.0
        sec1 = sec1 if sec1 is not None else 0.0
        dep0, dep1 = _val(dep_row, 0), _val(dep_row, 1)
        sga0, sga1 = _val(sga_row, 0), _val(sga_row, 1)
        ta0, ta1 = _val(total_assets_row, 0), _val(total_assets_row, 1)
        debt0, debt1 = _val(debt_row, 0), _val(debt_row, 1)
        ni0 = _val(net_income_row, 0)
        cfo0 = _val(ocf_row, 0)

        required = [recv0, recv1, rev0, rev1, cogs0, cogs1, ca0, ca1, ppe0, ppe1,
                    dep0, dep1, sga0, sga1, ta0, ta1, debt0, debt1, ni0, cfo0]
        if all(x is not None for x in required) and rev0 != 0 and rev1 != 0 and ta0 != 0 and ta1 != 0:
            beneish_inputs = {
                "net_receivables":        sf(recv0, 0),
                "net_receivables_prior":  sf(recv1, 0),
                "sales":                  sf(rev0, 0),
                "sales_prior":            sf(rev1, 0),
                "cogs":                   sf(cogs0, 0),
                "cogs_prior":             sf(cogs1, 0),
                "current_assets":         sf(ca0, 0),
                "current_assets_prior":   sf(ca1, 0),
                "ppe":                    sf(ppe0, 0),
                "ppe_prior":              sf(ppe1, 0),
                "securities":             sf(sec0, 0),
                "securities_prior":       sf(sec1, 0),
                "depreciation":           sf(dep0, 0),
                "depreciation_prior":     sf(dep1, 0),
                "sga_expense":            sf(sga0, 0),
                "sga_expense_prior":      sf(sga1, 0),
                "total_assets":           sf(ta0, 0),
                "total_assets_prior":     sf(ta1, 0),
                "total_debt":             sf(debt0, 0),
                "total_debt_prior":       sf(debt1, 0),
                "net_income":             sf(ni0, 0),
                "cash_flow_from_ops":     sf(cfo0, 0),
            }
            if any(v is None for v in beneish_inputs.values()):
                beneish_inputs = None

    return altman_inputs, piotroski_inputs, beneish_inputs


# ── Existing endpoints ───────────────────────────────────────────

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
        period_map    = {"1W": "5d",  "1M": "1mo", "6M": "6mo", "1Y": "1y"}
        interval_map  = {"1W": "15m", "1M": "1d",  "6M": "1d",  "1Y": "1d"}

        hist = stock.history(period=period_map.get(timeframe, "1mo"), interval=interval_map.get(timeframe, "1d"))
        chart_data = []
        if not hist.empty:
            # drop NaN prices to avoid JSON serialization errors
            hist = hist.dropna(subset=['Close'])
            chart_data = [{"timestamp": d.isoformat(), "price": round(float(r['Close']), 2)} for d, r in hist.iterrows()]

        info = stock.info
        quote_type = info.get('quoteType', 'EQUITY')

        metrics = None
        altman_inputs = None
        piotroski_inputs = None
        beneish_inputs = None

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
                "war_chest_ratio":  sf(wcr),
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
                "total_cash":       sf(info.get('totalCash'), 0),
                "total_debt":       sf(info.get('totalDebt'), 0),
                "revenue":          sf(info.get('totalRevenue'), 0),
                "research_development": sf(info.get('researchDevelopment'), 0),
                "gross_profit":     sf(info.get('grossProfits'), 0),
                "five_yr_avg_pe":   sf(info.get('fiveYearAverageReturn')),
            }

            # Altman Z / Piotroski F / Beneish M raw inputs — pulled from the
            # two most recent annual balance_sheet/financials/cashflow columns.
            # Each sub-object is None (not partially filled) if any required
            # field for that model is unavailable.
            try:
                altman_inputs, piotroski_inputs, beneish_inputs = _build_quant_model_inputs(stock, info)
            except Exception as e:
                print(f"Error building quant model inputs for {ticker}: {e}")
                altman_inputs = piotroski_inputs = beneish_inputs = None

        sector = normalise_sector(info.get('sector'))

        return {
            "quoteType":   quote_type,
            "sector":      sector,
            "chart":       chart_data,
            "metrics":     metrics,
            "description": info.get('longBusinessSummary', ''),
            "altman_inputs":    altman_inputs,
            "piotroski_inputs": piotroski_inputs,
            "beneish_inputs":   beneish_inputs,
        }
    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        # safe fallback so the frontend still gets a valid response on crash
        return {
            "quoteType": "EQUITY",
            "sector": None,
            "chart": [],
            "metrics": None,
            "description": "Data temporarily unavailable.",
            "altman_inputs": None,
            "piotroski_inputs": None,
            "beneish_inputs": None,
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
            result[t] = {"dps": round(float(sf(dps) or 0.0), 4), "yield": round(float(sf(dy) or 0.0), 6)}
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
                info  = stock.info
                price = info.get('regularMarketPrice') or info.get('previousClose') or info.get('currentPrice')
            
            clean_p = sf(price)
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
            weight = sf(row.get("Holding Percent", 0)) or 0
            result.append({
                "ticker": str(symbol),
                "weight": round(float(weight), 6),
                "name":   str(row.get("Name", "")) or None,
            })
        result.sort(key=lambda x: x["weight"], reverse=True)
        return result[:25]
    except Exception:
        return []


# ── Financial statements ─────────────────────────────────────────────────────

@app.get("/api/technicals/{ticker}")
def get_technicals(ticker: str):
    """raw daily close + volume history for the TechnicalTriggerModule (RSI/SMA/volume). last 50 trading days, oldest first."""
    try:
        stock = yf.Ticker(ticker)
        # wider window than needed so holidays/gaps still leave >= 50 rows
        hist = stock.history(period="4mo", interval="1d")
        hist = hist.dropna(subset=['Close', 'Volume']).tail(50)

        return {
            "dates":   [d.strftime('%Y-%m-%d') for d in hist.index],
            "closes":  [sf(c, 4) for c in hist['Close']],
            "volumes": [int(v) for v in hist['Volume']],
        }
    except Exception as e:
        print(f"Error fetching technicals for {ticker}: {e}")
        return {"dates": [], "closes": [], "volumes": []}


@app.get("/api/financials/{ticker}")
def get_financials(ticker: str):
    try:
        stock = yf.Ticker(ticker)
        info  = stock.info

        def df_to_records(df: pd.DataFrame | None) -> list[dict]:
            if df is None or df.empty:
                return []
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


# ── Macro data (VOO 200-DMA + RSI) ──────────────────────────────────────────

def _calc_rsi(closes: pd.Series, period: int = 14) -> float | None:
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
    try:
        voo  = yf.Ticker("VOO")
        hist = voo.history(period="1y", interval="1d")

        if hist.empty:
            return {"error": "No VOO data available"}

        closes      = hist['Close']
        current     = float(closes.iloc[-1])
        dma200      = float(closes.tail(200).mean()) if len(closes) >= 200 else float(closes.mean())
        deviation   = (current - dma200) / dma200  
        rsi         = _calc_rsi(closes)

        dma_component = 50 + (deviation / 0.15) * 50
        dma_component = max(0, min(100, dma_component))

        rsi_component = ((rsi - 30) / 40) * 100 if rsi is not None else 50
        rsi_component = max(0, min(100, rsi_component))

        score = round((dma_component * 0.6) + (rsi_component * 0.4))

        if deviation > 0.15 or (rsi is not None and rsi > 75):
            label    = "Extreme Greed"
            severity = "danger"   
        elif deviation < -0.15 or (rsi is not None and rsi < 30):
            label    = "Extreme Fear"
            severity = "opportunity"  
        elif score >= 65:
            label    = "Greed"
            severity = "warning"
        elif score >= 50:
            label    = "Neutral-Bullish"
            severity = "neutral-bullish"
        elif score >= 35:
            label    = "Neutral-Bearish"
            severity = "neutral-bearish"
        else:
            label    = "Fear"
            severity = "caution"

        return {
            "ticker":       "VOO",
            "current_price": sf(current, 2),
            "dma200":        sf(dma200, 2),
            "dma_deviation": sf(deviation, 4),   
            "rsi14":         rsi,
            "fear_greed_score": score,            
            "label":         label,
            "severity":      severity,
        }
    except Exception as e:
        return {"error": str(e)}


# ── Stock-specific news ──────────────────────────────────────────────────────

@app.get("/api/news/{ticker}")
def get_stock_news(ticker: str):
    try:
        stock = yf.Ticker(ticker)
        raw   = stock.news or []
        return {"ticker": ticker.upper(), "news": _parse_news(raw)}
    except Exception as e:
        return {"ticker": ticker.upper(), "news": [], "error": str(e)}


# ── Global / market-wide news ────────────────────────────────────────────────

@app.get("/api/market-news")
def get_market_news():
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


# ── Valuation comparison ─────────────────────────────────────────────────────

@app.get("/api/valuation/{ticker}")
def get_valuation_context(ticker: str):
    try:
        stock  = yf.Ticker(ticker)
        info   = stock.info

        current_fpe = info.get('forwardPE')
        if current_fpe is not None and current_fpe < 0:
            current_fpe = None

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
                for i in range(3, len(eps_row)):
                    ttm_eps = eps_row.iloc[i-3:i+1].sum()
                    if ttm_eps and ttm_eps > 0:
                        period_date = eps_row.index[i]
                        price_idx = quarterly_price.index.searchsorted(period_date)
                        if 0 <= price_idx < len(quarterly_price):
                            price = float(quarterly_price['Close'].iloc[price_idx])
                            implied_pe = price / float(ttm_eps)
                            if 3 < implied_pe < 500:
                                historical_pes.append(implied_pe)

        if not historical_pes:
            tpe = info.get('trailingPE')
            if tpe and tpe > 0:
                historical_pes = [float(tpe)]

        historical_median_pe = float(pd.Series(historical_pes).median()) if historical_pes else None

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
            "discount_pct":         sf(discount_pct, 4),  
            "valuation_flag":       valuation_flag,
        }
    except Exception as e:
        return {"ticker": ticker.upper(), "error": str(e)}