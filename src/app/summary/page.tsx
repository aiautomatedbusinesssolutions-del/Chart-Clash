"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Loader2,
  MessageCircle,
  Target,
  Zap,
} from "lucide-react";
import { useGameStore } from "@/lib/store/game-store";
import { generateAdvice } from "@/lib/utils/advice";
import { fetchCoaching } from "@/lib/services/coaching";
import { SCORING } from "@/lib/constants/scoring";
import { StarRating } from "@/components/game/StarRating";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import type { LevelNumber, CoachingResponse } from "@/lib/types";

const LEVEL_TITLES: Record<LevelNumber, string> = {
  1: "Indicator Recognition",
  2: "Read the Signal",
  3: "Confluence",
};

const bulletClass =
  "text-sm text-slate-300 pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full";

function SkeletonCard() {
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center gap-2">
        <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
        <p className="text-sm text-slate-400">
          Your coach is reviewing your performance...
        </p>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-800 rounded animate-pulse w-full" />
        <div className="h-4 bg-slate-800 rounded animate-pulse w-4/5" />
        <div className="h-4 bg-slate-800 rounded animate-pulse w-3/5" />
      </div>
    </Card>
  );
}

function CoachingSection({ coaching }: { coaching: CoachingResponse }) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Encouragement banner */}
      <Card className="p-5 border-sky-500/20">
        <div className="flex items-start gap-3">
          <MessageCircle className="w-5 h-5 text-sky-400 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-200 leading-relaxed">
            {coaching.encouragement}
          </p>
        </div>
      </Card>

      {/* Strengths */}
      {coaching.strengths.length > 0 && (
        <Card className="space-y-3 p-5 border-emerald-500/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-medium text-emerald-400">
              Your Strengths
            </h2>
          </div>
          <ul className="space-y-2">
            {coaching.strengths.map((s, i) => (
              <li
                key={i}
                className={cn(bulletClass, "before:bg-emerald-400")}
              >
                {s}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Weaknesses */}
      {coaching.weaknesses.length > 0 && (
        <Card className="space-y-3 p-5 border-amber-500/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-medium text-amber-400">
              Areas to Improve
            </h2>
          </div>
          <ul className="space-y-2">
            {coaching.weaknesses.map((w, i) => (
              <li key={i} className={cn(bulletClass, "before:bg-amber-400")}>
                {w}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Next Steps */}
      {coaching.nextSteps.length > 0 && (
        <Card className="space-y-3 p-5 border-sky-500/20">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-medium text-sky-400">
              What to Focus On Next
            </h2>
          </div>
          <ul className="space-y-2">
            {coaching.nextSteps.map((s, i) => (
              <li key={i} className={cn(bulletClass, "before:bg-sky-400")}>
                {s}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Fun Fact */}
      {coaching.funFact && (
        <Card className="p-5 border-slate-700">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">
                Did You Know?
              </p>
              <p className="text-sm text-slate-400">{coaching.funFact}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function RuleBasedSection({
  strengths,
  weaknesses,
  tips,
}: {
  strengths: string[];
  weaknesses: string[];
  tips: string[];
}) {
  return (
    <>
      {strengths.length > 0 && (
        <Card className="space-y-3 p-5 border-emerald-500/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-medium text-emerald-400">
              Your Strengths
            </h2>
          </div>
          <ul className="space-y-2">
            {strengths.map((s, i) => (
              <li
                key={i}
                className={cn(bulletClass, "before:bg-emerald-400")}
              >
                {s}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {weaknesses.length > 0 && (
        <Card className="space-y-3 p-5 border-amber-500/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-medium text-amber-400">
              Areas to Improve
            </h2>
          </div>
          <ul className="space-y-2">
            {weaknesses.map((w, i) => (
              <li key={i} className={cn(bulletClass, "before:bg-amber-400")}>
                {w}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="space-y-3 p-5 border-sky-500/20">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-sky-400" />
          <h2 className="text-sm font-medium text-sky-400">Tips for You</h2>
        </div>
        <ul className="space-y-2">
          {tips.map((t, i) => (
            <li key={i} className={cn(bulletClass, "before:bg-sky-400")}>
              {t}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

export default function SummaryPage() {
  const router = useRouter();
  const { levelResults, goHome, reset } = useGameStore();

  const [coaching, setCoaching] = useState<CoachingResponse | null>(null);
  const [coachingLoading, setCoachingLoading] = useState(true);
  const [coachingFailed, setCoachingFailed] = useState(false);

  // Redirect if no results
  const hasResults = Object.keys(levelResults).length > 0;

  useEffect(() => {
    if (!hasResults) return;

    let cancelled = false;

    fetchCoaching(levelResults)
      .then((result) => {
        if (!cancelled) {
          setCoaching(result);
          setCoachingLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCoachingFailed(true);
          setCoachingLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasResults, levelResults]);

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
            <StarRating
              stars={Math.round(advice.totalStars / 3)}
              size="lg"
              animated
            />
          </div>
          <p className="text-sm text-slate-400">
            Total stars earned: {advice.totalStars}/9
          </p>
        </Card>

        {/* Per-level breakdown */}
        <Card className="space-y-3 p-5">
          <h2 className="text-sm font-medium text-slate-400">
            Level Breakdown
          </h2>
          {([1, 2, 3] as LevelNumber[]).map((level) => {
            const result = levelResults[level];
            if (!result) return null;
            return (
              <div
                key={level}
                className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Level {level}: {LEVEL_TITLES[level]}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">
                    {result.difficulty} difficulty
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-sm font-bold",
                      result.passed ? "text-emerald-400" : "text-rose-400"
                    )}
                  >
                    {result.score}/{SCORING.ROUNDS_PER_LEVEL}
                  </span>
                  <StarRating stars={result.stars} size="sm" />
                </div>
              </div>
            );
          })}
        </Card>

        {/* Coaching section: loading → AI coaching → rule-based fallback */}
        {coachingLoading ? (
          <SkeletonCard />
        ) : coaching ? (
          <CoachingSection coaching={coaching} />
        ) : (
          <>
            {coachingFailed && (
              <p className="text-xs text-slate-600 text-center">
                AI coaching unavailable — showing standard feedback instead.
              </p>
            )}
            <RuleBasedSection
              strengths={advice.strengths}
              weaknesses={advice.weaknesses}
              tips={advice.tips}
            />
          </>
        )}

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
          <Button
            variant="primary"
            size="lg"
            onClick={handleHome}
            className="w-full"
          >
            Back to Levels
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={handleRestart}
            className="w-full"
          >
            Start Fresh
          </Button>
        </div>

        <p className="text-xs text-slate-600 text-center px-4">
          For educational purposes only. AI-generated coaching is personalized
          but not financial advice. Past patterns do not guarantee future
          results.
        </p>
      </div>
    </main>
  );
}
