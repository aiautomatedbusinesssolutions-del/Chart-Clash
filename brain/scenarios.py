"""Build scenario JSON objects from detected signal windows."""

import random
import pandas as pd
from config import WINDOW_SIZE, INDICATOR_META, THRESHOLDS
from indicators import (
    detect_rsi_buy, detect_rsi_neutral, detect_rsi_sell,
    detect_bollinger_buy, detect_bollinger_neutral,
    detect_macd_buy, detect_macd_neutral,
    detect_ma_crossover_buy, detect_ma_crossover_neutral,
    detect_stochastic_buy, detect_stochastic_neutral,
    detect_macd_fakeout, detect_macd_breakout,
    detect_confluence_buy, detect_confluence_sell, detect_confluence_wait,
)

# ============================================================
# Helpers
# ============================================================

def extract_window(df: pd.DataFrame, signal_idx: int, size: int = WINDOW_SIZE) -> pd.DataFrame | None:
    """Extract a window of candles ending near the signal point."""
    # Signal should be in the last quarter of the window
    end = min(signal_idx + size // 6, len(df))
    start = end - size
    if start < 0:
        return None
    return df.iloc[start:end].copy().reset_index(drop=True)


def window_to_candles(window: pd.DataFrame) -> list[dict]:
    """Convert DataFrame window to frontend CandleData format."""
    candles = []
    for _, row in window.iterrows():
        candles.append({
            "time": int(row["time"]),
            "open": round(float(row["open"]), 2),
            "high": round(float(row["high"]), 2),
            "low": round(float(row["low"]), 2),
            "close": round(float(row["close"]), 2),
            "volume": int(row["volume"]),
        })
    return candles


def build_rsi_indicator(window: pd.DataFrame) -> dict:
    """Build RSI indicator data matching frontend RSIIndicatorData."""
    values = []
    for _, row in window.iterrows():
        if pd.notna(row["rsi"]):
            values.append({"time": int(row["time"]), "value": round(float(row["rsi"]), 4)})
    return {"type": "rsi", "values": values}


def build_bollinger_indicator(window: pd.DataFrame) -> dict:
    """Build Bollinger indicator data matching frontend BollingerIndicatorData."""
    upper, middle, lower = [], [], []
    for _, row in window.iterrows():
        t = int(row["time"])
        if pd.notna(row["bb_upper"]):
            upper.append({"time": t, "value": round(float(row["bb_upper"]), 4)})
        if pd.notna(row["bb_middle"]):
            middle.append({"time": t, "value": round(float(row["bb_middle"]), 4)})
        if pd.notna(row["bb_lower"]):
            lower.append({"time": t, "value": round(float(row["bb_lower"]), 4)})
    return {"type": "bollinger", "upper": upper, "middle": middle, "lower": lower}


def build_macd_indicator(window: pd.DataFrame) -> dict:
    """Build MACD indicator data matching frontend MACDIndicatorData."""
    macd_line, signal_line, histogram = [], [], []
    for _, row in window.iterrows():
        t = int(row["time"])
        if pd.notna(row["macd_line"]):
            macd_line.append({"time": t, "value": round(float(row["macd_line"]), 4)})
        if pd.notna(row["macd_signal"]):
            signal_line.append({"time": t, "value": round(float(row["macd_signal"]), 4)})
        if pd.notna(row["macd_histogram"]):
            val = round(float(row["macd_histogram"]), 4)
            color = "#34d399" if val >= 0 else "#fb7185"
            histogram.append({"time": t, "value": val, "color": color})
    return {"type": "macd", "macdLine": macd_line, "signalLine": signal_line, "histogram": histogram}


def build_ma_crossover_indicator(window: pd.DataFrame) -> dict:
    """Build MA Crossover indicator data matching frontend MACrossoverIndicatorData."""
    short_ma, long_ma = [], []
    for _, row in window.iterrows():
        t = int(row["time"])
        if pd.notna(row["sma_20"]):
            short_ma.append({"time": t, "value": round(float(row["sma_20"]), 4)})
        if pd.notna(row["sma_50"]):
            long_ma.append({"time": t, "value": round(float(row["sma_50"]), 4)})
    return {"type": "ma_crossover", "shortMA": short_ma, "longMA": long_ma}


def build_stochastic_indicator(window: pd.DataFrame) -> dict:
    """Build Stochastic indicator data matching frontend StochasticIndicatorData."""
    k_line, d_line = [], []
    for _, row in window.iterrows():
        t = int(row["time"])
        if pd.notna(row["stoch_k"]):
            k_line.append({"time": t, "value": round(float(row["stoch_k"]), 4)})
        if pd.notna(row["stoch_d"]):
            d_line.append({"time": t, "value": round(float(row["stoch_d"]), 4)})
    return {"type": "stochastic", "kLine": k_line, "dLine": d_line}


INDICATOR_BUILDERS = {
    "rsi": build_rsi_indicator,
    "bollinger": build_bollinger_indicator,
    "macd": build_macd_indicator,
    "ma_crossover": build_ma_crossover_indicator,
    "stochastic": build_stochastic_indicator,
}

# ============================================================
# Level 1: Indicator Recognition
# ============================================================

INDICATOR_PAIRS = [
    ("rsi", "bollinger"), ("rsi", "macd"), ("rsi", "stochastic"),
    ("bollinger", "rsi"), ("bollinger", "macd"),
    ("macd", "rsi"), ("macd", "bollinger"),
    ("ma_crossover", "rsi"), ("ma_crossover", "stochastic"),
    ("stochastic", "rsi"), ("stochastic", "bollinger"), ("stochastic", "macd"),
]

BUY_DETECTORS = {
    "rsi": lambda df, t: detect_rsi_buy(df, t["rsi_buy"]),
    "bollinger": lambda df, t: detect_bollinger_buy(df, t["bb_touch_pct"]),
    "macd": lambda df, _: detect_macd_buy(df),
    "ma_crossover": lambda df, _: detect_ma_crossover_buy(df),
    "stochastic": lambda df, t: detect_stochastic_buy(df, t["stoch_buy"]),
}

NEUTRAL_DETECTORS = {
    "rsi": lambda df, t: detect_rsi_neutral(df, t["rsi_neutral"][0], t["rsi_neutral"][1]),
    "bollinger": lambda df, _: detect_bollinger_neutral(df),
    "macd": lambda df, _: detect_macd_neutral(df),
    "ma_crossover": lambda df, _: detect_ma_crossover_neutral(df),
    "stochastic": lambda df, _: detect_stochastic_neutral(df),
}


def build_level1_scenarios(
    all_data: dict[str, pd.DataFrame],
    difficulty: str,
) -> list[dict]:
    """Build Level 1 scenarios from real data."""
    thresholds = THRESHOLDS[difficulty]
    scenarios = []
    scenario_id = 0

    for pair_idx, (buy_ind, neutral_ind) in enumerate(INDICATOR_PAIRS):
        for symbol, df in all_data.items():
            if len(scenarios) >= 20:
                break

            buy_hits = BUY_DETECTORS[buy_ind](df, thresholds)
            neutral_hits = NEUTRAL_DETECTORS[neutral_ind](df, thresholds)

            if not buy_hits or not neutral_hits:
                continue

            # Pick a buy signal and a neutral signal that don't overlap
            random.shuffle(buy_hits)
            random.shuffle(neutral_hits)

            for buy_idx in buy_hits[:3]:
                buy_window = extract_window(df, buy_idx)
                if buy_window is None or len(buy_window) < WINDOW_SIZE:
                    continue

                for neutral_idx in neutral_hits[:3]:
                    if abs(buy_idx - neutral_idx) < WINDOW_SIZE:
                        continue  # Too close, would be same data

                    neutral_window = extract_window(df, neutral_idx)
                    if neutral_window is None or len(neutral_window) < WINDOW_SIZE:
                        continue

                    buy_on_a = random.random() > 0.5
                    buy_meta = INDICATOR_META[buy_ind]
                    neutral_meta = INDICATOR_META[neutral_ind]
                    buy_label = f"{buy_meta['friendlyName']} ({buy_meta['technicalName']})"
                    neutral_label = f"{neutral_meta['friendlyName']} ({neutral_meta['technicalName']})"
                    chart = "A" if buy_on_a else "B"
                    other = "B" if buy_on_a else "A"

                    buy_candles = window_to_candles(buy_window)
                    neutral_candles = window_to_candles(neutral_window)
                    buy_indicator = INDICATOR_BUILDERS[buy_ind](buy_window)
                    neutral_indicator = INDICATOR_BUILDERS[neutral_ind](neutral_window)

                    scenario = {
                        "id": f"l1-{difficulty}-{scenario_id}",
                        "level": 1,
                        "difficulty": difficulty,
                        "question": "Which chart is showing a potential buy condition?",
                        "chartA": {
                            "candles": buy_candles if buy_on_a else neutral_candles,
                            "indicator": buy_indicator if buy_on_a else neutral_indicator,
                            "label": f"Chart A — {buy_label if buy_on_a else neutral_label}",
                        },
                        "chartB": {
                            "candles": neutral_candles if buy_on_a else buy_candles,
                            "indicator": neutral_indicator if buy_on_a else buy_indicator,
                            "label": f"Chart B — {neutral_label if buy_on_a else buy_label}",
                        },
                        "correctAnswer": "A" if buy_on_a else "B",
                        "explanation": {
                            "headline": f"Chart {chart} is showing a potential buy condition",
                            "detail": (
                                f"The {buy_meta['friendlyName']} ({buy_meta['technicalName']}) "
                                f"on Chart {chart} {buy_meta['buyDescription']}. "
                                f"Meanwhile, Chart {other}'s {neutral_meta['friendlyName']} "
                                f"({neutral_meta['technicalName']}) {neutral_meta['neutralDescription']}."
                            ),
                            "lesson": (
                                f"{buy_meta['friendlyName']} ({buy_meta['technicalName']}): "
                                f"{buy_meta['description']}. When it reaches extreme levels, "
                                f"it can historically signal a potential opportunity — "
                                f"but always look for confirmation from other indicators."
                            ),
                            "disclaimer": "This is for educational purposes only. Past patterns do not guarantee future results.",
                        },
                    }
                    scenarios.append(scenario)
                    scenario_id += 1

                    if len(scenarios) >= 20:
                        break
                if len(scenarios) >= 20:
                    break
            if len(scenarios) >= 20:
                break

    random.shuffle(scenarios)
    # Re-number IDs
    for i, s in enumerate(scenarios):
        s["id"] = f"l1-{difficulty}-{i}"
    return scenarios


# ============================================================
# Level 2: Fakeout vs Breakout
# ============================================================

def build_level2_scenarios(
    all_data: dict[str, pd.DataFrame],
    difficulty: str,
) -> list[dict]:
    """Build Level 2 scenarios from real data."""
    scenarios = []
    scenario_id = 0

    fakeout_windows = []
    breakout_windows = []

    for symbol, df in all_data.items():
        fakeout_hits = detect_macd_fakeout(df)
        for idx in fakeout_hits:
            window = extract_window(df, idx)
            if window is not None and len(window) >= WINDOW_SIZE:
                fakeout_windows.append((symbol, window))

        breakout_hits = detect_macd_breakout(df)
        for idx in breakout_hits:
            window = extract_window(df, idx)
            if window is not None and len(window) >= WINDOW_SIZE:
                breakout_windows.append((symbol, window))

    random.shuffle(fakeout_windows)
    random.shuffle(breakout_windows)

    # Pair up fakeouts with breakouts
    pairs = min(len(fakeout_windows), len(breakout_windows), 20)
    for i in range(pairs):
        fake_sym, fake_window = fakeout_windows[i]
        break_sym, break_window = breakout_windows[i]

        breakout_on_a = random.random() > 0.5
        stock_label = f"{break_sym}" if breakout_on_a else f"{fake_sym}"

        fake_candles = window_to_candles(fake_window)
        fake_macd = build_macd_indicator(fake_window)
        break_candles = window_to_candles(break_window)
        break_macd = build_macd_indicator(break_window)

        # Assign timeframes
        fakeout_is_daily = difficulty != "hard" or random.random() > 0.5
        daily_tf = "Daily" if fakeout_is_daily else "Weekly"
        weekly_tf = "Weekly" if fakeout_is_daily else "Daily"

        scenario = {
            "id": f"l2-{difficulty}-{scenario_id}",
            "level": 2,
            "difficulty": difficulty,
            "question": "Which chart shows a more reliable buy signal — and which might be a trap?",
            "stockLabel": stock_label,
            "chartA": {
                "candles": break_candles if breakout_on_a else fake_candles,
                "indicator": break_macd if breakout_on_a else fake_macd,
                "label": f"Chart A — {weekly_tf if breakout_on_a else daily_tf} View",
                "timeframe": weekly_tf.lower() if breakout_on_a else daily_tf.lower(),
            },
            "chartB": {
                "candles": fake_candles if breakout_on_a else break_candles,
                "indicator": fake_macd if breakout_on_a else break_macd,
                "label": f"Chart B — {daily_tf if breakout_on_a else weekly_tf} View",
                "timeframe": daily_tf.lower() if breakout_on_a else weekly_tf.lower(),
            },
            "correctAnswer": "A" if breakout_on_a else "B",
            "explanation": {
                "headline": f"Chart {'A' if breakout_on_a else 'B'} shows the more reliable signal",
                "detail": (
                    f"The {'daily' if fakeout_is_daily else 'weekly'} chart's Trend Momentum crossed "
                    f"briefly but quickly faded — a classic fakeout. The "
                    f"{'weekly' if fakeout_is_daily else 'daily'} chart shows sustained momentum "
                    f"with growing bars, suggesting a more genuine shift."
                ),
                "lesson": (
                    "When a short-term chart says \"go\" but the bigger picture disagrees, "
                    "the bigger picture usually wins. Always check multiple timeframes before acting on a signal."
                ),
                "disclaimer": "This is for educational purposes only. Past patterns do not guarantee future results.",
            },
        }
        scenarios.append(scenario)
        scenario_id += 1

    random.shuffle(scenarios)
    for i, s in enumerate(scenarios):
        s["id"] = f"l2-{difficulty}-{i}"
    return scenarios


# ============================================================
# Level 3: Confluence
# ============================================================

def build_level3_scenarios(
    all_data: dict[str, pd.DataFrame],
    difficulty: str,
) -> list[dict]:
    """Build Level 3 scenarios from real data."""
    thresholds = THRESHOLDS[difficulty]
    scenarios = []
    scenario_id = 0

    buy_windows = []
    sell_windows = []
    wait_windows = []

    for symbol, df in all_data.items():
        for idx in detect_confluence_buy(df, thresholds["rsi_buy"]):
            window = extract_window(df, idx)
            if window is not None and len(window) >= WINDOW_SIZE:
                buy_windows.append((symbol, window))

        for idx in detect_confluence_sell(df, thresholds["rsi_sell"]):
            window = extract_window(df, idx)
            if window is not None and len(window) >= WINDOW_SIZE:
                sell_windows.append((symbol, window))

        for idx in detect_confluence_wait(df, thresholds["rsi_buy"], thresholds["rsi_sell"]):
            window = extract_window(df, idx)
            if window is not None and len(window) >= WINDOW_SIZE:
                wait_windows.append((symbol, window))

    random.shuffle(buy_windows)
    random.shuffle(sell_windows)
    random.shuffle(wait_windows)

    # Build balanced scenarios: ~4 buy, ~4 sell, ~4 wait
    def add_scenarios(windows, answer, target_count):
        nonlocal scenario_id
        count = 0
        for sym, window in windows:
            if count >= target_count:
                break

            candles = window_to_candles(window)
            rsi_data = build_rsi_indicator(window)
            macd_data = build_macd_indicator(window)

            # Get last RSI value for explanation
            rsi_vals = [v["value"] for v in rsi_data["values"]]
            last_rsi = rsi_vals[-1] if rsi_vals else 50

            if answer == "buy":
                explanation = {
                    "headline": "Both indicators suggest a potential buying opportunity",
                    "rsiReason": (
                        f"The Momentum Meter dropped to around {round(last_rsi)}, "
                        f"which is in the oversold zone. Historically, this suggests "
                        f"sellers may have pushed the price too low."
                    ),
                    "macdReason": (
                        "The Trend Momentum histogram is turning positive, "
                        "showing momentum may be shifting upward."
                    ),
                    "confluenceReason": (
                        'When two different indicators flash the same signal, it\'s called '
                        '"confluence." It\'s like getting a second opinion — when both agree, '
                        "you can have more confidence in the signal."
                    ),
                    "disclaimer": "This is for educational purposes only. Past patterns do not guarantee future results.",
                }
            elif answer == "sell":
                explanation = {
                    "headline": "Both indicators suggest a potential selling opportunity",
                    "rsiReason": (
                        f"The Momentum Meter climbed to around {round(last_rsi)}, "
                        f"which is in the overbought zone. Historically, this suggests "
                        f"buyers may have pushed the price too high."
                    ),
                    "macdReason": (
                        "The Trend Momentum histogram is turning negative, "
                        "showing momentum may be shifting downward."
                    ),
                    "confluenceReason": (
                        "Both indicators are flashing the same warning — the price may have "
                        "gotten ahead of itself. When they agree, the signal carries more weight."
                    ),
                    "disclaimer": "This is for educational purposes only. Past patterns do not guarantee future results.",
                }
            else:  # wait
                explanation = {
                    "headline": "The indicators disagree — best to wait for confirmation",
                    "rsiReason": (
                        "The Momentum Meter is sending one signal, but it's not "
                        "extreme enough to be decisive on its own."
                    ),
                    "macdReason": (
                        "The Trend Momentum is telling a different story, suggesting "
                        "momentum hasn't fully committed to a direction."
                    ),
                    "confluenceReason": (
                        "When indicators disagree, it's like two friends giving opposite advice. "
                        "The safest move is to wait until they start agreeing before making a decision."
                    ),
                    "disclaimer": "This is for educational purposes only. Past patterns do not guarantee future results.",
                }

            scenario = {
                "id": f"l3-{difficulty}-{scenario_id}",
                "level": 3,
                "difficulty": difficulty,
                "question": "Based on both indicators, what action does this chart suggest?",
                "chart": {
                    "candles": candles,
                    "rsi": rsi_data,
                    "macd": macd_data,
                },
                "options": [
                    {"id": "buy", "label": "Buy", "description": "Both indicators agree: likely time to buy"},
                    {"id": "wait", "label": "Wait", "description": "Mixed signals: wait for confirmation"},
                    {"id": "sell", "label": "Sell", "description": "Both indicators agree: likely time to sell"},
                ],
                "correctAnswer": answer,
                "explanation": explanation,
            }
            scenarios.append(scenario)
            scenario_id += 1
            count += 1

    add_scenarios(buy_windows, "buy", 7)
    add_scenarios(sell_windows, "sell", 7)
    add_scenarios(wait_windows, "wait", 6)

    random.shuffle(scenarios)
    for i, s in enumerate(scenarios):
        s["id"] = f"l3-{difficulty}-{i}"
    return scenarios
