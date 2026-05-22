import os
import yfinance as yf
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError("Terminal Error: Missing Supabase credentials in .env file.")

supabase: Client = create_client(url, key)

def calculate_mva(ticker_symbol: str) -> dict:
    """Fetches financial data and calculates the Minimum Viable Audit metrics."""
    print(f"Fetching market data for {ticker_symbol}...")
    stock = yf.Ticker(ticker_symbol)
    
    try:
        # YoY Revenue Growth
        income = stock.financials
        if 'Total Revenue' in income.index and len(income.columns) >= 2:
            rev_current = income.iloc[income.index.get_loc('Total Revenue'), 0]
            rev_prev = income.iloc[income.index.get_loc('Total Revenue'), 1]
            yoy_growth = (rev_current - rev_prev) / rev_prev
        else:
            yoy_growth = None

        # Free Cash Flow
        cashflow = stock.cashflow
        if 'Free Cash Flow' in cashflow.index:
            fcf = cashflow.iloc[cashflow.index.get_loc('Free Cash Flow'), 0]
        else:
            fcf = None

        # War Chest Ratio (Cash / Debt)
        balance = stock.balance_sheet
        if 'Cash And Cash Equivalents' in balance.index and 'Total Debt' in balance.index:
            cash = balance.iloc[balance.index.get_loc('Cash And Cash Equivalents'), 0]
            debt = balance.iloc[balance.index.get_loc('Total Debt'), 0]
            
            war_chest = (cash / debt) if debt > 0 else 999.99 
        else:
            war_chest = None

        return {
            "revenue_yoy": float(yoy_growth) if yoy_growth is not None else None,
            "fcf": float(fcf) if fcf is not None else None,
            "war_chest_ratio": float(war_chest) if war_chest is not None else None
        }

    except Exception as e:
        print(f"Extraction Error processing {ticker_symbol}: {e}")
        return None

def main():
    print("Initiating...\n")
    
    # pull unique target tickers from the master table
    response = supabase.table("global_metrics").select("ticker").execute()
    tickers = response.data
    
    if not tickers:
        print("The Database is empty. Insert a ticker into your portfolio first.")
        return

    # execute the audit
    for item in tickers:
        ticker = item['ticker']
        metrics = calculate_mva(ticker)
        
        if metrics:
            print(f"[{ticker}] Metrics calculated: YoY={metrics['revenue_yoy']}, FCF={metrics['fcf']}, War Chest={metrics['war_chest_ratio']}")
            
            # push fresh data back 
            supabase.table("global_metrics").update(metrics).eq("ticker", ticker).execute()
            print(f"[{ticker}] Successfully updated the record.\n")
            
            # terminal Red Flag Sweep
            if metrics['war_chest_ratio'] is not None and metrics['war_chest_ratio'] < 0.5:
                print(f"🚩 RED FLAG DETECTED: {ticker} War Chest is critically low.")
                # Future Phase: Trigger Discord Notification here
        else:
            print(f"[{ticker}] Audit failed. Skipping database update.\n")
            
    print("Sync Protocol Complete.")

if __name__ == "__main__":
    main()