"""Configuration constants for the Chart Clash data pipeline."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

API_KEY = os.getenv("TWELVEDATA_API_KEY", "")
BASE_URL = "https://api.twelvedata.com"

# Diverse ticker list across sectors
TICKERS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META",  # Tech
    "JPM", "GS", "BAC",                                  # Finance
    "WMT", "KO", "MCD",                                  # Consumer
    "XOM", "CVX",                                         # Energy
    "JNJ", "PFE", "UNH",                                 # Healthcare
    "TSLA", "AMD", "DIS",                                 # Various
]

# Cache directory for raw API responses
CACHE_DIR = Path(__file__).resolve().parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)

# Output directory for frontend-ready JSON
OUTPUT_DIR = PROJECT_ROOT / "public" / "scenarios"

# Window size for each scenario (number of candles)
WINDOW_SIZE = 60

# Minimum scenarios per level/difficulty combo
MIN_SCENARIOS = 12

# Signal thresholds by difficulty
THRESHOLDS = {
    "easy": {
        "rsi_buy": 28,       # RSI below this = clear buy
        "rsi_sell": 72,      # RSI above this = clear sell
        "rsi_neutral": (42, 58),
        "stoch_buy": 18,
        "stoch_sell": 82,
        "bb_touch_pct": 0.005,  # Price within 0.5% of band
    },
    "medium": {
        "rsi_buy": 33,
        "rsi_sell": 67,
        "rsi_neutral": (38, 62),
        "stoch_buy": 22,
        "stoch_sell": 78,
        "bb_touch_pct": 0.015,
    },
    "hard": {
        "rsi_buy": 38,
        "rsi_sell": 62,
        "rsi_neutral": (35, 65),
        "stoch_buy": 28,
        "stoch_sell": 72,
        "bb_touch_pct": 0.025,
    },
}

# Indicator friendly names (must match frontend constants/indicators.ts)
INDICATOR_META = {
    "rsi": {
        "friendlyName": "Momentum Meter",
        "technicalName": "RSI",
        "description": "Measures how fast the price is rising or falling on a scale of 0-100",
        "buyDescription": "has dropped into the oversold zone, suggesting sellers may have pushed the price too low",
        "neutralDescription": "is sitting in the middle zone, suggesting no strong directional pressure",
    },
    "bollinger": {
        "friendlyName": "Volatility Bands",
        "technicalName": "Bollinger Bands",
        "description": "Shows a normal price range — when price breaks out of the bands, it may be stretched too far",
        "buyDescription": "shows price touching the lower band, which historically suggests it may bounce back up",
        "neutralDescription": "shows price moving within the bands without touching either extreme",
    },
    "macd": {
        "friendlyName": "Trend Momentum",
        "technicalName": "MACD",
        "description": "Compares fast and slow moving averages to show momentum direction",
        "buyDescription": "shows the fast line crossing above the slow line with growing momentum bars",
        "neutralDescription": "shows the lines tangled together with no clear direction",
    },
    "ma_crossover": {
        "friendlyName": "Trend Direction",
        "technicalName": "Moving Average Crossover",
        "description": "Compares a short-term and long-term average to show trend direction",
        "buyDescription": "shows the short-term average crossing above the long-term average, suggesting an uptrend may be starting",
        "neutralDescription": "shows both averages moving roughly parallel, suggesting no trend change",
    },
    "stochastic": {
        "friendlyName": "Speed Gauge",
        "technicalName": "Stochastic Oscillator",
        "description": "Shows where the price closed relative to its recent range",
        "buyDescription": "has dropped into the oversold zone with %K crossing above %D, suggesting a potential bounce",
        "neutralDescription": "is in the middle zone, suggesting balanced buying and selling pressure",
    },
}
