import type { IndicatorType } from "@/lib/types";

export interface IndicatorMeta {
  friendlyName: string;
  technicalName: string;
  description: string;
  buyDescription: string;
  sellDescription: string;
  waitDescription: string;
  neutralDescription: string;
  color: string;
  secondaryColor?: string;
}

export const INDICATOR_META: Record<IndicatorType, IndicatorMeta> = {
  rsi: {
    friendlyName: "Momentum Meter",
    technicalName: "RSI",
    description: "Measures how fast a stock is moving up or down",
    buyDescription:
      "dropped below 30, which historically suggests the stock may be oversold — like a rubber band stretched too far down",
    sellDescription:
      "climbed above 70, which historically suggests the stock may be overbought — like a rubber band stretched too far up",
    waitDescription:
      "is sitting in the middle zone (30-70), showing no extreme condition in either direction",
    neutralDescription:
      "is sitting in the middle zone, showing no strong direction",
    color: "#38bdf8",
  },
  bollinger: {
    friendlyName: "Price Squeeze Bands",
    technicalName: "Bollinger Bands",
    description:
      "Shows if a stock price is stretched too far from its average",
    buyDescription:
      "the price touched the lower band, historically suggesting it may bounce back toward the middle",
    sellDescription:
      "the price touched the upper band, historically suggesting it may pull back toward the middle",
    waitDescription:
      "the price is floating near the middle band, not stretched in either direction",
    neutralDescription:
      "the price is floating near the middle band with no extreme stretch",
    color: "#fbbf24",
    secondaryColor: "#fbbf2480",
  },
  macd: {
    friendlyName: "Trend Momentum",
    technicalName: "MACD",
    description:
      "Shows if a stock's momentum is shifting direction — like watching which way the wind is blowing",
    buyDescription:
      "the momentum line crossed above the signal line, suggesting a potential shift upward",
    sellDescription:
      "the momentum line crossed below the signal line, suggesting a potential shift downward",
    waitDescription:
      "the lines are tangled together near zero with no clear momentum direction",
    neutralDescription:
      "the lines are running side by side with no crossover",
    color: "#38bdf8",
    secondaryColor: "#fb923c",
  },
  ma_crossover: {
    friendlyName: "Average Crossover",
    technicalName: "Moving Average Crossover",
    description:
      "Compares short-term and long-term price trends — like a speedboat vs. a cargo ship",
    buyDescription:
      "the short-term average crossed above the long-term average, suggesting the recent trend is potentially turning upward",
    sellDescription:
      "the short-term average crossed below the long-term average, suggesting the recent trend is potentially turning downward",
    waitDescription:
      "the two averages are running close together with no clear crossover",
    neutralDescription:
      "the two averages are running parallel with no change in direction",
    color: "#34d399",
    secondaryColor: "#fbbf24",
  },
  stochastic: {
    friendlyName: "Speed Gauge",
    technicalName: "Stochastic Oscillator",
    description:
      "Measures how close the price is to its recent highs or lows",
    buyDescription:
      "dropped below 20, historically suggesting that selling pressure may be easing",
    sellDescription:
      "climbed above 80, historically suggesting that buying pressure may be easing",
    waitDescription:
      "is in the middle zone (20-80), showing balanced buying and selling pressure",
    neutralDescription:
      "is in the middle range, showing balanced buying and selling",
    color: "#38bdf8",
    secondaryColor: "#fbbf24",
  },
};
