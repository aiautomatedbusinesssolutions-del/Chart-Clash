import type { Difficulty, GameScenario, LevelNumber } from "@/lib/types";
import {
  generateLevel1Scenario,
  generateLevel2Scenario,
  generateLevel3Scenario,
  hashString,
} from "@/lib/data/generators";

const POOL_SIZE = 12;
const GAME_SIZE = 10;

function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generatePool(
  level: LevelNumber,
  difficulty: Difficulty
): GameScenario[] {
  const scenarios: GameScenario[] = [];

  for (let i = 0; i < POOL_SIZE; i++) {
    const seed = hashString(`${level}-${difficulty}-${i}-v1`);

    switch (level) {
      case 1:
        scenarios.push(generateLevel1Scenario(i, difficulty, seed));
        break;
      case 2:
        scenarios.push(generateLevel2Scenario(i, difficulty, seed));
        break;
      case 3:
        scenarios.push(generateLevel3Scenario(i, difficulty, seed));
        break;
    }
  }

  return scenarios;
}

async function fetchRealScenarios(
  level: LevelNumber,
  difficulty: Difficulty
): Promise<GameScenario[] | null> {
  try {
    const resp = await fetch(`/scenarios/level${level}/${difficulty}.json`);
    if (!resp.ok) return null;
    const data: GameScenario[] = await resp.json();
    return data.length >= GAME_SIZE ? data : null;
  } catch {
    return null;
  }
}

export async function loadGameScenarios(
  level: LevelNumber,
  difficulty: Difficulty
): Promise<GameScenario[]> {
  // Try real data first, fall back to procedural generation
  const realScenarios = await fetchRealScenarios(level, difficulty);
  const pool = realScenarios ?? generatePool(level, difficulty);
  return shuffle(pool).slice(0, GAME_SIZE);
}
