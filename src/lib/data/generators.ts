import type { UTCTimestamp } from "lightweight-charts";
import type {
  CandleData,
  TimeValue,
  HistogramPoint,
  IndicatorType,
  IndicatorData,
  RSIIndicatorData,
  MACDIndicatorData,
  Difficulty,
  Level1Scenario,
  Level2Scenario,
  Level3Scenario,
  ConfluenceAnswer,
  ScenarioExplanation,
} from "@/lib/types";
import { INDICATOR_META } from "@/lib/constants/indicators";

// ============================================================
// Seeded RNG
// ============================================================

function createRng(seed: number): () => number {
  let s = Math.abs(seed) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

// ============================================================
// Candle Generation
// ============================================================

interface PhaseConfig {
  length: number;
  dailyReturn: number;
  volatility: number;
}

const BASE_TIME = 1577836800; // 2020-01-01 UTC

function generateCandles(config: {
  basePrice: number;
  baseVolume: number;
  phases: PhaseConfig[];
  seed: number;
}): CandleData[] {
  const rng = createRng(config.seed);
  const candles: CandleData[] = [];
  let price = config.basePrice;

  for (const phase of config.phases) {
    for (let i = 0; i < phase.length; i++) {
      const noise = (rng() - 0.5) * 2 * phase.volatility;
      const ret = phase.dailyReturn + noise;
      const newPrice = price * (1 + ret);

      const open = price + (rng() - 0.5) * price * 0.003;
      const close = newPrice;
      const high =
        Math.max(open, close) * (1 + rng() * phase.volatility * 0.4);
      const low =
        Math.min(open, close) * (1 - rng() * phase.volatility * 0.4);
      const volume = config.baseVolume * (0.7 + rng() * 0.6);

      candles.push({
        time: (BASE_TIME + candles.length * 86400) as UTCTimestamp,
        open: +open.toFixed(2),
        high: +high.toFixed(2),
        low: +low.toFixed(2),
        close: +close.toFixed(2),
        volume: Math.round(volume),
      });

      price = newPrice;
    }
  }

  return candles;
}

// ============================================================
// Indicator Calculations
// ============================================================

function calculateSMA(
  values: number[],
  period: number
): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += values[j];
      result.push(sum / period);
    }
  }
  return result;
}

function calculateEMA(
  values: number[],
  period: number
): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let ema: number | null = null;

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += values[j];
      ema = sum / period;
      result.push(ema);
    } else {
      ema = (values[i] - ema!) * k + ema!;
      result.push(ema);
    }
  }
  return result;
}

function calculateRSI(
  closes: number[],
  period: number = 14
): (number | null)[] {
  const result: (number | null)[] = [null];

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < changes.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }

    if (i === period - 1) {
      let sumGain = 0,
        sumLoss = 0;
      for (let j = 0; j < period; j++) {
        if (changes[j] > 0) sumGain += changes[j];
        else sumLoss += Math.abs(changes[j]);
      }
      avgGain = sumGain / period;
      avgLoss = sumLoss / period;
    } else {
      const change = changes[i];
      avgGain =
        (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
      avgLoss =
        (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) /
        period;
    }

    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }

  return result;
}

function calculateMACD(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
) {
  const emaFast = calculateEMA(closes, fast);
  const emaSlow = calculateEMA(closes, slow);

  const macdLine: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (emaFast[i] !== null && emaSlow[i] !== null) {
      macdLine.push(emaFast[i]! - emaSlow[i]!);
    } else {
      macdLine.push(null);
    }
  }

  const validMacd = macdLine.filter((v) => v !== null) as number[];
  const signalEma = calculateEMA(validMacd, signalPeriod);

  const signalLine: (number | null)[] = [];
  const histogram: (number | null)[] = [];
  let validIdx = 0;

  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] === null) {
      signalLine.push(null);
      histogram.push(null);
    } else {
      const sig = signalEma[validIdx] ?? null;
      signalLine.push(sig);
      histogram.push(sig !== null ? macdLine[i]! - sig : null);
      validIdx++;
    }
  }

  return { macdLine, signalLine, histogram };
}

