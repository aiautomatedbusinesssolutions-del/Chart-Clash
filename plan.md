# Plan: Chart Clash — Full App Architecture & Build Plan

## Context

Building "Chart Clash: Simple Lessons for Serious Stock Market Skills" — a gamified stock market education app that teaches beginners to read technical indicators through 3 progressive levels. The core pain points addressed are **signal overload** and **false positives**, solved through practice with confluence and filtering.

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 16 + React 19 + TypeScript | User's existing experience; matches sibling projects |
| **Charting** | `lightweight-charts` (TradingView OSS) | 40KB, zero deps, native candlesticks + multi-pane indicators, built-in static mode, dark theme support |
| **State** | Zustand (no persistence) | Fresh start each session, clean store pattern |
| **Styling** | Tailwind CSS v4 + CLAUDE.md design system | bg-slate-950, Traffic Light Palette |
| **Icons** | lucide-react | Consistent with sibling projects |
| **Data Pipeline** | Python (pandas + yfinance + ta library) | "The Brain" per CLAUDE.md — fetches real historical data, computes indicators, outputs static JSON scenarios |
| **Ruby** | Not needed for this app | No automation/file management tasks that warrant it |

---

## File Structure

```
Chart-Clash/
├── CLAUDE.md
├── plan.md
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
│
├── brain/                          # Python data pipeline (FUTURE — not built yet)
│   └── (will contain fetch, compute, detect scripts when real data is added)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Inter font, bg-slate-950, metadata
│   │   ├── globals.css             # Tailwind directives, custom animations
│   │   ├── page.tsx                # Home / level select
│   │   ├── play/
│   │   │   └── page.tsx            # Game screen (all 3 levels)
│   │   ├── results/
│   │   │   └── page.tsx            # Score + review after each level
│   │   └── summary/
│   │       └── page.tsx            # Final summary after beating all 3
│   │
│   ├── components/
│   │   ├── charts/
│   │   │   ├── CandlestickChart.tsx    # Wrapper around lightweight-charts
│   │   │   └── ChartOption.tsx         # Clickable chart card (answer button)
│   │   ├── game/
│   │   │   ├── RoundHeader.tsx         # Level + round counter + streak
│   │   │   ├── AnswerFeedback.tsx      # Correct/wrong overlay + explanation
│   │   │   ├── ProgressBar.tsx         # Visual round progress
│   │   │   ├── StarRating.tsx          # 0-3 star display
│   │   │   ├── ReviewCard.tsx          # Single round review (results screen)
│   │   │   └── LevelCard.tsx           # Level select card (home screen)
│   │   └── ui/
│   │       ├── Button.tsx
│   │       └── Card.tsx
│   │
│   └── lib/
│       ├── types/index.ts              # All TypeScript interfaces
│       ├── constants/
│       │   ├── indicators.ts           # Friendly names, colors, descriptions
│       │   └── scoring.ts              # Star thresholds, streak bonuses
│       ├── data/
│       │   └── scenarios.ts            # Mock scenario data (all 3 levels × 3 difficulties)
│       ├── services/
│       │   └── scenario-loader.ts      # Select random 10 from mock pool, apply position swap
│       ├── store/
│       │   └── game-store.ts           # Zustand store
│       └── utils/
│           ├── cn.ts                   # clsx + tailwind-merge
│           └── advice.ts              # Personalized advice generator
```

---

## Three Levels

### Level 1: Indicator Recognition
- **Format**: Two charts side by side, each with a different indicator
- **Indicator pool**: RSI, Bollinger Bands, MACD, Moving Average Crossover, Stochastic (rotating pairs)
- **Question**: "Which chart is currently showing a buy condition?"
- **Tap**: One of the two charts
- **10 rounds**, need 7+ to advance

### Level 2: Fakeout vs Breakout
- **Format**: Two charts side by side — same stock, daily vs weekly timeframe
- **Both show MACD** — one is a fakeout (trap), one is a real breakout
- **Question**: "Which timeframe shows the real buy signal?"
- **Tap**: One of the two charts
- **10 rounds**, need 7+ to advance

