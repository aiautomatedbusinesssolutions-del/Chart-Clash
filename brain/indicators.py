"""Compute technical indicators and detect signal conditions."""

import pandas as pd
import ta


def compute_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Add all 5 indicator columns to the DataFrame."""
    close = df["close"]
    high = df["high"]
    low = df["low"]

    # RSI (14-period)
    df["rsi"] = ta.momentum.rsi(close, window=14)

    # Bollinger Bands (20-period, 2 std)
    bb = ta.volatility.BollingerBands(close, window=20, window_dev=2)
    df["bb_upper"] = bb.bollinger_hband()
    df["bb_middle"] = bb.bollinger_mavg()
    df["bb_lower"] = bb.bollinger_lband()

    # MACD (12, 26, 9)
    macd_ind = ta.trend.MACD(close, window_fast=12, window_slow=26, window_sign=9)
    df["macd_line"] = macd_ind.macd()
    df["macd_signal"] = macd_ind.macd_signal()
    df["macd_histogram"] = macd_ind.macd_diff()

    # Moving Average Crossover (SMA 20 vs SMA 50)
    df["sma_20"] = ta.trend.sma_indicator(close, window=20)
    df["sma_50"] = ta.trend.sma_indicator(close, window=50)

    # Stochastic Oscillator (14, 3)
    stoch = ta.momentum.StochasticOscillator(high, low, close, window=14, smooth_window=3)
    df["stoch_k"] = stoch.stoch()
    df["stoch_d"] = stoch.stoch_signal()

    return df


def detect_rsi_buy(df: pd.DataFrame, threshold: float) -> list[int]:
    """Find indices where RSI dips below threshold (buy signal)."""
    hits = []
    rsi = df["rsi"]
    for i in range(len(df)):
        if pd.notna(rsi.iloc[i]) and rsi.iloc[i] < threshold:
            hits.append(i)
    return hits


def detect_rsi_sell(df: pd.DataFrame, threshold: float) -> list[int]:
    """Find indices where RSI rises above threshold (sell signal)."""
    hits = []
    rsi = df["rsi"]
    for i in range(len(df)):
        if pd.notna(rsi.iloc[i]) and rsi.iloc[i] > threshold:
            hits.append(i)
    return hits


def detect_rsi_neutral(df: pd.DataFrame, low: float, high: float) -> list[int]:
    """Find indices where RSI is in the neutral zone."""
    hits = []
    rsi = df["rsi"]
    for i in range(len(df)):
        if pd.notna(rsi.iloc[i]) and low <= rsi.iloc[i] <= high:
            hits.append(i)
    return hits


def detect_bollinger_buy(df: pd.DataFrame, touch_pct: float) -> list[int]:
    """Find indices where price touches or drops below lower Bollinger Band."""
    hits = []
    for i in range(len(df)):
        if pd.notna(df["bb_lower"].iloc[i]):
            lower = df["bb_lower"].iloc[i]
            close = df["close"].iloc[i]
            if close <= lower * (1 + touch_pct):
                hits.append(i)
    return hits


def detect_bollinger_neutral(df: pd.DataFrame) -> list[int]:
    """Find indices where price is near the middle Bollinger Band."""
    hits = []
    for i in range(len(df)):
        if pd.notna(df["bb_middle"].iloc[i]) and pd.notna(df["bb_upper"].iloc[i]):
            mid = df["bb_middle"].iloc[i]
            upper = df["bb_upper"].iloc[i]
            lower = df["bb_lower"].iloc[i]
            close = df["close"].iloc[i]
            band_width = upper - lower
            if band_width > 0 and abs(close - mid) / band_width < 0.15:
                hits.append(i)
    return hits


def detect_macd_buy(df: pd.DataFrame) -> list[int]:
    """Find indices where MACD crosses above signal line (bullish crossover)."""
    hits = []
    macd = df["macd_line"]
    signal = df["macd_signal"]
    for i in range(1, len(df)):
        if (pd.notna(macd.iloc[i]) and pd.notna(signal.iloc[i]) and
            pd.notna(macd.iloc[i-1]) and pd.notna(signal.iloc[i-1])):
            if macd.iloc[i-1] <= signal.iloc[i-1] and macd.iloc[i] > signal.iloc[i]:
                hits.append(i)
    return hits


def detect_macd_neutral(df: pd.DataFrame) -> list[int]:
    """Find indices where MACD and signal are close together with small histogram."""
    hits = []
    hist = df["macd_histogram"]
    close = df["close"]
    for i in range(len(df)):
        if pd.notna(hist.iloc[i]) and pd.notna(close.iloc[i]):
            # Histogram less than 0.2% of price = basically flat
            if abs(hist.iloc[i]) < close.iloc[i] * 0.002:
                hits.append(i)
    return hits


def detect_ma_crossover_buy(df: pd.DataFrame) -> list[int]:
    """Find indices where SMA 20 crosses above SMA 50 (golden cross)."""
    hits = []
    short = df["sma_20"]
    long = df["sma_50"]
    for i in range(1, len(df)):
        if (pd.notna(short.iloc[i]) and pd.notna(long.iloc[i]) and
            pd.notna(short.iloc[i-1]) and pd.notna(long.iloc[i-1])):
            if short.iloc[i-1] <= long.iloc[i-1] and short.iloc[i] > long.iloc[i]:
                hits.append(i)
    return hits


def detect_ma_crossover_neutral(df: pd.DataFrame) -> list[int]:
    """Find indices where both MAs are close and roughly parallel."""
    hits = []
    short = df["sma_20"]
    long = df["sma_50"]
    close = df["close"]
    for i in range(len(df)):
        if pd.notna(short.iloc[i]) and pd.notna(long.iloc[i]):
            gap = abs(short.iloc[i] - long.iloc[i])
            if gap < close.iloc[i] * 0.005:  # Within 0.5% of each other
                hits.append(i)
    return hits


def detect_stochastic_buy(df: pd.DataFrame, threshold: float) -> list[int]:
    """Find indices where Stochastic %K crosses above %D in oversold zone."""
    hits = []
    k = df["stoch_k"]
    d = df["stoch_d"]
    for i in range(1, len(df)):
        if (pd.notna(k.iloc[i]) and pd.notna(d.iloc[i]) and
            pd.notna(k.iloc[i-1]) and pd.notna(d.iloc[i-1])):
            if k.iloc[i] < threshold and k.iloc[i-1] <= d.iloc[i-1] and k.iloc[i] > d.iloc[i]:
                hits.append(i)
    return hits


def detect_stochastic_neutral(df: pd.DataFrame) -> list[int]:
    """Find indices where Stochastic is in the middle zone (30-70)."""
    hits = []
    k = df["stoch_k"]
    for i in range(len(df)):
        if pd.notna(k.iloc[i]) and 30 <= k.iloc[i] <= 70:
            hits.append(i)
    return hits


def detect_macd_fakeout(df: pd.DataFrame) -> list[int]:
    """Find indices where MACD crosses up then reverses back within 10 bars."""
    hits = []
    macd = df["macd_line"]
    signal = df["macd_signal"]
    for i in range(1, len(df) - 10):
        if (pd.notna(macd.iloc[i]) and pd.notna(signal.iloc[i]) and
            pd.notna(macd.iloc[i-1]) and pd.notna(signal.iloc[i-1])):
            # Bullish crossover at i
            if macd.iloc[i-1] <= signal.iloc[i-1] and macd.iloc[i] > signal.iloc[i]:
                # Check if it reverses back within 10 bars
                for j in range(i + 1, min(i + 11, len(df))):
                    if pd.notna(macd.iloc[j]) and pd.notna(signal.iloc[j]):
                        if macd.iloc[j] < signal.iloc[j]:
                            hits.append(j)  # Use the reversal point
                            break
    return hits


def detect_macd_breakout(df: pd.DataFrame) -> list[int]:
    """Find indices where MACD crosses up and stays above for 10+ bars."""
    hits = []
    macd = df["macd_line"]
    signal = df["macd_signal"]
    for i in range(1, len(df) - 15):
        if (pd.notna(macd.iloc[i]) and pd.notna(signal.iloc[i]) and
            pd.notna(macd.iloc[i-1]) and pd.notna(signal.iloc[i-1])):
            # Bullish crossover at i
            if macd.iloc[i-1] <= signal.iloc[i-1] and macd.iloc[i] > signal.iloc[i]:
                # Check it stays above for 10+ bars
                sustained = True
                for j in range(i + 1, min(i + 11, len(df))):
                    if pd.notna(macd.iloc[j]) and pd.notna(signal.iloc[j]):
                        if macd.iloc[j] <= signal.iloc[j]:
                            sustained = False
                            break
                    else:
                        sustained = False
                        break
                if sustained:
                    hits.append(i + 10)  # Point after confirmation
    return hits


def detect_confluence_buy(df: pd.DataFrame, rsi_threshold: float) -> list[int]:
    """Find indices where both RSI is oversold AND MACD histogram is turning positive."""
    hits = []
    rsi = df["rsi"]
    hist = df["macd_histogram"]
    for i in range(1, len(df)):
        if (pd.notna(rsi.iloc[i]) and pd.notna(hist.iloc[i]) and pd.notna(hist.iloc[i-1])):
            if rsi.iloc[i] < rsi_threshold and hist.iloc[i] > 0 and hist.iloc[i-1] <= 0:
                hits.append(i)
    return hits


def detect_confluence_sell(df: pd.DataFrame, rsi_threshold: float) -> list[int]:
    """Find indices where both RSI is overbought AND MACD histogram is turning negative."""
    hits = []
    rsi = df["rsi"]
    hist = df["macd_histogram"]
    for i in range(1, len(df)):
        if (pd.notna(rsi.iloc[i]) and pd.notna(hist.iloc[i]) and pd.notna(hist.iloc[i-1])):
            if rsi.iloc[i] > rsi_threshold and hist.iloc[i] < 0 and hist.iloc[i-1] >= 0:
                hits.append(i)
    return hits


def detect_confluence_wait(df: pd.DataFrame, buy_thresh: float, sell_thresh: float) -> list[int]:
    """Find indices where RSI and MACD disagree (one bullish, one bearish)."""
    hits = []
    rsi = df["rsi"]
    hist = df["macd_histogram"]
    for i in range(len(df)):
        if pd.notna(rsi.iloc[i]) and pd.notna(hist.iloc[i]):
            rsi_val = rsi.iloc[i]
            hist_val = hist.iloc[i]
            # RSI oversold but MACD bearish
            if rsi_val < buy_thresh and hist_val < 0:
                hits.append(i)
            # RSI overbought but MACD bullish
            elif rsi_val > sell_thresh and hist_val > 0:
                hits.append(i)
    return hits
