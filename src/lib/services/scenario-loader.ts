import type { Difficulty, GameScenario, LevelNumber } from "@/lib/types";
import {
  generateLevel1Scenario,
  generateLevel2Scenario,
  generateLevel3Scenario,
  hashString,
} from "@/lib/data/generators";

const POOL_SIZE = 12;
const GAME_SIZE = 10;

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

export function loadGameScenarios(
  level: LevelNumber,
  difficulty: Difficulty
): GameScenario[] {
  const pool = generatePool(level, difficulty);

  // Shuffle using Fisher-Yates
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, GAME_SIZE);
}