function calculateBollinger(
  closes: number[],
  period = 20,
  multiplier = 2
) {
  const middle = calculateSMA(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (middle[i] === null) {
      upper.push(null);
      lower.push(null);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = middle[i]!;
      const stddev = Math.sqrt(
        slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period
      );
      upper.push(mean + multiplier * stddev);
      lower.push(mean - multiplier * stddev);
    }
  }

  return { upper, middle, lower };
}

function calculateStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod = 14,
  dPeriod = 3
) {
  const kValues: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) {
      kValues.push(null);
    } else {
      const highSlice = highs.slice(i - kPeriod + 1, i + 1);
      const lowSlice = lows.slice(i - kPeriod + 1, i + 1);
      const hh = Math.max(...highSlice);
      const ll = Math.min(...lowSlice);
      const range = hh - ll;
      kValues.push(range === 0 ? 50 : ((closes[i] - ll) / range) * 100);
    }
  }

  const validK = kValues.filter((v) => v !== null) as number[];
  const dSma = calculateSMA(validK, dPeriod);

  const dValues: (number | null)[] = [];
  let validIdx = 0;
  for (let i = 0; i < closes.length; i++) {
    if (kValues[i] === null) {
      dValues.push(null);
    } else {
      dValues.push(dSma[validIdx] ?? null);
      validIdx++;
    }
  }

  return { k: kValues, d: dValues };
}

// ============================================================
// Helpers: Convert arrays → chart-ready data
// ============================================================

function toTimeValues(
  candles: CandleData[],
  values: (number | null)[]
): TimeValue[] {
  const result: TimeValue[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (values[i] !== null) {
      result.push({ time: candles[i].time, value: +values[i]!.toFixed(4) });
    }
  }
  return result;
}

function toHistogramPoints(
  candles: CandleData[],
  values: (number | null)[]
): HistogramPoint[] {
  const result: HistogramPoint[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (values[i] !== null) {
      result.push({
        time: candles[i].time,
        value: +values[i]!.toFixed(4),
        color: values[i]! >= 0 ? "#34d399" : "#fb7185",
      });
    }
  }
  return result;
}

function computeIndicator(
  candles: CandleData[],
  type: IndicatorType
): IndicatorData {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  switch (type) {
    case "rsi": {
      const values = calculateRSI(closes);
      return { type: "rsi", values: toTimeValues(candles, values) };
    }
    case "bollinger": {
      const { upper, middle, lower } = calculateBollinger(closes);
      return {
        type: "bollinger",
        upper: toTimeValues(candles, upper),
        middle: toTimeValues(candles, middle),
        lower: toTimeValues(candles, lower),
      };
    }
    case "macd": {
      const { macdLine, signalLine, histogram } = calculateMACD(closes);
      return {
        type: "macd",
        macdLine: toTimeValues(candles, macdLine),
        signalLine: toTimeValues(candles, signalLine),
        histogram: toHistogramPoints(candles, histogram),
      };
    }
    case "ma_crossover": {
      const shortMA = calculateSMA(closes, 20);
      const longMA = calculateSMA(closes, 50);
      return {
        type: "ma_crossover",
        shortMA: toTimeValues(candles, shortMA),
        longMA: toTimeValues(candles, longMA),
      };
    }
    case "stochastic": {
      const { k, d } = calculateStochastic(highs, lows, closes);
      return {
        type: "stochastic",
        kLine: toTimeValues(candles, k),
        dLine: toTimeValues(candles, d),
      };
    }
  }
}

// ============================================================
// Phase Configs per Indicator / Signal Type
// ============================================================