### Level 3: Confluence
- **Format**: Single chart with RSI + MACD layered together
- **Three choices**: Buy (both agree), Wait (they disagree), Sell (both show reversal)
- **Tap**: Multiple choice button
- **10 rounds**, need 7+ to complete the game

---

## Data Strategy: Mock First, Real Data Later

### Phase 1 (This Build): Mock Data
- All chart data is **hardcoded mock data** in `lib/data/scenarios/`
- Mock OHLCV arrays that clearly demonstrate each indicator signal
- No Python pipeline, no API calls — pure frontend build
- Allows full game to be built and tested without external dependencies

### Phase 2 (Future): Real Data Pipeline
- Python `brain/` directory with yfinance + ta library
- Fetches real historical data (2015-2023) from 20 diverse tickers
- Computes indicators, detects scenarios, outputs static JSON
- Replaces mock data in `public/scenarios/` — frontend code stays the same

### Signal Rules

| Indicator | Buy Signal | Neutral | Sell Signal |
|-----------|-----------|---------|-------------|
| RSI | < 30 (oversold) | 40–60 | > 70 (overbought) |
| Bollinger | Price touches lower band | Price near middle | Price touches upper band |
| MACD | Line crosses above signal, histogram positive | No crossover | Line crosses below signal |
| MA Crossover | Short MA crosses above long MA | MAs parallel | Short MA crosses below long MA |
| Stochastic | %K < 20, crossing above %D | 30–70 | %K > 80, crossing below %D |

### User-Selectable Difficulty
Before starting each level, the user picks: **Easy**, **Medium**, or **Hard**.

| Difficulty | Chart Signals | Description |
|-----------|--------------|-------------|
| **Easy** | Textbook-clear signals (RSI at 22, MACD histogram obviously positive) | "I'm just learning" |
| **Medium** | Moderate signals (RSI at 29, MACD just crossing) | "I know the basics" |
| **Hard** | Subtle/ambiguous signals (RSI at 31, noisy price action, barely crossing) | "Challenge me" |

- Each difficulty has its own pool of scenarios (10+ per difficulty per level)
- The selector appears on the home screen or as a modal before starting a level
- Stars are still awarded the same way regardless of difficulty

### Randomization Strategy
- **Pool**: 10+ scenarios per difficulty per level, randomly select 10 each session
- **Position swap**: For Levels 1&2, Chart A/B positions randomly swapped so answer isn't always "A"
- **Replay variety**: Different random selection each session

---

## Charting: lightweight-charts

### Why lightweight-charts
- Official TradingView open-source library (exactly the look the user wants)
- 40KB gzipped, zero dependencies
- Native multi-pane support (v5) for RSI/MACD below candlesticks
- Built-in static mode: `handleScroll: false, handleScale: false`
- Built-in buy/sell markers via `createSeriesMarkers`
- Full dark theme control (transparent bg to let slate-950 show through)

### React Integration Pattern
Custom wrapper (~80 lines) using `useRef` + `useLayoutEffect` + `createChart()`:
- NOT using the abandoned `lightweight-charts-react-wrapper` package
- Candlestick main pane + indicator sub-panes via `chart.addPane()`
- Chart wrapped in a clickable `<button>` for game interaction (pointer-events-none on canvas)

### Theme Mapping
- Background: transparent (container is `bg-slate-950`)
- Grid: `#1e293b` (slate-800)
- Text: `#94a3b8` (slate-400)
- Up candles: `#34d399` (emerald-400)
- Down candles: `#fb7185` (rose-400)

---

## Game State (Zustand)

### Phases
```
HOME → (select difficulty) → PLAYING → FEEDBACK → PLAYING (next round) → ... → RESULTS → SUMMARY
```

