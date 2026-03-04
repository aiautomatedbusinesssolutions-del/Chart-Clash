export const SCORING = {
  ROUNDS_PER_LEVEL: 10,
  PASS_THRESHOLD: 7,
  LEVELS_COUNT: 3,
  STAR_THRESHOLDS: {
    THREE: 10,
    TWO: 8,
    ONE: 7,
  },
} as const;

export function calculateStars(score: number): number {
  if (score >= SCORING.STAR_THRESHOLDS.THREE) return 3;
  if (score >= SCORING.STAR_THRESHOLDS.TWO) return 2;
  if (score >= SCORING.STAR_THRESHOLDS.ONE) return 1;
  return 0;
}