function getBuyPhases(
  indicator: IndicatorType,
  difficulty: Difficulty
): PhaseConfig[] {
  const intensity = { easy: 1.0, medium: 0.65, hard: 0.35 }[difficulty];

  switch (indicator) {
    case "rsi":
    case "stochastic":
      return [
        { length: 30, dailyReturn: 0.001, volatility: 0.007 },
        { length: 25, dailyReturn: -0.009 * intensity, volatility: 0.004 },
        { length: 10, dailyReturn: 0.003, volatility: 0.005 },
      ];
    case "bollinger":
      return [
        { length: 30, dailyReturn: 0.0005, volatility: 0.006 },
        { length: 15, dailyReturn: -0.012 * intensity, volatility: 0.003 },
        { length: 10, dailyReturn: 0.002, volatility: 0.005 },
      ];
    case "macd":
      return [
        { length: 35, dailyReturn: -0.004, volatility: 0.005 },
        { length: 20, dailyReturn: 0.008 * intensity, volatility: 0.004 },
        { length: 10, dailyReturn: 0.004 * intensity, volatility: 0.005 },
      ];
    case "ma_crossover":
      return [
        { length: 40, dailyReturn: -0.003, volatility: 0.005 },
        { length: 25, dailyReturn: 0.007 * intensity, volatility: 0.004 },
        { length: 10, dailyReturn: 0.003 * intensity, volatility: 0.005 },
      ];
  }
}

function getNeutralPhases(): PhaseConfig[] {
  return [{ length: 65, dailyReturn: 0.0005, volatility: 0.007 }];
}

function getSellPhases(
  indicator: IndicatorType,
  difficulty: Difficulty
): PhaseConfig[] {
  const intensity = { easy: 1.0, medium: 0.65, hard: 0.35 }[difficulty];

  switch (indicator) {
    case "rsi":
    case "stochastic":
      return [
        { length: 30, dailyReturn: -0.001, volatility: 0.007 },
        { length: 25, dailyReturn: 0.009 * intensity, volatility: 0.004 },
        { length: 10, dailyReturn: -0.003, volatility: 0.005 },
      ];
    case "bollinger":
      return [
        { length: 30, dailyReturn: -0.0005, volatility: 0.006 },
        { length: 15, dailyReturn: 0.012 * intensity, volatility: 0.003 },
        { length: 10, dailyReturn: -0.002, volatility: 0.005 },
      ];
    case "macd":
      return [
        { length: 35, dailyReturn: 0.004, volatility: 0.005 },
        { length: 20, dailyReturn: -0.008 * intensity, volatility: 0.004 },
        { length: 10, dailyReturn: -0.004 * intensity, volatility: 0.005 },
      ];
    case "ma_crossover":
      return [
        { length: 40, dailyReturn: 0.003, volatility: 0.005 },
        { length: 25, dailyReturn: -0.007 * intensity, volatility: 0.004 },
        { length: 10, dailyReturn: -0.003 * intensity, volatility: 0.005 },
      ];
  }
}

function getWaitPhases(indicator: IndicatorType): PhaseConfig[] {
  switch (indicator) {
    case "rsi":
    case "stochastic":
      return [
        { length: 25, dailyReturn: 0.001, volatility: 0.008 },
        { length: 20, dailyReturn: -0.002, volatility: 0.007 },
        { length: 20, dailyReturn: 0.001, volatility: 0.007 },
      ];
    case "bollinger":
      return [{ length: 65, dailyReturn: 0.0005, volatility: 0.006 }];
    case "macd":
    case "ma_crossover":
      return [{ length: 65, dailyReturn: 0.0005, volatility: 0.007 }];
  }
}

function getConfluencePhases(
  answer: ConfluenceAnswer,
  difficulty: Difficulty
): PhaseConfig[] {
  const intensity = { easy: 1.0, medium: 0.65, hard: 0.35 }[difficulty];

  switch (answer) {
    case "buy":
      return [
        { length: 25, dailyReturn: 0.001, volatility: 0.006 },
        { length: 25, dailyReturn: -0.009 * intensity, volatility: 0.004 },
        { length: 10, dailyReturn: 0.005 * intensity, volatility: 0.004 },
      ];
    case "sell":
      return [
        { length: 25, dailyReturn: -0.001, volatility: 0.006 },
        { length: 25, dailyReturn: 0.009 * intensity, volatility: 0.004 },
        { length: 10, dailyReturn: -0.005 * intensity, volatility: 0.004 },
      ];
    case "wait":
      return [
        { length: 25, dailyReturn: 0.001, volatility: 0.008 },
        { length: 20, dailyReturn: -0.004 * intensity, volatility: 0.007 },
        { length: 15, dailyReturn: 0.003, volatility: 0.007 },
      ];
  }
}

