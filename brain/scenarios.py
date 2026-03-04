"""Build scenario JSON objects from detected signal windows."""

import random
import pandas as pd
from config import WINDOW_SIZE, INDICATOR_META, THRESHOLDS, MAX_CANDIDATES_PER_TYPE
from indicators import (
    detect_rsi_buy, detect_rsi_neutral, detect_rsi_sell,
    detect_bollinger_buy, detect_bollinger_neutral, detect_bollinger_sell,
    detect_macd_buy, detect_macd_neutral, detect_macd_sell,
    detect_ma_crossover_buy, detect_ma_crossover_neutral, detect_ma_crossover_sell,
    detect_stochastic_buy, detect_stochastic_neutral, detect_stochastic_sell,
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
    """Build Level 1 scenarios with balanced indicator distribution."""
    thresholds = THRESHOLDS[difficulty]

    # Group pairs by buy indicator type
    pairs_by_type: dict[str, list[tuple[str, str]]] = {}
    for buy_ind, neutral_ind in INDICATOR_PAIRS:
        pairs_by_type.setdefault(buy_ind, []).append((buy_ind, neutral_ind))

    # Collect candidate scenarios per buy indicator type (max 8 each)
    candidates: dict[str, list[dict]] = {t: [] for t in pairs_by_type}
    MAX_PER_TYPE = MAX_CANDIDATES_PER_TYPE

    for buy_type, pairs in pairs_by_type.items():
        for buy_ind, neutral_ind in pairs:
            if len(candidates[buy_type]) >= MAX_PER_TYPE:
                break
            for symbol, df in all_data.items():
                if len(candidates[buy_type]) >= MAX_PER_TYPE:
                    break

                buy_hits = BUY_DETECTORS[buy_ind](df, thresholds)
                neutral_hits = NEUTRAL_DETECTORS[neutral_ind](df, thresholds)

                if not buy_hits or not neutral_hits:
                    continue

                random.shuffle(buy_hits)
                random.shuffle(neutral_hits)

                for buy_idx in buy_hits[:3]:
                    if len(candidates[buy_type]) >= MAX_PER_TYPE:
                        break
                    buy_window = extract_window(df, buy_idx)
                    if buy_window is None or len(buy_window) < WINDOW_SIZE:
                        continue

                    for neutral_idx in neutral_hits[:3]:
                        if len(candidates[buy_type]) >= MAX_PER_TYPE:
                            break
                        if abs(buy_idx - neutral_idx) < WINDOW_SIZE:
                            continue

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
                        buy_indicator_data = INDICATOR_BUILDERS[buy_ind](buy_window)
                        neutral_indicator_data = INDICATOR_BUILDERS[neutral_ind](neutral_window)

                        scenario = {
                            "id": f"l1-{difficulty}-0",
                            "level": 1,
                            "difficulty": difficulty,
                            "question": "Which chart is showing a potential buy condition?",
                            "chartA": {
                                "candles": buy_candles if buy_on_a else neutral_candles,
                                "indicator": buy_indicator_data if buy_on_a else neutral_indicator_data,
                                "label": f"Chart A — {buy_label if buy_on_a else neutral_label}",
                            },
                            "chartB": {
                                "candles": neutral_candles if buy_on_a else buy_candles,
                                "indicator": neutral_indicator_data if buy_on_a else buy_indicator_data,
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
                        candidates[buy_type].append(scenario)
                        break  # One scenario per buy_idx to maximize variety

    # Log candidate counts
    for t, c in candidates.items():
        print(f"  {t}: {len(c)} candidates")

    # Balanced selection: distribute 20 slots across types with candidates
    types_with_candidates = [t for t in candidates if candidates[t]]
    if not types_with_candidates:
        return []

    target_per_type = 20 // len(types_with_candidates)
    remainder = 20 % len(types_with_candidates)

    scenarios = []
    overflow = []
    random.shuffle(types_with_candidates)

    for i, t in enumerate(types_with_candidates):
        target = target_per_type + (1 if i < remainder else 0)
        random.shuffle(candidates[t])
        take = min(target, len(candidates[t]))
        scenarios.extend(candidates[t][:take])
        if len(candidates[t]) > take:
            overflow.extend(candidates[t][take:])

    # Fill remaining slots from overflow
    needed = 20 - len(scenarios)
    if needed > 0 and overflow:
        random.shuffle(overflow)
        scenarios.extend(overflow[:needed])

    random.shuffle(scenarios)
    for i, s in enumerate(scenarios):
        s["id"] = f"l1-{difficulty}-{i}"
    return scenarios


# ============================================================
# Level 2: Read the Signal
# ============================================================

SELL_DETECTORS = {
    "rsi": lambda df, t: detect_rsi_sell(df, t["rsi_sell"]),
    "bollinger": lambda df, t: detect_bollinger_sell(df, t["bb_touch_pct"]),
    "macd": lambda df, _: detect_macd_sell(df),
    "ma_crossover": lambda df, _: detect_ma_crossover_sell(df),
    "stochastic": lambda df, t: detect_stochastic_sell(df, t["stoch_sell"]),
}

# Balanced rotation: 4 buy, 4 sell, 4 wait per difficulty
L2_ANSWER_ROTATION = [
    "buy", "sell", "wait", "buy", "sell", "wait",
    "buy", "sell", "wait", "buy", "sell", "buy",
    "sell", "wait", "buy", "sell", "wait", "buy",
    "sell", "wait",
]

# Cycle through all 5 indicator types
L2_INDICATOR_ROTATION = [
    "rsi", "bollinger", "macd", "ma_crossover", "stochastic",
    "rsi", "macd", "stochastic", "bollinger", "ma_crossover",
    "rsi", "macd", "bollinger", "stochastic", "ma_crossover",
    "rsi", "bollinger", "macd", "stochastic", "ma_crossover",
]


def _build_level2_explanation(indicator_type: str, answer: str) -> dict:
    """Build Level 2 explanation based on indicator and answer type."""
    meta = INDICATOR_META[indicator_type]
    friendly = f"{meta['friendlyName']} ({meta['technicalName']})"

    if answer == "buy":
        return {
            "headline": f"The {meta['friendlyName']} is showing a potential buy signal",
            "detail": (
                f"The {friendly} {meta['buyDescription']}. "
                f"This is one of the classic patterns that traders watch for when looking for buying opportunities."
            ),
            "lesson": (
                f"{friendly}: {meta['description']}. "
                f"Remember — no single indicator is perfect. In Level 3, you'll learn to combine "
                f"two indicators for stronger signals."
            ),
            "disclaimer": "This is for educational purposes only. Past patterns do not guarantee future results.",
        }
    elif answer == "sell":
        return {
            "headline": f"The {meta['friendlyName']} is showing a potential sell signal",
            "detail": (
                f"The {friendly} {meta['sellDescription']}. "
                f"This is one of the classic patterns that traders watch for when considering selling."
            ),
            "lesson": (
                f"{friendly}: {meta['description']}. "
                f"Sell signals are just as important as buy signals — knowing when to step back "
                f"is a key skill in reading charts."
            ),
            "disclaimer": "This is for educational purposes only. Past patterns do not guarantee future results.",
        }
    else:  # wait
        return {
            "headline": f"The {meta['friendlyName']} is not showing a clear signal — best to wait",
            "detail": (
                f"The {friendly} {meta['waitDescription']}. "
                f"When an indicator isn't giving a strong reading, patience is usually the best strategy."
            ),
            "lesson": (
                f"{friendly}: {meta['description']}. "
                f"Not every chart has a clear signal. Recognizing when to wait is just as valuable "
                f"as knowing when to buy or sell."
            ),
            "disclaimer": "This is for educational purposes only. Past patterns do not guarantee future results.",
        }


def build_level2_scenarios(
    all_data: dict[str, pd.DataFrame],
    difficulty: str,
) -> list[dict]:
    """Build Level 2 scenarios: single chart, single indicator, Buy/Sell/Wait."""
    thresholds = THRESHOLDS[difficulty]

    # Collect windows per (indicator, answer) combo
    candidates: dict[tuple[str, str], list[tuple[str, pd.DataFrame]]] = {}
    indicator_types = ["rsi", "bollinger", "macd", "ma_crossover", "stochastic"]

    for ind_type in indicator_types:
        for answer, detector_map in [("buy", BUY_DETECTORS), ("sell", SELL_DETECTORS), ("wait", NEUTRAL_DETECTORS)]:
            key = (ind_type, answer)
            candidates[key] = []
            detector = detector_map[ind_type]
            for symbol, df in all_data.items():
                hits = detector(df, thresholds)
                for idx in hits:
                    if len(candidates[key]) >= MAX_CANDIDATES_PER_TYPE:
                        break
                    window = extract_window(df, idx)
                    if window is not None and len(window) >= WINDOW_SIZE:
                        candidates[key].append((symbol, window))
                if len(candidates[key]) >= 8:
                    break

    # Build scenarios using rotation arrays
    scenarios = []
    used = 0
    for i in range(20):
        answer = L2_ANSWER_ROTATION[i % len(L2_ANSWER_ROTATION)]
        ind_type = L2_INDICATOR_ROTATION[i % len(L2_INDICATOR_ROTATION)]

        key = (ind_type, answer)
        pool = candidates.get(key, [])
        if not pool:
            # Fallback: try same answer with any indicator
            for fallback_ind in indicator_types:
                fallback_key = (fallback_ind, answer)
                if candidates.get(fallback_key):
                    pool = candidates[fallback_key]
                    ind_type = fallback_ind
                    key = fallback_key
                    break
        if not pool:
            continue

        sym, window = pool.pop(0)
        candles = window_to_candles(window)
        indicator_data = INDICATOR_BUILDERS[ind_type](window)
        meta = INDICATOR_META[ind_type]

        scenario = {
            "id": f"l2-{difficulty}-{used}",
            "level": 2,
            "difficulty": difficulty,
            "question": f"What is the {meta['friendlyName']} telling you?",
            "chart": {
                "candles": candles,
                "indicator": indicator_data,
                "label": f"{meta['friendlyName']} ({meta['technicalName']})",
            },
            "options": [
                {"id": "buy", "label": "Buy", "description": "The indicator suggests a potential buying opportunity"},
                {"id": "wait", "label": "Wait", "description": "No clear signal — best to wait"},
                {"id": "sell", "label": "Sell", "description": "The indicator suggests a potential selling opportunity"},
            ],
            "correctAnswer": answer,
            "explanation": _build_level2_explanation(ind_type, answer),
        }
        scenarios.append(scenario)
        used += 1

    random.shuffle(scenarios)
    for i, s in enumerate(scenarios):
        s["id"] = f"l2-{difficulty}-{i}"

    print(f"  Level 2 ({difficulty}): {len(scenarios)} scenarios")
    return scenarios


# ============================================================
# Level 3: Confluence
# ============================================================

def _build_level3_explanation(answer: str, window: pd.DataFrame) -> dict:
    """Build detailed Level 3 explanation with specific visual cues from actual data."""
    rsi = window["rsi"]
    hist = window["macd_histogram"]
    macd_line = window["macd_line"]
    macd_signal = window["macd_signal"]

    # Extract last valid RSI
    last_rsi = 50
    for i in range(len(window) - 1, -1, -1):
        if pd.notna(rsi.iloc[i]):
            last_rsi = round(float(rsi.iloc[i]))
            break

    # Extract last valid histogram value and recent trend
    last_hist = 0.0
    for i in range(len(window) - 1, -1, -1):
        if pd.notna(hist.iloc[i]):
            last_hist = float(hist.iloc[i])
            break

    recent_hists = []
    for i in range(max(0, len(window) - 5), len(window)):
        if pd.notna(hist.iloc[i]):
            recent_hists.append(float(hist.iloc[i]))
    hist_growing = len(recent_hists) >= 2 and abs(recent_hists[-1]) > abs(recent_hists[0])

    # MACD line above/below signal
    macd_above = False
    for i in range(len(window) - 1, -1, -1):
        if pd.notna(macd_line.iloc[i]) and pd.notna(macd_signal.iloc[i]):
            macd_above = float(macd_line.iloc[i]) > float(macd_signal.iloc[i])
            break

    # RSI description
    if last_rsi < 30:
        rsi_visual = f"the blue line has dropped below the lower red dashed line (30 level) to around {last_rsi}"
        rsi_meaning = "sellers may have pushed the price too low — historically, this can signal a potential bounce"
        rsi_zone = "oversold"
    elif last_rsi > 70:
        rsi_visual = f"the blue line has climbed above the upper red dashed line (70 level) to around {last_rsi}"
        rsi_meaning = "buyers may have pushed the price too high — historically, this can signal a potential pullback"
        rsi_zone = "overbought"
    else:
        rsi_visual = f"the blue line is at around {last_rsi}, sitting between the two dashed lines (30 and 70)"
        rsi_meaning = "there's no extreme reading — the price isn't stretched in either direction"
        rsi_zone = "neutral"

    # MACD description
    if last_hist > 0:
        macd_visual = "the histogram bars are green (above the zero line)"
        if hist_growing:
            macd_visual += " and getting taller — upward momentum is building"
        else:
            macd_visual += " but starting to shrink — upward momentum may be fading"
    elif last_hist < 0:
        macd_visual = "the histogram bars are red (below the zero line)"
        if hist_growing:
            macd_visual += " and getting deeper — downward momentum is building"
        else:
            macd_visual += " but starting to shrink — downward momentum may be fading"
    else:
        macd_visual = "the histogram bars are near zero — momentum is flat"

    if answer == "buy":
        return {
            "headline": "Both indicators agree — this is a potential buying opportunity",
            "rsiReason": (
                f"Look at the Momentum Meter (RSI) panel: {rsi_visual}. "
                f"This means {rsi_meaning}."
            ),
            "macdReason": (
                f"Now check the Trend Momentum (MACD) panel at the bottom: {macd_visual}. "
                f"The blue MACD line is {'above' if macd_above else 'crossing above'} the orange signal line, "
                f"confirming upward momentum is building."
            ),
            "confluenceReason": (
                f"Both indicators point the same way: RSI shows the price is in the {rsi_zone} zone "
                f"(potential bounce), and MACD confirms momentum is turning upward. "
                f"When two indicators agree, it's called \"confluence\" — like getting a second opinion "
                f"that confirms the first. This makes the buy signal more reliable than either indicator alone."
            ),
            "disclaimer": "This is for educational purposes only. Past patterns do not guarantee future results.",
        }
    elif answer == "sell":
        return {
            "headline": "Both indicators agree — this is a potential selling opportunity",
            "rsiReason": (
                f"Look at the Momentum Meter (RSI) panel: {rsi_visual}. "
                f"This means {rsi_meaning}."
            ),
            "macdReason": (
                f"Now check the Trend Momentum (MACD) panel at the bottom: {macd_visual}. "
                f"The blue MACD line is {'below' if not macd_above else 'crossing below'} the orange signal line, "
                f"confirming downward momentum."
            ),
            "confluenceReason": (
                f"Both indicators point the same way: RSI shows the price is in the {rsi_zone} zone "
                f"(potential pullback), and MACD confirms momentum is turning downward. "
                f"This is confluence — two independent signals agreeing makes the sell signal stronger. "
                f"A common mistake is looking at just one indicator. Always check if both panels tell the same story."
            ),
            "disclaimer": "This is for educational purposes only. Past patterns do not guarantee future results.",
        }
    else:  # wait
        # Describe the specific disagreement
        if last_rsi < 30 and last_hist < 0:
            disagreement = (
                f"The RSI is in the oversold zone at {last_rsi}, which might tempt you to buy. "
                f"But look at the MACD — the histogram bars are red and pointing downward, meaning "
                f"momentum is still falling. RSI says 'the price looks cheap,' but MACD says 'it's still dropping.' "
                f"That's a mixed signal."
            )
        elif last_rsi > 70 and last_hist > 0:
            disagreement = (
                f"The RSI is in the overbought zone at {last_rsi}, which might tempt you to sell. "
                f"But look at the MACD — the histogram bars are green and pointing upward, meaning "
                f"momentum is still rising. RSI says 'the price looks stretched,' but MACD says 'it's still climbing.' "
                f"That's a mixed signal."
            )
        else:
            disagreement = (
                f"The RSI is at {last_rsi} ({rsi_zone} zone) while the MACD histogram shows "
                f"{'upward' if last_hist > 0 else 'downward'} momentum. "
                f"These two indicators are telling different stories."
            )
        return {
            "headline": "The indicators disagree — best to wait for confirmation",
            "rsiReason": (
                f"Look at the Momentum Meter (RSI) panel: {rsi_visual}. "
                f"This means {rsi_meaning}."
            ),
            "macdReason": (
                f"Now check the Trend Momentum (MACD) panel at the bottom: {macd_visual}."
            ),
            "confluenceReason": (
                f"{disagreement} "
                f"When indicators disagree, acting on just one while ignoring the other is a common mistake. "
                f"The safest move is to wait until both panels tell the same story before making a decision."
            ),
            "disclaimer": "This is for educational purposes only. Past patterns do not guarantee future results.",
        }


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

            explanation = _build_level3_explanation(answer, window)

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
