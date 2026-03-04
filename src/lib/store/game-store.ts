import { create } from "zustand";
import type {
  Difficulty,
  GamePhase,
  GameScenario,
  LevelNumber,
  LevelResult,
  LevelStatus,
  RoundResult,
} from "@/lib/types";
import { calculateStars, SCORING } from "@/lib/constants/scoring";
import { loadGameScenarios } from "@/lib/services/scenario-loader";

interface GameState {
  phase: GamePhase;
  levelStatuses: Record<LevelNumber, LevelStatus>;
  currentLevel: LevelNumber | null;
  currentDifficulty: Difficulty;
  currentRound: number;
  scenarios: GameScenario[];
  results: RoundResult[];
  currentStreak: number;
  bestStreak: number;
  levelResults: Partial<Record<LevelNumber, LevelResult>>;
}

interface GameActions {
  startLevel: (level: LevelNumber, difficulty: Difficulty) => void;
  submitAnswer: (answer: string) => void;
  nextRound: () => void;
  goHome: () => void;
  viewSummary: () => void;
  reset: () => void;
  getCurrentScenario: () => GameScenario | null;
  getScore: () => number;
}

const initialState: GameState = {
  phase: "home",
  levelStatuses: { 1: "unlocked", 2: "locked", 3: "locked" },
  currentLevel: null,
  currentDifficulty: "easy",
  currentRound: 1,
  scenarios: [],
  results: [],
  currentStreak: 0,
  bestStreak: 0,
  levelResults: {},
};

export const useGameStore = create<GameState & GameActions>()((set, get) => ({
  ...initialState,

  startLevel: (level, difficulty) => {
    const scenarios = loadGameScenarios(level, difficulty);
    set({
      phase: "playing",
      currentLevel: level,
      currentDifficulty: difficulty,
      currentRound: 1,
      scenarios,
      results: [],
      currentStreak: 0,
      bestStreak: 0,
    });
  },

  submitAnswer: (answer) => {
    const state = get();
    const scenario = state.scenarios[state.currentRound - 1];
    if (!scenario) return;

    const isCorrect = answer === scenario.correctAnswer;
    const newStreak = isCorrect ? state.currentStreak + 1 : 0;

    const result: RoundResult = {
      roundNumber: state.currentRound,
      scenario,
      playerAnswer: answer,
      correctAnswer: scenario.correctAnswer,
      isCorrect,
    };

    set({
      phase: "feedback",
      currentStreak: newStreak,
      bestStreak: Math.max(state.bestStreak, newStreak),
      results: [...state.results, result],
    });
  },

  nextRound: () => {
    const state = get();

    if (state.currentRound >= SCORING.ROUNDS_PER_LEVEL) {
      const score = state.results.filter((r) => r.isCorrect).length;
      const stars = calculateStars(score);
      const passed = score >= SCORING.PASS_THRESHOLD;
      const level = state.currentLevel!;

      const levelResult: LevelResult = {
        level,
        difficulty: state.currentDifficulty,
        score,
        stars,
        passed,
        rounds: state.results,
        bestStreak: state.bestStreak,
      };

      const newStatuses = { ...state.levelStatuses };
      if (passed) {
        newStatuses[level] = "completed";
        if (level < 3) {
          const nextLevel = (level + 1) as LevelNumber;
          if (newStatuses[nextLevel] === "locked") {
            newStatuses[nextLevel] = "unlocked";
          }
        }
      }

      set({
        phase: "results",
        levelStatuses: newStatuses,
        levelResults: { ...state.levelResults, [level]: levelResult },
      });
    } else {
      set({
        phase: "playing",
        currentRound: state.currentRound + 1,
      });
    }
  },

  goHome: () => {
    const { levelStatuses, levelResults } = get();
    set({
      phase: "home",
      currentLevel: null,
      currentRound: 1,
      scenarios: [],
      results: [],
      currentStreak: 0,
      bestStreak: 0,
      levelStatuses,
      levelResults,
    });
  },

  viewSummary: () => set({ phase: "summary" }),

  reset: () => set(initialState),

  getCurrentScenario: () => {
    const state = get();
    return state.scenarios[state.currentRound - 1] ?? null;
  },

  getScore: () => {
    return get().results.filter((r) => r.isCorrect).length;
  },
}));
