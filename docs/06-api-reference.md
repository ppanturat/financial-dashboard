# API Reference

The FastAPI backend (`api/index.py`). All endpoints are `GET`, all params are query/path params (no request bodies anywhere), and every response is JSON. Base path: `/api` in production, `http://localhost:8000/api` in local dev — see `src/lib/api.js`.

There's no authentication on this backend — it never touches user data, only public market data. User-scoped data (portfolios, follows, etc.) goes through Supabase directly, not through this API.

## Ticker & market data

### `GET /api/search/{query}`
Ticker autocomplete search. Proxies Yahoo's own search endpoint, filtered to `EQUITY` and `ETF` quote types only.
→ `{ results: [{ symbol, shortname, longname, quoteType, ... }] }`

### `GET /api/data/{ticker}?timeframe=1M`
The main Market View payload: price chart, key metrics, ETF holdings (if applicable), company description. `timeframe` is one of `1W`/`1M`/`6M`/`1Y`.
→ `{ quoteType, chart: [{timestamp, price}], metrics: {...}, description, ... }`

### `GET /api/technicals/{ticker}`
Last 50 trading days of close price + volume, oldest first. Used exclusively by the frontend's Technical Trigger Module (`evaluateTechnicalSignal` in `assessmentEngine.js`) to compute RSI/SMA/volume signals client-side.
→ `{ dates: [...], closes: [...], volumes: [...] }`

### `GET /api/financials/{ticker}`
Income statement / balance sheet / cash flow summary.

### `GET /api/valuation/{ticker}`
Valuation context (used by `ValuationBadge`).

### `GET /api/etf-holdings/{ticker}`
Top holdings breakdown for ETF tickers.

## Bulk lookups

### `GET /api/dividends?tickers=AAPL,MSFT`
Dividend per share + yield for a comma-separated list of tickers. Individual failures degrade to `{dps: 0, yield: 0}` per-ticker rather than failing the whole request.

### `GET /api/bulk_prices?tickers=AAPL,MSFT`
Live prices for multiple tickers in one call — used by Portfolio View and the Network feed so N holdings don't mean N separate requests.

### `GET /api/bulk_sectors?tickers=AAPL,MSFT`
Sector lookup for multiple tickers at once.

## Market-wide

### `GET /api/macro`
Fear & Greed sentiment gauge. Computes a 0–100 score from VOO's deviation from its 200-day moving average (60% weight) and 14-day RSI (40% weight), plus an authoritative `label`/`severity` with override rules for extreme readings.
→ `{ fear_greed_score, label, severity, dma_deviation, rsi14 }`

`severity` is one of `danger` / `warning` / `neutral-bullish` / `neutral-bearish` / `caution` / `opportunity` — the frontend renders `label` directly rather than re-deriving its own zone text, so the gauge's headline and sub-label can never disagree with each other.

### `GET /api/news/{ticker}`
Ticker-specific news.

### `GET /api/market-news`
General market news, ranked into tiers (major wire services first).

Both news endpoints return items shaped like:
```json
{ "title": "...", "source": "...", "publishedAt": "...", "url": "...", "summary": "..." }
```
`title` and `summary` are passed through `_clean_text()` before being returned — Yahoo's raw feed embeds HTML (`<p>`, `&amp;`, etc.) in these fields, which is stripped and entity-decoded server-side so the frontend never has to deal with raw markup.

## Shared backend helpers (not endpoints)

| Function | Purpose |
|---|---|
| `_clean_text(raw)` | strips HTML tags/entities from a string, collapses whitespace. Uses `BeautifulSoup` + `html.unescape`. |
| `_parse_news(raw_news)` | normalizes yfinance's news list shape (which varies by version) into a consistent `{title, source, publishedAt, url, summary}` list |
| `_calc_rsi(series)` | Wilder-smoothed RSI over a pandas Series, used by `/api/macro` |
| `sf(val, decimals)` | "safe float" — coerces a value to a rounded float or `None`, used everywhere numeric data comes back from `yfinance` (which frequently returns `NaN`) |
