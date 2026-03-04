import type {
  CoachingResponse,
  GameScenario,
  LevelNumber,
  LevelResult,
} from "@/lib/types";
import { INDICATOR_META } from "@/lib/constants/indicators";

interface RoundDigest {
  round: number;
  question: string;
  indicators: string[];
  playerAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanationHeadline: string;
}

interface LevelDigest {
  level: number;
  difficulty: string;
  score: number;
  stars: number;
  passed: boolean;
  bestStreak: number;
  rounds: RoundDigest[];
}

function getIndicatorNames(scenario: GameScenario): string[] {
  switch (scenario.level) {
    case 1:
      return [
        INDICATOR_META[scenario.chartA.indicator.type].friendlyName,
        INDICATOR_META[scenario.chartB.indicator.type].friendlyName,
      ];
    case 2:
      return [
        INDICATOR_META[scenario.chart.indicator.type].friendlyName,
      ];
    case 3:
      return [
        INDICATOR_META.rsi.friendlyName,
        INDICATOR_META.macd.friendlyName,
      ];
  }
}

function getExplanationHeadline(scenario: GameScenario): string {
  return scenario.explanation.headline;
}

function digestLevel(result: LevelResult): LevelDigest {
  return {
    level: result.level,
    difficulty: result.difficulty,
    score: result.score,
    stars: result.stars,
    passed: result.passed,
    bestStreak: result.bestStreak,
    rounds: result.rounds.map((r) => ({
      round: r.roundNumber,
      question: r.scenario.question,
      indicators: getIndicatorNames(r.scenario),
      playerAnswer: r.playerAnswer,
      correctAnswer: r.correctAnswer,
      isCorrect: r.isCorrect,
      explanationHeadline: getExplanationHeadline(r.scenario),
    })),
  };
}

export async function fetchCoaching(
  levelResults: Partial<Record<LevelNumber, LevelResult>>
): Promise<CoachingResponse> {
  const levels: LevelDigest[] = [];
  for (const lvl of [1, 2, 3] as LevelNumber[]) {
    const result = levelResults[lvl];
    if (result) {
      levels.push(digestLevel(result));
    }
  }

  const response = await fetch("/api/coaching", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ levels }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Coaching API returned ${response.status}`);
  }

  return response.json();
}
