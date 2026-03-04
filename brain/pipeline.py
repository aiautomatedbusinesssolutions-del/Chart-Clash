"""Main pipeline: fetch data, compute indicators, detect scenarios, export JSON."""

import json
import sys
from pathlib import Path

from config import OUTPUT_DIR, MIN_SCENARIOS
from fetch import fetch_all
from indicators import compute_all_indicators
from scenarios import build_level1_scenarios, build_level2_scenarios, build_level3_scenarios


def run():
    print("=" * 60)
    print("Chart Clash — Real Data Pipeline")
    print("=" * 60)

    # Step 1: Fetch OHLCV data
    print("\n[1/3] Fetching OHLCV data...")
    all_data = fetch_all()

    if not all_data:
        print("ERROR: No data fetched. Check your API key.")
        sys.exit(1)

    # Step 2: Compute indicators for all tickers
    print("\n[2/3] Computing indicators...")
    for symbol, df in all_data.items():
        print(f"  {symbol}: computing 5 indicators...")
        compute_all_indicators(df)

    # Step 3: Detect scenarios and export JSON
    print("\n[3/3] Building scenarios...")

    # Create output directories
    for level in [1, 2, 3]:
        (OUTPUT_DIR / f"level{level}").mkdir(parents=True, exist_ok=True)

    builders = {
        1: build_level1_scenarios,
        2: build_level2_scenarios,
        3: build_level3_scenarios,
    }

    total = 0
    for level in [1, 2, 3]:
        for difficulty in ["easy", "medium", "hard"]:
            print(f"  Level {level} / {difficulty}...", end=" ")
            scenarios = builders[level](all_data, difficulty)

            if len(scenarios) < MIN_SCENARIOS:
                print(f"WARNING: only {len(scenarios)} scenarios (need {MIN_SCENARIOS})")
            else:
                print(f"{len(scenarios)} scenarios")

            output_file = OUTPUT_DIR / f"level{level}" / f"{difficulty}.json"
            with open(output_file, "w") as f:
                json.dump(scenarios, f, separators=(",", ":"))

            total += len(scenarios)

    print(f"\nDone! Exported {total} total scenarios to {OUTPUT_DIR}")
    print("You can now update the frontend scenario-loader to use these files.")


if __name__ == "__main__":
    run()