// ============================================================
// Level 1: Indicator Recognition
// ============================================================

const INDICATOR_PAIRS: [IndicatorType, IndicatorType][] = [
  ["rsi", "bollinger"],
  ["rsi", "macd"],
  ["rsi", "stochastic"],
  ["bollinger", "rsi"],
  ["bollinger", "macd"],
  ["macd", "rsi"],
  ["macd", "bollinger"],
  ["ma_crossover", "rsi"],
  ["ma_crossover", "stochastic"],
  ["stochastic", "rsi"],
  ["stochastic", "bollinger"],
  ["stochastic", "macd"],
];

function buildLevel1Explanation(
  buyIndicator: IndicatorType,
  neutralIndicator: IndicatorType,
  buyOnA: boolean
): ScenarioExplanation {
  const buyMeta = INDICATOR_META[buyIndicator];
  const neutralMeta = INDICATOR_META[neutralIndicator];
  const chart = buyOnA ? "A" : "B";
  const other = buyOnA ? "B" : "A";

  return {
    headline: `Chart ${chart} is showing a potential buy condition`,
    detail: `The ${buyMeta.friendlyName} (${buyMeta.technicalName}) on Chart ${chart} ${buyMeta.buyDescription}. Meanwhile, Chart ${other}'s ${neutralMeta.friendlyName} (${neutralMeta.technicalName}) ${neutralMeta.neutralDescription}.`,
    lesson: `${buyMeta.friendlyName} (${buyMeta.technicalName}): ${buyMeta.description}. When it reaches extreme levels, it can historically signal a potential opportunity — but always look for confirmation from other indicators.`,
    disclaimer:
      "This is for educational purposes only. Past patterns do not guarantee future results.",
  };
}

export function generateLevel1Scenario(
  index: number,
  difficulty: Difficulty,
  seed: number
): Level1Scenario {
  const rng = createRng(seed);
  const pair = INDICATOR_PAIRS[index % INDICATOR_PAIRS.length];
  const [buyIndicator, neutralIndicator] = pair;

  const buyCandles = generateCandles({
    basePrice: 100 + rng() * 200,
    baseVolume: 1000000 + rng() * 4000000,
    phases: getBuyPhases(buyIndicator, difficulty),
    seed: seed + 1,
  });
  const buyIndicatorData = computeIndicator(buyCandles, buyIndicator);

  const neutralCandles = generateCandles({
    basePrice: 80 + rng() * 250,
    baseVolume: 1000000 + rng() * 4000000,
    phases: getNeutralPhases(),
    seed: seed + 2,
  });
  const neutralIndicatorData = computeIndicator(
    neutralCandles,
    neutralIndicator
  );

  const buyOnA = rng() > 0.5;
  const buyMeta = INDICATOR_META[buyIndicator];
  const neutralMeta = INDICATOR_META[neutralIndicator];
  const buyLabel = `${buyMeta.friendlyName} (${buyMeta.technicalName})`;
  const neutralLabel = `${neutralMeta.friendlyName} (${neutralMeta.technicalName})`;

  return {
    id: `l1-${difficulty}-${index}`,
    level: 1,
    difficulty,
    question: "Which chart is showing a potential buy condition?",
    chartA: {
      candles: buyOnA ? buyCandles : neutralCandles,
      indicator: buyOnA ? buyIndicatorData : neutralIndicatorData,
      label: `Chart A — ${buyOnA ? buyLabel : neutralLabel}`,
    },
    chartB: {
      candles: buyOnA ? neutralCandles : buyCandles,
      indicator: buyOnA ? neutralIndicatorData : buyIndicatorData,
      label: `Chart B — ${buyOnA ? neutralLabel : buyLabel}`,
    },
    correctAnswer: buyOnA ? "A" : "B",
    explanation: buildLevel1Explanation(
      buyIndicator,
      neutralIndicator,
      buyOnA
    ),
  };
}

