"""Fetch historical OHLCV data from Twelve Data with disk caching."""

import json
import time
import requests
import pandas as pd
from config import API_KEY, BASE_URL, CACHE_DIR, TICKERS, REQUEST_TIMEOUT


def fetch_ohlcv(symbol: str, interval: str = "1day", outputsize: int = 1000) -> pd.DataFrame:
    """Fetch OHLCV data for a symbol, using disk cache to avoid repeat API calls."""
    cache_file = CACHE_DIR / f"{symbol}_{interval}_{outputsize}.json"

    # Return cached data if available
    if cache_file.exists():
        print(f"  [cache] {symbol}")
        try:
            with open(cache_file, "r") as f:
                data = json.load(f)
            return _parse_response(data, symbol)
        except (json.JSONDecodeError, IOError) as e:
            print(f"  WARNING: Cache corrupted for {symbol}: {e}")

    # Fetch from API
    print(f"  [fetch] {symbol} ...", end=" ", flush=True)
    params = {
        "symbol": symbol,
        "interval": interval,
        "outputsize": outputsize,
        "apikey": API_KEY,
    }

    try:
        resp = requests.get(f"{BASE_URL}/time_series", params=params, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except requests.Timeout:
        print(f"TIMEOUT after {REQUEST_TIMEOUT}s")
        return pd.DataFrame()
    except requests.RequestException as e:
        print(f"ERROR: {e}")
        return pd.DataFrame()
    except json.JSONDecodeError:
        print("ERROR: Invalid JSON response")
        return pd.DataFrame()

    if "status" in data and data["status"] == "error":
        print(f"ERROR: {data.get('message', 'Unknown error')}")
        return pd.DataFrame()

    # Cache to disk
    try:
        with open(cache_file, "w") as f:
            json.dump(data, f)
    except IOError as e:
        print(f"  WARNING: Could not cache {symbol}: {e}")

    print("OK")
    # Rate limit: max 8 requests/minute on free tier
    time.sleep(8)
    return _parse_response(data, symbol)


def _parse_response(data: dict, symbol: str) -> pd.DataFrame:
    """Parse Twelve Data response into a pandas DataFrame."""
    if "values" not in data:
        print(f"  WARNING: No data for {symbol}")
        return pd.DataFrame()

    rows = data["values"]
    df = pd.DataFrame(rows)
    df = df.assign(datetime=pd.to_datetime(df["datetime"]))
    for col in ["open", "high", "low", "close", "volume"]:
        df = df.assign(**{col: pd.to_numeric(df[col])})

    # Sort oldest first
    df = df.sort_values("datetime").reset_index(drop=True)

    # Convert datetime to UTC timestamp (seconds since epoch)
    df = df.assign(time=df["datetime"].astype("int64") // 10**9)

    return df


def fetch_all() -> dict[str, pd.DataFrame]:
    """Fetch OHLCV for all configured tickers."""
    if not API_KEY:
        raise ValueError("TWELVEDATA_API_KEY not set in .env")

    print(f"Fetching {len(TICKERS)} tickers from Twelve Data...")
    results = {}
    for symbol in TICKERS:
        df = fetch_ohlcv(symbol)
        if not df.empty:
            results[symbol] = df

    print(f"Loaded {len(results)} tickers successfully.")
    return results


if __name__ == "__main__":
    data = fetch_all()
    for symbol, df in data.items():
        print(f"  {symbol}: {len(df)} candles, {df['datetime'].iloc[0].date()} → {df['datetime'].iloc[-1].date()}")
