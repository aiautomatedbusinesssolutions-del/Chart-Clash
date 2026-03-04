import type { LevelResult, LevelNumber, PersonalizedAdvice } from "@/lib/types";

const LEVEL_STRENGTHS: Record<LevelNumber, string> = {
  1: "Recognizing individual indicator signals",
  2: "Reading what individual indicators are telling you",
  3: "Reading confluence between multiple indicators",
};

const LEVEL_WEAKNESSES: Record<LevelNumber, string> = {
  1: "Identifying buy conditions from indicators",
  2: "Interpreting what a single indicator is telling you (buy, sell, or wait)",
  3: "Combining RSI and MACD to make a decision",
};

const LEVEL_TIPS: Record<LevelNumber, string[]> = {
  1: [
    "Focus on the extreme zones — RSI below 30 or above 70, Stochastic below 20 or above 80.",
    "Bollinger Bands touching the lower band often suggests a potential bounce, but always confirm with other signals.",
    "Look at the MACD histogram direction — rising bars suggest building momentum.",
  ],
  2: [
    "Each indicator has clear zones: RSI below 30 = buy, above 70 = sell. Practice spotting these thresholds.",
    "When an indicator is in the middle of its range, it often means 'wait' — no clear signal yet.",
    "Try connecting what you learned here to Level 3, where two indicators work together.",
  ],
  3: [
    "Confluence means agreement — when both RSI and MACD say the same thing, the signal is stronger.",
    "When indicators disagree, patience pays off. Wait for alignment before acting.",
    "Remember: no single indicator is perfect. Two agreeing indicators reduce (but don't eliminate) risk.",
  ],
};

export function generateAdvice(
  levelResults: Partial<Record<LevelNumber, LevelResult>>
): PersonalizedAdvice {
  let overallScore = 0;
  let totalStars = 0;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const tips: string[] = [];

  for (const level of [1, 2, 3] as LevelNumber[]) {
    const result = levelResults[level];
    if (!result) continue;

    overallScore += result.score;
    totalStars += result.stars;

    if (result.score >= 8) {
      strengths.push(LEVEL_STRENGTHS[level]);
    }
    if (result.score < 7) {
      weaknesses.push(LEVEL_WEAKNESSES[level]);
      tips.push(LEVEL_TIPS[level][0]);
    } else if (result.score < 9) {
      // Good but room for improvement — give a tip anyway
      tips.push(LEVEL_TIPS[level][1]);
    }
  }

  // Fallback if no weaknesses
  if (weaknesses.length === 0) {
    strengths.push("Consistent performance across all levels");
  }

  // Fallback if no tips
  if (tips.length === 0) {
    tips.push(
      "You've mastered the basics. Next challenge: try harder difficulty levels to sharpen your edge."
    );
  }

  return { overallScore, totalStars, strengths, weaknesses, tips };
}
