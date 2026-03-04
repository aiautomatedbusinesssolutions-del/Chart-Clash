"use client";

import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/store/game-store";
import { SCORING } from "@/lib/constants/scoring";
import { StarRating } from "@/components/game/StarRating";
import { ReviewCard } from "@/components/game/ReviewCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import type { LevelNumber } from "@/lib/types";

const LEVEL_TITLES: Record<LevelNumber, string> = {
  1: "Indicator Recognition",
  2: "Read the Signal",
  3: "Confluence",
};

export default function ResultsPage() {
  const router = useRouter();
  const {
    currentLevel,
    levelResults,
    levelStatuses,
    results,
    bestStreak,
    startLevel,
    goHome,
    viewSummary,
    currentDifficulty,
  } = useGameStore();

  // Redirect if no results
  if (!currentLevel) {
    if (typeof window !== "undefined") {
      router.replace("/");
    }
    return null;
  }

  const levelResult = levelResults[currentLevel];
  if (!levelResult) {
    if (typeof window !== "undefined") {
      router.replace("/");
    }
    return null;
  }

  const { score, stars, passed } = levelResult;
  const isLastLevel = currentLevel === 3;
  const nextLevelUnlocked = !isLastLevel && levelStatuses[(currentLevel + 1) as LevelNumber] !== "locked";

  const handleRetry = () => {
    startLevel(currentLevel, currentDifficulty);
    router.push("/play");
  };

  const handleNextLevel = () => {
    const next = (currentLevel + 1) as LevelNumber;
    startLevel(next, currentDifficulty);
    router.push("/play");
  };

  const handleHome = () => {
    goHome();
    router.push("/");
  };

  const handleSummary = () => {
    viewSummary();
    router.push("/summary");
  };

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Score card */}
        <Card className="text-center space-y-4 p-6">
          <p className="text-sm text-slate-400">
            Level {currentLevel} — {LEVEL_TITLES[currentLevel]}
          </p>

          <div className="flex justify-center">
            <StarRating stars={stars} size="lg" animated />
          </div>

          <div>
            <p className={cn(
              "text-4xl font-bold",
              passed ? "text-emerald-400" : "text-rose-400"
            )}>
              {score}/{SCORING.ROUNDS_PER_LEVEL}
            </p>
            <p className={cn(
              "text-sm mt-1",
              passed ? "text-emerald-400/70" : "text-rose-400/70"
            )}>
              {passed ? "Level passed!" : `Need ${SCORING.PASS_THRESHOLD}+ to pass`}
            </p>
          </div>

          {bestStreak > 1 && (
            <p className="text-sm text-amber-400">
              Best streak: {bestStreak} in a row
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-2">
            {passed && nextLevelUnlocked && (
              <Button variant="success" size="lg" onClick={handleNextLevel} className="w-full">
                Next Level
              </Button>
            )}
            {passed && isLastLevel && (
              <Button variant="success" size="lg" onClick={handleSummary} className="w-full">
                View Summary
              </Button>
            )}
            <Button
              variant={passed ? "secondary" : "primary"}
              size="lg"
              onClick={handleRetry}
              className="w-full"
            >
              {passed ? "Replay Level" : "Try Again"}
            </Button>
            <Button variant="ghost" size="md" onClick={handleHome} className="w-full">
              Back to Home
            </Button>
          </div>
        </Card>

        {/* Round review */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-400 px-1">
            Round Review
          </h3>
          {results.map((result) => (
            <ReviewCard key={result.roundNumber} result={result} />
          ))}
        </div>

        <p className="text-xs text-slate-600 text-center px-4">
          For educational purposes only. Past patterns do not guarantee future results.
        </p>
      </div>
    </main>
  );
}