// ============================================================
// Level 2: Read the Signal
// ============================================================

const L2_ANSWER_ROTATION: ConfluenceAnswer[] = [
  "buy", "sell", "wait", "buy", "sell", "wait",
  "buy", "sell", "wait", "buy", "sell", "buy",
];

const L2_INDICATOR_ROTATION: IndicatorType[] = [
  "rsi", "bollinger", "macd", "ma_crossover", "stochastic",
  "rsi", "macd", "stochastic", "bollinger", "ma_crossover",
  "rsi", "macd",
];

function buildLevel2Explanation(
  indicator: IndicatorType,
  answer: ConfluenceAnswer
): ScenarioExplanation {
  const meta = INDICATOR_META[indicator];
  const friendlyLabel = `${meta.friendlyName} (${meta.technicalName})`;

  let headline: string;
  let detail: string;
  let lesson: string;

  switch (answer) {
    case "buy":
      headline = `The ${meta.friendlyName} is showing a potential buy signal`;
      detail = `The ${friendlyLabel} ${meta.buyDescription}. This historically suggests a potential buying opportunity.`;
      lesson = `${friendlyLabel}: ${meta.description}. When it shows these conditions, it can historically signal that the price may be due for an upward move — but always confirm with other indicators before acting.`;
      break;
    case "sell":
      headline = `The ${meta.friendlyName} is showing a potential sell signal`;
      detail = `The ${friendlyLabel} ${meta.sellDescription}. This historically suggests a potential selling opportunity.`;
      lesson = `${friendlyLabel}: ${meta.description}. When it shows these conditions, it can historically signal that the price may be due for a downward move — but no single indicator is perfect.`;
      break;
    case "wait":
      headline = `The ${meta.friendlyName} is not showing a clear signal`;
      detail = `The ${friendlyLabel} ${meta.waitDescription}. There is no extreme reading to act on right now.`;
      lesson = `${friendlyLabel}: ${meta.description}. When the indicator is in its middle zone with no extreme reading, the wisest move is to wait. Patience is a skill — acting without a clear signal is a common mistake.`;
      break;
  }

  return {
    headline,
    detail,
    lesson,
    disclaimer:
      "This is for educational purposes only. Past patterns do not guarantee future results.",
  };
}

export function generateLevel2Scenario(
  index: number,
  difficulty: Difficulty,
  seed: number
): Level2Scenario {
  const rng = createRng(seed);
  const targetAnswer = L2_ANSWER_ROTATION[index % L2_ANSWER_ROTATION.length];
  const indicatorType = L2_INDICATOR_ROTATION[index % L2_INDICATOR_ROTATION.length];

  let phases: PhaseConfig[];
  switch (targetAnswer) {
    case "buy":
      phases = getBuyPhases(indicatorType, difficulty);
      break;
    case "sell":
      phases = getSellPhases(indicatorType, difficulty);
      break;
    case "wait":
      phases = getWaitPhases(indicatorType);
      break;
  }

  const candles = generateCandles({
    basePrice: 100 + rng() * 200,
    baseVolume: 1000000 + rng() * 4000000,
    phases,
    seed: seed + 1,
  });
  const indicatorData = computeIndicator(candles, indicatorType);
  const meta = INDICATOR_META[indicatorType];

  return {
    id: `l2-${difficulty}-${index}`,
    level: 2,
    difficulty,
    question: "What is this indicator telling you?",
    chart: {
      candles,
      indicator: indicatorData,
      label: `${meta.friendlyName} (${meta.technicalName})`,
    },
    options: [
      { id: "buy", label: "Buy", description: "The indicator suggests a potential buy" },
      { id: "wait", label: "Wait", description: "No clear signal — hold off for now" },
      { id: "sell", label: "Sell", description: "The indicator suggests a potential sell" },
    ],
    correctAnswer: targetAnswer,
    explanation: buildLevel2Explanation(indicatorType, targetAnswer),
  };
}

