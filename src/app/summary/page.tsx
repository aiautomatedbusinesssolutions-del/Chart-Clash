"use client";

import { useRouter } from "next/navigation";
import { Trophy, TrendingUp, AlertTriangle, Lightbulb, Sparkles } from "lucide-react";
import { useGameStore } from "@/lib/store/game-store";
import { generateAdvice } from "@/lib/utils/advice";
import { SCORING } from "@/lib/constants/scoring";
import { StarRating } from "@/components/game/StarRating";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import type { LevelNumber } from "@/lib/types";

const LEVEL_TITLES: Record<LevelNumber, string> = {
  1: "Indicator Recognition",
  2: "Fakeout vs Breakout",
  3: "Confluence",
};

export default function SummaryPage() {
  const router = useRouter();
  const { levelResults, goHome, reset } = useGameStore();

  // Redirect if no results
  const hasResults = Object.keys(levelResults).length > 0;
  if (!hasResults) {
    if (typeof window !== "undefined") {
      router.replace("/");
    }
    return null;
  }

  const advice = generateAdvice(levelResults);
  const maxScore = SCORING.ROUNDS_PER_LEVEL * SCORING.LEVELS_COUNT;

  const handleHome = () => {
    goHome();
    router.push("/");
  };

  const handleRestart = () => {
    reset();
    router.push("/");
  };

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Overall score */}
        <Card className="text-center space-y-4 p-6">
          <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-100">
            Challenge Complete!
          </h1>
          <p className="text-5xl font-bold text-slate-100">
            {advice.overallScore}/{maxScore}
          </p>
          <div className="flex justify-center">
            <StarRating stars={Math.round(advice.totalStars / 3)} size="lg" animated />
          </div>
          <p className="text-sm text-slate-400">
            Total stars earned: {advice.totalStars}/9
          </p>
        </Card>

        {/* Per-level breakdown */}
        <Card className="space-y-3 p-5">
          <h2 className="text-sm font-medium text-slate-400">Level Breakdown</h2>
          {([1, 2, 3] as LevelNumber[]).map((level) => {
            const result = levelResults[level];
            if (!result) return null;
            return (
              <div key={level} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Level {level}: {LEVEL_TITLES[level]}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">
                    {result.difficulty} difficulty
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-sm font-bold",
                    result.passed ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {result.score}/{SCORING.ROUNDS_PER_LEVEL}
                  </span>
                  <StarRating stars={result.stars} size="sm" />
                </div>
              </div>
            );
          })}
        </Card>

        {/* Strengths */}
        {advice.strengths.length > 0 && (
          <Card className="space-y-3 p-5 border-emerald-500/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-medium text-emerald-400">Your Strengths</h2>
            </div>
            <ul className="space-y-2">
              {advice.strengths.map((s, i) => (
                <li key={i} className="text-sm text-slate-300 pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-emerald-400 before:rounded-full">
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Weaknesses */}
        {advice.weaknesses.length > 0 && (
          <Card className="space-y-3 p-5 border-amber-500/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-medium text-amber-400">Areas to Improve</h2>
            </div>
            <ul className="space-y-2">
              {advice.weaknesses.map((w, i) => (
                <li key={i} className="text-sm text-slate-300 pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-amber-400 before:rounded-full">
                  {w}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Tips */}
        <Card className="space-y-3 p-5 border-sky-500/20">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-medium text-sky-400">Tips for You</h2>
          </div>
          <ul className="space-y-2">
            {advice.tips.map((t, i) => (
              <li key={i} className="text-sm text-slate-300 pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-sky-400 before:rounded-full">
                {t}
              </li>
            ))}
          </ul>
        </Card>

        {/* Coming soon teaser */}
        <Card className="text-center p-5 border-slate-700">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-slate-500" />
            <h2 className="text-sm font-medium text-slate-500">Coming Soon</h2>
          </div>
          <p className="text-xs text-slate-600">
            Levels 4 & 5 — Volume Analysis and Multi-Indicator Mastery
          </p>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button variant="primary" size="lg" onClick={handleHome} className="w-full">
            Back to Levels
          </Button>
          <Button variant="ghost" size="md" onClick={handleRestart} className="w-full">
            Start Fresh
          </Button>
        </div>

        <p className="text-xs text-slate-600 text-center px-4">
          For educational purposes only. Past patterns do not guarantee future results.
          This is not financial advice.
        </p>
      </div>
    </main>
  );
}