### Store Shape
```typescript
{
  phase: "home" | "playing" | "feedback" | "results" | "summary",
  levelStatuses: { 1: "unlocked", 2: "locked", 3: "locked" },
  currentLevel: 1 | 2 | 3 | null,
  currentDifficulty: "easy" | "medium" | "hard",
  currentRound: number,       // 1-10
  scenarios: GameScenario[],  // 10 loaded for current level + difficulty
  results: RoundResult[],     // Answers so far
  currentStreak: number,
  bestStreak: number,
  levelResults: { 1?: LevelResult, 2?: LevelResult, 3?: LevelResult },
}
```

### Level Progression
- Sequential unlock only (must pass Level 1 before Level 2)
- Completed levels can be replayed
- No localStorage — fresh state on page reload

---

## Scoring System

### Stars
| Score | Stars |
|-------|-------|
| 10/10 | 3 stars |
| 8-9/10 | 2 stars |
| 7/10 | 1 star |
| < 7/10 | 0 stars (fail) |

### Streak Counter
- Visual counter of consecutive correct answers
- Bounces on increment, resets on wrong answer

### Failure: Full Review Screen
- All 10 rounds displayed with the charts, player's answer, correct answer, and explanation
- "Try Again" button reloads the level with a fresh random set

### After Level 3: Personalized Summary
- Overall score across all 3 levels (out of 30)
- Star ratings per level
- Strengths (categories with ≥80% accuracy)
- Weaknesses (categories with <60% accuracy)
- Specific beginner-friendly tips for each weakness
- "Coming Soon: Levels 4, 5..." teaser

---

## Responsive Layout

- **Mobile** (< md): Charts stack vertically, full width. Answer buttons full-width below.
- **Desktop** (≥ md): Charts side-by-side in `grid-cols-2`. Level 3 chart full-width with options in 2x2 grid below.
- **Chart height**: min 180px mobile, 250px desktop
- **Touch targets**: All buttons min 48px height

---

## Build Sequence (Step-by-Step per CLAUDE.md)

### Phase 1: Next.js Scaffold
1. `npx create-next-app`, install lightweight-charts + zustand + lucide-react
2. Set up layout.tsx (Inter font, bg-slate-950), globals.css, cn.ts utility
3. Build Card + Button UI components

### Phase 2: Core Types, Mock Data & State
4. Define all TypeScript interfaces in `lib/types/index.ts`
5. Create mock scenario data in `lib/data/scenarios.ts` (all 3 levels × 3 difficulties)
6. Build `lib/store/game-store.ts` with full state machine (includes difficulty selection)
7. Build `lib/services/scenario-loader.ts` (loads from mock data pool)

### Phase 3: Home Screen
8. Build LevelCard component + difficulty selector + home page

### Phase 4: Chart Components
9. Build `CandlestickChart.tsx` wrapper for lightweight-charts
10. Build `ChartOption.tsx` (clickable chart card)

### Phase 5: Game Screen
11. Build RoundHeader, ProgressBar, AnswerFeedback, StreakCounter
12. Build `play/page.tsx` game screen (handles all 3 level formats)

### Phase 6: Results & Summary
13. Build StarRating, ReviewCard, results page
14. Build summary page with personalized advice

### Phase 7: Polish
15. Animations (streak bounce, star reveal, feedback transitions)
16. Mobile testing and touch target sizing
17. Legal disclaimers on all educational content

### Phase 8 (Future): Real Data
18. Build Python `brain/` pipeline to replace mock data with real historical scenarios

---

## Verification

1. Run `npm run dev` — verify home screen renders with 3 level cards + difficulty selector
2. Select Easy difficulty, start Level 1 — verify charts render with mock data, answers register, streak works
3. Fail intentionally (<7) — verify full review screen shows all 10 rounds with explanations
4. Pass Level 1 (7+) — verify Level 2 unlocks, stars display correctly
5. Try different difficulties — verify Easy shows obvious signals, Hard shows subtle ones
6. Complete all 3 levels — verify summary screen with personalized advice
7. Refresh the page — verify game resets to fresh state (no persistence)
8. Test on mobile viewport — verify charts stack, touch targets are large enough
