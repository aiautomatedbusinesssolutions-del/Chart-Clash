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

function getFakeoutPhases(difficulty: Difficulty): PhaseConfig[] {
  const intensity = { easy: 1.0, medium: 0.7, hard: 0.4 }[difficulty];
  return [
    { length: 25, dailyReturn: -0.004, volatility: 0.007 },
    { length: 10, dailyReturn: 0.007 * intensity, volatility: 0.005 },
    { length: 15, dailyReturn: -0.005, volatility: 0.006 },
    { length: 10, dailyReturn: -0.002, volatility: 0.006 },
  ];
}

function getBreakoutPhases(difficulty: Difficulty): PhaseConfig[] {
  const intensity = { easy: 1.0, medium: 0.7, hard: 0.4 }[difficulty];
  return [
    { length: 25, dailyReturn: -0.004, volatility: 0.005 },
    { length: 5, dailyReturn: 0.001, volatility: 0.003 },
    { length: 20, dailyReturn: 0.007 * intensity, volatility: 0.004 },
    { length: 10, dailyReturn: 0.004 * intensity, volatility: 0.005 },
  ];
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
// Level 2: Fakeout vs Breakout
// ============================================================

const STOCK_LABELS = [
  "Stock Alpha",
  "Stock Beta",
  "Stock Gamma",
  "Stock Delta",
  "Stock Echo",
  "Stock Foxtrot",
  "Stock Golf",
  "Stock Hotel",
  "Stock India",
  "Stock Juliet",
  "Stock Kilo",
  "Stock Lima",
];

export function generateLevel2Scenario(
  index: number,
  difficulty: Difficulty,
  seed: number
): Level2Scenario {
  const rng = createRng(seed);
  const stockLabel = STOCK_LABELS[index % STOCK_LABELS.length];

  const fakeoutCandles = generateCandles({
    basePrice: 100 + rng() * 200,
    baseVolume: 2000000,
    phases: getFakeoutPhases(difficulty),
    seed: seed + 1,
  });
  const fakeoutMACD = computeIndicator(fakeoutCandles, "macd");

  const breakoutCandles = generateCandles({
    basePrice: 100 + rng() * 200,
    baseVolume: 2000000,
    phases: getBreakoutPhases(difficulty),
    seed: seed + 2,
  });
  const breakoutMACD = computeIndicator(breakoutCandles, "macd");

  const fakeoutIsDaily = difficulty === "hard" ? rng() > 0.5 : true;
  const breakoutOnA = rng() > 0.5;

  const dailyTf = fakeoutIsDaily ? "daily" : "weekly";
  const weeklyTf = fakeoutIsDaily ? "weekly" : "daily";

  return {
    id: `l2-${difficulty}-${index}`,
    level: 2,
    difficulty,
    question:
      "Which chart shows a more reliable buy signal — and which might be a trap?",
    stockLabel,
    chartA: breakoutOnA
      ? {
          candles: breakoutCandles,
          indicator: breakoutMACD,
          label: `Chart A — ${weeklyTf.charAt(0).toUpperCase() + weeklyTf.slice(1)} View`,
          timeframe: weeklyTf as "daily" | "weekly",
        }
      : {
          candles: fakeoutCandles,
          indicator: fakeoutMACD,
          label: `Chart A — ${dailyTf.charAt(0).toUpperCase() + dailyTf.slice(1)} View`,
          timeframe: dailyTf as "daily" | "weekly",
        },
    chartB: breakoutOnA
      ? {
          candles: fakeoutCandles,
          indicator: fakeoutMACD,
          label: `Chart B — ${dailyTf.charAt(0).toUpperCase() + dailyTf.slice(1)} View`,
          timeframe: dailyTf as "daily" | "weekly",
        }
      : {
          candles: breakoutCandles,
          indicator: breakoutMACD,
          label: `Chart B — ${weeklyTf.charAt(0).toUpperCase() + weeklyTf.slice(1)} View`,
          timeframe: weeklyTf as "daily" | "weekly",
        },
    correctAnswer: breakoutOnA ? "A" : "B",
    explanation: {
      headline: `Chart ${breakoutOnA ? "A" : "B"} shows the more reliable signal`,
      detail: `The ${fakeoutIsDaily ? "daily" : "weekly"} chart's Trend Momentum crossed briefly but quickly faded — a classic fakeout. The ${fakeoutIsDaily ? "weekly" : "daily"} chart shows sustained momentum with growing bars, suggesting a more genuine shift.`,
      lesson:
        "When a short-term chart says \"go\" but the bigger picture disagrees, the bigger picture usually wins. Always check multiple timeframes before acting on a signal.",
      disclaimer:
        "This is for educational purposes only. Past patterns do not guarantee future results.",
    },
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
  rsiValues: (number | null)[]
): Level3Scenario["explanation"] {
  const lastRSI =
    ([...rsiValues].reverse().find((v) => v !== null) as number) ?? 50;

  switch (answer) {
    case "buy":
      return {
        headline: "Both indicators suggest a potential buying opportunity",
        rsiReason: `The Momentum Meter dropped to around ${Math.round(lastRSI)}, which is in the oversold zone. Historically, this suggests sellers may have pushed the price too low.`,
        macdReason:
          "The Trend Momentum histogram is turning positive, showing momentum may be shifting upward.",
        confluenceReason:
          'When two different indicators flash the same signal, it\'s called "confluence." It\'s like getting a second opinion — when both agree, you can have more confidence in the signal.',
        disclaimer:
          "This is for educational purposes only. Past patterns do not guarantee future results.",
      };
    case "sell":
      return {
        headline: "Both indicators suggest a potential selling opportunity",
        rsiReason: `The Momentum Meter climbed to around ${Math.round(lastRSI)}, which is in the overbought zone. Historically, this suggests buyers may have pushed the price too high.`,
        macdReason:
          "The Trend Momentum histogram is turning negative, showing momentum may be shifting downward.",
        confluenceReason:
          "Both indicators are flashing the same warning — the price may have gotten ahead of itself. When they agree, the signal carries more weight.",
        disclaimer:
          "This is for educational purposes only. Past patterns do not guarantee future results.",
      };
    case "wait":
      return {
        headline:
          "The indicators disagree — best to wait for confirmation",
        rsiReason:
          "The Momentum Meter is sending one signal, but it's not extreme enough to be decisive on its own.",
        macdReason:
          "The Trend Momentum is telling a different story, suggesting momentum hasn't fully committed to a direction.",
        confluenceReason:
          "When indicators disagree, it's like two friends giving opposite advice. The safest move is to wait until they start agreeing before making a decision.",
        disclaimer:
          "This is for educational purposes only. Past patterns do not guarantee future results.",
      };
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
      rsiValues
    ),
  };
}
