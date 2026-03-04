// ============================================================
// Chart Data (for lightweight-charts)
// ============================================================

import type { UTCTimestamp } from "lightweight-charts";

export interface CandleData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TimeValue {
  time: UTCTimestamp;
  value: number;
}

export interface HistogramPoint {
  time: UTCTimestamp;
  value: number;
  color?: string;
}

// ============================================================
// Indicators
// ============================================================

export type IndicatorType =
  | "rsi"
  | "bollinger"
  | "macd"
  | "ma_crossover"
  | "stochastic";

export interface RSIIndicatorData {
  type: "rsi";
  values: TimeValue[];
}

export interface BollingerIndicatorData {
  type: "bollinger";
  upper: TimeValue[];
  middle: TimeValue[];
  lower: TimeValue[];
}

export interface MACDIndicatorData {
  type: "macd";
  macdLine: TimeValue[];
  signalLine: TimeValue[];
  histogram: HistogramPoint[];
}

export interface MACrossoverIndicatorData {
  type: "ma_crossover";
  shortMA: TimeValue[];
  longMA: TimeValue[];
}

export interface StochasticIndicatorData {
  type: "stochastic";
  kLine: TimeValue[];
  dLine: TimeValue[];
}

export type IndicatorData =
  | RSIIndicatorData
  | BollingerIndicatorData
  | MACDIndicatorData
  | MACrossoverIndicatorData
  | StochasticIndicatorData;

// ============================================================
// Chart Config
// ============================================================

export interface ChartConfig {
  candles: CandleData[];
  indicator: IndicatorData;
  label: string;
}

// ============================================================
// Game Enums & Answers
// ============================================================

export type Difficulty = "easy" | "medium" | "hard";
export type ABAnswer = "A" | "B";
export type ConfluenceAnswer = "buy" | "wait" | "sell";

// ============================================================
// Scenario Explanation
// ============================================================

export interface ScenarioExplanation {
  headline: string;
  detail: string;
  lesson: string;
  disclaimer: string;
}

// ============================================================
// Level Scenarios
// ============================================================

export interface Level1Scenario {
  id: string;
  level: 1;
  difficulty: Difficulty;
  question: string;
  chartA: ChartConfig;
  chartB: ChartConfig;
  correctAnswer: ABAnswer;
  explanation: ScenarioExplanation;
}

export interface Level2Scenario {
  id: string;
  level: 2;
  difficulty: Difficulty;
  question: string;
  stockLabel: string;
  chartA: ChartConfig & { timeframe: "daily" | "weekly" };
  chartB: ChartConfig & { timeframe: "daily" | "weekly" };
  correctAnswer: ABAnswer;
  explanation: ScenarioExplanation;
}

export interface ConfluenceOption {
  id: ConfluenceAnswer;
  label: string;
  description: string;
}

export interface Level3Scenario {
  id: string;
  level: 3;
  difficulty: Difficulty;
  question: string;
  chart: {
    candles: CandleData[];
    rsi: RSIIndicatorData;
    macd: MACDIndicatorData;
  };
  options: ConfluenceOption[];
  correctAnswer: ConfluenceAnswer;
  explanation: {
    headline: string;
    rsiReason: string;
    macdReason: string;
    confluenceReason: string;
    disclaimer: string;
  };
}

export type GameScenario = Level1Scenario | Level2Scenario | Level3Scenario;

// ============================================================
// Game State
// ============================================================

export type LevelNumber = 1 | 2 | 3;
export type LevelStatus = "locked" | "unlocked" | "completed";
export type GamePhase = "home" | "playing" | "feedback" | "results" | "summary";

export interface RoundResult {
  roundNumber: number;
  scenario: GameScenario;
  playerAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface LevelResult {
  level: LevelNumber;
  difficulty: Difficulty;
  score: number;
  stars: number;
  passed: boolean;
  rounds: RoundResult[];
  bestStreak: number;
}

export interface PersonalizedAdvice {
  overallScore: number;
  totalStars: number;
  strengths: string[];
  weaknesses: string[];
  tips: string[];
}