// ============================================================
// Level 3: Confluence
// ============================================================

const ANSWER_ROTATION: ConfluenceAnswer[] = [
  "buy",
  "wait",
  "sell",
  "buy",
  "wait",
  "sell",
  "buy",
  "wait",
  "buy",
  "sell",
  "wait",
  "buy",
];

function buildLevel3Explanation(
  answer: ConfluenceAnswer,
  rsiValues: (number | null)[],
  macdHistogram: (number | null)[]
): Level3Scenario["explanation"] {
  const lastRSI =
    ([...rsiValues].reverse().find((v) => v !== null) as number) ?? 50;
  const roundedRSI = Math.round(lastRSI);

  const lastHist =
    ([...macdHistogram].reverse().find((v) => v !== null) as number) ?? 0;

  // Recent histogram trend
  const recentHists = macdHistogram
    .filter((v) => v !== null)
    .slice(-5) as number[];
  const histGrowing =
    recentHists.length >= 2 &&
    Math.abs(recentHists[recentHists.length - 1]) >
      Math.abs(recentHists[0]);

  // RSI description
  let rsiVisual: string;
  let rsiMeaning: string;
  let rsiZone: string;
  if (lastRSI < 30) {
    rsiVisual = `the blue line has dropped below the lower red dashed line (30 level) to around ${roundedRSI}`;
    rsiMeaning =
      "sellers may have pushed the price too low — historically, this can signal a potential bounce";
    rsiZone = "oversold";
  } else if (lastRSI > 70) {
    rsiVisual = `the blue line has climbed above the upper red dashed line (70 level) to around ${roundedRSI}`;
    rsiMeaning =
      "buyers may have pushed the price too high — historically, this can signal a potential pullback";
    rsiZone = "overbought";
  } else {
    rsiVisual = `the blue line is at around ${roundedRSI}, sitting between the two dashed lines (30 and 70)`;
    rsiMeaning =
      "there's no extreme reading — the price isn't stretched in either direction";
    rsiZone = "neutral";
  }

  // MACD description
  let macdVisual: string;
  if (lastHist > 0) {
    macdVisual = "the histogram bars are green (above the zero line)";
    macdVisual += histGrowing
      ? " and getting taller — upward momentum is building"
      : " but starting to shrink — upward momentum may be fading";
  } else if (lastHist < 0) {
    macdVisual = "the histogram bars are red (below the zero line)";
    macdVisual += histGrowing
      ? " and getting deeper — downward momentum is building"
      : " but starting to shrink — downward momentum may be fading";
  } else {
    macdVisual = "the histogram bars are near zero — momentum is flat";
  }

  switch (answer) {
    case "buy":
      return {
        headline: "Both indicators agree — this is a potential buying opportunity",
        rsiReason: `Look at the Momentum Meter (RSI) panel: ${rsiVisual}. This means ${rsiMeaning}.`,
        macdReason: `Now check the Trend Momentum (MACD) panel at the bottom: ${macdVisual}. The blue MACD line is crossing above the orange signal line, confirming upward momentum is building.`,
        confluenceReason: `Both indicators point the same way: RSI shows the price is in the ${rsiZone} zone (potential bounce), and MACD confirms momentum is turning upward. When two indicators agree, it's called "confluence" — like getting a second opinion that confirms the first. This makes the buy signal more reliable than either indicator alone.`,
        disclaimer:
          "This is for educational purposes only. Past patterns do not guarantee future results.",
      };
    case "sell":
      return {
        headline: "Both indicators agree — this is a potential selling opportunity",
        rsiReason: `Look at the Momentum Meter (RSI) panel: ${rsiVisual}. This means ${rsiMeaning}.`,
        macdReason: `Now check the Trend Momentum (MACD) panel at the bottom: ${macdVisual}. The blue MACD line is below the orange signal line, confirming downward momentum.`,
        confluenceReason: `Both indicators point the same way: RSI shows the price is in the ${rsiZone} zone (potential pullback), and MACD confirms momentum is turning downward. This is confluence — two independent signals agreeing makes the sell signal stronger. A common mistake is looking at just one indicator. Always check if both panels tell the same story.`,
        disclaimer:
          "This is for educational purposes only. Past patterns do not guarantee future results.",
      };
    case "wait": {
      let disagreement: string;
      if (lastRSI < 30 && lastHist < 0) {
        disagreement = `The RSI is in the oversold zone at ${roundedRSI}, which might tempt you to buy. But look at the MACD — the histogram bars are red and pointing downward, meaning momentum is still falling. RSI says 'the price looks cheap,' but MACD says 'it's still dropping.' That's a mixed signal.`;
      } else if (lastRSI > 70 && lastHist > 0) {
        disagreement = `The RSI is in the overbought zone at ${roundedRSI}, which might tempt you to sell. But look at the MACD — the histogram bars are green and pointing upward, meaning momentum is still rising. RSI says 'the price looks stretched,' but MACD says 'it's still climbing.' That's a mixed signal.`;
      } else {
        disagreement = `The RSI is at ${roundedRSI} (${rsiZone} zone) while the MACD histogram shows ${lastHist > 0 ? "upward" : "downward"} momentum. These two indicators are telling different stories.`;
      }
      return {
        headline: "The indicators disagree — best to wait for confirmation",
        rsiReason: `Look at the Momentum Meter (RSI) panel: ${rsiVisual}. This means ${rsiMeaning}.`,
        macdReason: `Now check the Trend Momentum (MACD) panel at the bottom: ${macdVisual}.`,
        confluenceReason: `${disagreement} When indicators disagree, acting on just one while ignoring the other is a common mistake. The safest move is to wait until both panels tell the same story before making a decision.`,
        disclaimer:
          "This is for educational purposes only. Past patterns do not guarantee future results.",
      };
    }
  }
}

