"""Compute technical indicators and detect signal conditions."""

import numpy as np
import pandas as pd
import ta
from config import INDICATOR_PARAMS

CONFLUENCE_LOOKBACK = 5


def compute_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Add all 5 indicator columns to the DataFrame."""
    close = df["close"]
    high = df["high"]
    low = df["low"]

    # RSI
    df["rsi"] = ta.momentum.rsi(close, window=INDICATOR_PARAMS["rsi_window"])

    # Bollinger Bands
    bb = ta.volatility.BollingerBands(
        close,
        window=INDICATOR_PARAMS["bb_window"],
        window_dev=INDICATOR_PARAMS["bb_std"],
    )
    df["bb_upper"] = bb.bollinger_hband()
    df["bb_middle"] = bb.bollinger_mavg()
    df["bb_lower"] = bb.bollinger_lband()

    # MACD
    macd_ind = ta.trend.MACD(
        close,
        window_fast=INDICATOR_PARAMS["macd_fast"],
        window_slow=INDICATOR_PARAMS["macd_slow"],
        window_sign=INDICATOR_PARAMS["macd_signal"],
    )
    df["macd_line"] = macd_ind.macd()
    df["macd_signal"] = macd_ind.macd_signal()
    df["macd_histogram"] = macd_ind.macd_diff()

    # Moving Average Crossover
    df["sma_20"] = ta.trend.sma_indicator(close, window=INDICATOR_PARAMS["sma_short"])
    df["sma_50"] = ta.trend.sma_indicator(close, window=INDICATOR_PARAMS["sma_long"])

    # Stochastic Oscillator
    stoch = ta.momentum.StochasticOscillator(
        high, low, close,
        window=INDICATOR_PARAMS["stoch_window"],
        smooth_window=INDICATOR_PARAMS["stoch_smooth"],
    )
    df["stoch_k"] = stoch.stoch()
    df["stoch_d"] = stoch.stoch_signal()

    return df


# ============================================================
# Simple threshold detectors (vectorized)
# ============================================================

def detect_rsi_buy(df: pd.DataFrame, threshold: float) -> list[int]:
    """Find indices where RSI dips below threshold (buy signal)."""
    rsi = df["rsi"]
    mask = rsi.notna() & (rsi < threshold)
    return mask[mask].index.tolist()


def detect_rsi_sell(df: pd.DataFrame, threshold: float) -> list[int]:
    """Find indices where RSI rises above threshold (sell signal)."""
    rsi = df["rsi"]
    mask = rsi.notna() & (rsi > threshold)
    return mask[mask].index.tolist()


def detect_rsi_neutral(df: pd.DataFrame, low: float, high: float) -> list[int]:
    """Find indices where RSI is in the neutral zone."""
    rsi = df["rsi"]
    mask = rsi.notna() & (rsi >= low) & (rsi <= high)
    return mask[mask].index.tolist()


def detect_bollinger_buy(df: pd.DataFrame, touch_pct: float) -> list[int]:
    """Find indices where price touches or drops below lower Bollinger Band."""
    mask = df["bb_lower"].notna() & (df["close"] <= df["bb_lower"] * (1 + touch_pct))
    return mask[mask].index.tolist()


def detect_bollinger_sell(df: pd.DataFrame, touch_pct: float) -> list[int]:
    """Find indices where price touches or rises above upper Bollinger Band."""
    mask = df["bb_upper"].notna() & (df["close"] >= df["bb_upper"] * (1 - touch_pct))
    return mask[mask].index.tolist()


def detect_bollinger_neutral(df: pd.DataFrame) -> list[int]:
    """Find indices where price is near the middle Bollinger Band."""
    valid = df["bb_middle"].notna() & df["bb_upper"].notna() & df["bb_lower"].notna()
    band_width = df["bb_upper"] - df["bb_lower"]
    distance = (df["close"] - df["bb_middle"]).abs()
    mask = valid & (band_width > 0) & (distance / band_width < 0.15)
    return mask[mask].index.tolist()


def detect_stochastic_neutral(df: pd.DataFrame) -> list[int]:
    """Find indices where Stochastic is in the middle zone (30-70)."""
    k = df["stoch_k"]
    mask = k.notna() & (k >= 30) & (k <= 70)
    return mask[mask].index.tolist()


def detect_macd_neutral(df: pd.DataFrame) -> list[int]:
    """Find indices where MACD and signal are close together with small histogram."""
    hist = df["macd_histogram"]
    close = df["close"]
    mask = hist.notna() & close.notna() & (hist.abs() < close * 0.002)
    return mask[mask].index.tolist()


def detect_ma_crossover_neutral(df: pd.DataFrame) -> list[int]:
    """Find indices where both MAs are close and roughly parallel."""
    short = df["sma_20"]
    long = df["sma_50"]
    valid = short.notna() & long.notna()
    gap = (short - long).abs()
    mask = valid & (gap < df["close"] * 0.005)
    return mask[mask].index.tolist()


# ============================================================
# Crossover detectors (vectorized with shift)
# ============================================================

def _detect_crossover_above(series_a: pd.Series, series_b: pd.Series) -> list[int]:
    """Find indices where series_a crosses above series_b."""
    valid = series_a.notna() & series_b.notna() & series_a.shift(1).notna() & series_b.shift(1).notna()
    crossed = valid & (series_a.shift(1) <= series_b.shift(1)) & (series_a > series_b)
    return crossed[crossed].index.tolist()


def _detect_crossover_below(series_a: pd.Series, series_b: pd.Series) -> list[int]:
    """Find indices where series_a crosses below series_b."""
    valid = series_a.notna() & series_b.notna() & series_a.shift(1).notna() & series_b.shift(1).notna()
    crossed = valid & (series_a.shift(1) >= series_b.shift(1)) & (series_a < series_b)
    return crossed[crossed].index.tolist()


def detect_macd_buy(df: pd.DataFrame) -> list[int]:
    """Find indices where MACD crosses above signal line (bullish crossover)."""
    return _detect_crossover_above(df["macd_line"], df["macd_signal"])


def detect_macd_sell(df: pd.DataFrame) -> list[int]:
    """Find indices where MACD crosses below signal line (bearish crossover)."""
    return _detect_crossover_below(df["macd_line"], df["macd_signal"])


def detect_ma_crossover_buy(df: pd.DataFrame) -> list[int]:
    """Find indices where SMA 20 crosses above SMA 50 (golden cross)."""
    return _detect_crossover_above(df["sma_20"], df["sma_50"])


def detect_ma_crossover_sell(df: pd.DataFrame) -> list[int]:
    """Find indices where SMA 20 crosses below SMA 50 (death cross)."""
    return _detect_crossover_below(df["sma_20"], df["sma_50"])


def detect_stochastic_buy(df: pd.DataFrame, threshold: float) -> list[int]:
    """Find indices where Stochastic %K crosses above %D in oversold zone."""
    k, d = df["stoch_k"], df["stoch_d"]
    valid = k.notna() & d.notna() & k.shift(1).notna() & d.shift(1).notna()
    crossed = valid & (k < threshold) & (k.shift(1) <= d.shift(1)) & (k > d)
    return crossed[crossed].index.tolist()


def detect_stochastic_sell(df: pd.DataFrame, threshold: float) -> list[int]:
    """Find indices where Stochastic %K crosses below %D in overbought zone."""
    k, d = df["stoch_k"], df["stoch_d"]
    valid = k.notna() & d.notna() & k.shift(1).notna() & d.shift(1).notna()
    crossed = valid & (k > threshold) & (k.shift(1) >= d.shift(1)) & (k < d)
    return crossed[crossed].index.tolist()


# ============================================================
# Confluence detectors (vectorized with rolling)
# ============================================================

def detect_confluence_buy(df: pd.DataFrame, rsi_threshold: float) -> list[int]:
    """Find indices where RSI was recently oversold AND MACD histogram is positive."""
    rsi = df["rsi"]
    hist = df["macd_histogram"]
    # Check if RSI was below threshold in rolling window
    rsi_was_oversold = (rsi < rsi_threshold).rolling(window=CONFLUENCE_LOOKBACK + 1, min_periods=1).max().astype(bool)
    mask = hist.notna() & (hist > 0) & rsi_was_oversold
    return mask[mask].index.tolist()


def detect_confluence_sell(df: pd.DataFrame, rsi_threshold: float) -> list[int]:
    """Find indices where RSI was recently overbought AND MACD histogram is negative."""
    rsi = df["rsi"]
    hist = df["macd_histogram"]
    rsi_was_overbought = (rsi > rsi_threshold).rolling(window=CONFLUENCE_LOOKBACK + 1, min_periods=1).max().astype(bool)
    mask = hist.notna() & (hist < 0) & rsi_was_overbought
    return mask[mask].index.tolist()


def detect_confluence_wait(df: pd.DataFrame, buy_thresh: float, sell_thresh: float) -> list[int]:
    """Find indices where RSI and MACD disagree (one bullish, one bearish)."""
    rsi = df["rsi"]
    hist = df["macd_histogram"]
    valid = rsi.notna() & hist.notna()
    # RSI oversold but MACD bearish, or RSI overbought but MACD bullish
    disagree = ((rsi < buy_thresh) & (hist < 0)) | ((rsi > sell_thresh) & (hist > 0))
    mask = valid & disagree
    return mask[mask].index.tolist()