export function generateLevel3Scenario(
  index: number,
  difficulty: Difficulty,
  seed: number
): Level3Scenario {
  const rng = createRng(seed);
  const targetAnswer = ANSWER_ROTATION[index % ANSWER_ROTATION.length];

  const candles = generateCandles({
    basePrice: 100 + rng() * 200,
    baseVolume: 2000000,
    phases: getConfluencePhases(targetAnswer, difficulty),
    seed: seed + 1,
  });

  const closes = candles.map((c) => c.close);
  const rsiValues = calculateRSI(closes);
  const macdResult = calculateMACD(closes);

  const rsiData: RSIIndicatorData = {
    type: "rsi",
    values: toTimeValues(candles, rsiValues),
  };

  const macdData: MACDIndicatorData = {
    type: "macd",
    macdLine: toTimeValues(candles, macdResult.macdLine),
    signalLine: toTimeValues(candles, macdResult.signalLine),
    histogram: toHistogramPoints(candles, macdResult.histogram),
  };

  return {
    id: `l3-${difficulty}-${index}`,
    level: 3,
    difficulty,
    question: "Based on both indicators, what action does this chart suggest?",
    chart: { candles, rsi: rsiData, macd: macdData },
    options: [
      {
        id: "buy",
        label: "Buy",
        description: "Both indicators agree: likely time to buy",
      },
      {
        id: "wait",
        label: "Wait",
        description: "Mixed signals: wait for confirmation",
      },
      {
        id: "sell",
        label: "Sell",
        description: "Both indicators agree: likely time to sell",
      },
    ],
    correctAnswer: targetAnswer,
    explanation: buildLevel3Explanation(
      targetAnswer,
      rsiValues,
      macdResult.histogram
    ),
  };
}
