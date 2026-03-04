"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/store/game-store";
import { SCORING } from "@/lib/constants/scoring";
import { RoundHeader } from "@/components/game/RoundHeader";
import { ProgressBar } from "@/components/game/ProgressBar";
import { AnswerFeedback } from "@/components/game/AnswerFeedback";
import { ChartOption } from "@/components/charts/ChartOption";
import { CandlestickChart } from "@/components/charts/CandlestickChart";
import { ConfluenceChart } from "@/components/charts/ConfluenceChart";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import type { Level1Scenario, Level2Scenario, Level3Scenario } from "@/lib/types";

function useChartHeight(base: number, mobile: number): number {
  const [height, setHeight] = useState(base);
  useEffect(() => {
    const update = () => setHeight(window.innerWidth < 768 ? mobile : base);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [base, mobile]);
  return height;
}

export default function PlayPage() {
  const router = useRouter();
  const {
    phase,
    currentLevel,
    currentRound,
    currentStreak,
    results,
    submitAnswer,
    nextRound,
    goHome,
    getCurrentScenario,
  } = useGameStore();

  const scenario = getCurrentScenario();

  // Redirect home if no active game
  if (!currentLevel || !scenario || phase === "home") {
    if (typeof window !== "undefined") {
      router.replace("/");
    }
    return null;
  }

  // Redirect to results when level ends
  if (phase === "results") {
    if (typeof window !== "undefined") {
      router.replace("/results");
    }
    return null;
  }

  const isFeedback = phase === "feedback";
  const lastResult = isFeedback ? results[results.length - 1] : null;
  const isLastRound = currentRound >= SCORING.ROUNDS_PER_LEVEL;
  const progressResults = results.map((r) => r.isCorrect);

  const handleHome = () => {
    goHome();
    router.push("/");
  };

  const handleNext = () => {
    nextRound();
    // If nextRound transitions to "results", the redirect above handles it
  };

  return (
    <main className="min-h-dvh flex flex-col p-4 max-w-3xl mx-auto">
      {/* Header + Progress */}
      <div className="space-y-3 mb-6">
        <RoundHeader
          level={currentLevel}
          round={currentRound}
          totalRounds={SCORING.ROUNDS_PER_LEVEL}
          streak={currentStreak}
          onHome={handleHome}
        />
        <ProgressBar
          current={currentRound}
          total={SCORING.ROUNDS_PER_LEVEL}
          results={progressResults}
        />
      </div>

      {/* Question + charts — keyed by round for fade-in animation */}
      <div key={currentRound} className="animate-fade-in-up">
        <p className="text-base font-medium text-slate-200 text-center mb-4">
          {scenario.question}
        </p>

        {/* Level-specific content */}
        {scenario.level === 1 && (
          <Level1Content
            scenario={scenario}
            isFeedback={isFeedback}
            playerAnswer={lastResult?.playerAnswer}
            onAnswer={submitAnswer}
          />
        )}
        {scenario.level === 2 && (
          <Level2Content
            scenario={scenario}
            isFeedback={isFeedback}
            playerAnswer={lastResult?.playerAnswer}
            onAnswer={submitAnswer}
          />
        )}
        {scenario.level === 3 && (
          <Level3Content
            scenario={scenario}
            isFeedback={isFeedback}
            playerAnswer={lastResult?.playerAnswer}
            onAnswer={submitAnswer}
          />
        )}
      </div>

      {/* Feedback overlay */}
      {isFeedback && lastResult && (
        <div className="mt-4">
          <AnswerFeedback
            isCorrect={lastResult.isCorrect}
            scenario={scenario}
            onNext={handleNext}
            isLastRound={isLastRound}
          />
        </div>
      )}
    </main>
  );
}

// ============================================================
// Level 1: Two charts, pick the buy signal
// ============================================================

function Level1Content({
  scenario,
  isFeedback,
  playerAnswer,
  onAnswer,
}: {
  scenario: Level1Scenario;
  isFeedback: boolean;
  playerAnswer?: string;
  onAnswer: (answer: string) => void;
}) {
  const chartHeight = useChartHeight(250, 180);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <ChartOption
        config={scenario.chartA}
        label={scenario.chartA.label}
        selected={playerAnswer === "A"}
        correct={isFeedback ? scenario.correctAnswer === "A" : undefined}
        disabled={isFeedback}
        chartHeight={chartHeight}
        onClick={() => onAnswer("A")}
      />
      <ChartOption
        config={scenario.chartB}
        label={scenario.chartB.label}
        selected={playerAnswer === "B"}
        correct={isFeedback ? scenario.correctAnswer === "B" : undefined}
        disabled={isFeedback}
        chartHeight={chartHeight}
        onClick={() => onAnswer("B")}
      />
    </div>
  );
}

// ============================================================
// Level 2: Read the Signal — single chart, 3 answer buttons
// ============================================================

function Level2Content({
  scenario,
  isFeedback,
  playerAnswer,
  onAnswer,
}: {
  scenario: Level2Scenario;
  isFeedback: boolean;
  playerAnswer?: string;
  onAnswer: (answer: string) => void;
}) {
  const chartHeight = useChartHeight(250, 180);
  const colorMap = {
    buy: { active: "border-emerald-400 bg-emerald-500/10 text-emerald-400", base: "text-emerald-400" },
    wait: { active: "border-amber-400 bg-amber-500/10 text-amber-400", base: "text-amber-400" },
    sell: { active: "border-rose-400 bg-rose-500/10 text-rose-400", base: "text-rose-400" },
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <p className="text-xs text-slate-400 mb-2 px-1">
          <span className="text-sky-400 font-medium">Indicator:</span>{" "}
          {scenario.chart.label}
        </p>
        <div className="pointer-events-none">
          <CandlestickChart config={scenario.chart} height={chartHeight} />
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {scenario.options.map((option) => {
          const isSelected = playerAnswer === option.id;
          const isCorrectAnswer = scenario.correctAnswer === option.id;
          const colors = colorMap[option.id];

          return (
            <button
              key={option.id}
              onClick={() => onAnswer(option.id)}
              disabled={isFeedback}
              className={cn(
                "p-4 rounded-xl border border-slate-800 text-center transition-all cursor-pointer",
                "disabled:cursor-default min-h-[48px]",
                !isFeedback && "hover:bg-slate-800",
                isSelected && !isFeedback && colors.active,
                isFeedback && isCorrectAnswer && "border-emerald-400 bg-emerald-500/10",
                isFeedback && isSelected && !isCorrectAnswer && "border-rose-400 bg-rose-500/10"
              )}
            >
              <span className={cn("font-semibold text-base", colors.base)}>
                {option.label}
              </span>
              <p className="text-xs text-slate-400 mt-1 sm:hidden">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Level 3: Confluence — single chart, 3 answer buttons
// ============================================================

function Level3Content({
  scenario,
  isFeedback,
  playerAnswer,
  onAnswer,
}: {
  scenario: Level3Scenario;
  isFeedback: boolean;
  playerAnswer?: string;
  onAnswer: (answer: string) => void;
}) {
  const chartHeight = useChartHeight(350, 250);
  const colorMap = {
    buy: { active: "border-emerald-400 bg-emerald-500/10 text-emerald-400", base: "text-emerald-400" },
    wait: { active: "border-amber-400 bg-amber-500/10 text-amber-400", base: "text-amber-400" },
    sell: { active: "border-rose-400 bg-rose-500/10 text-rose-400", base: "text-rose-400" },
  };

  return (
    <div className="space-y-4">
      {/* Chart with both RSI + MACD */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-1 mb-2 px-1">
          <p className="text-xs text-slate-400">
            <span className="text-sky-400 font-medium">Top indicator:</span> Momentum Meter (RSI)
          </p>
          <p className="text-xs text-slate-400">
            <span className="text-orange-400 font-medium">Bottom indicator:</span> Trend Momentum (MACD)
          </p>
        </div>
        <div className="pointer-events-none">
          <ConfluenceChart
            candles={scenario.chart.candles}
            rsi={scenario.chart.rsi}
            macd={scenario.chart.macd}
            height={chartHeight}
          />
        </div>
      </Card>

      {/* Answer buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {scenario.options.map((option) => {
          const isSelected = playerAnswer === option.id;
          const isCorrectAnswer = scenario.correctAnswer === option.id;
          const colors = colorMap[option.id];

          return (
            <button
              key={option.id}
              onClick={() => onAnswer(option.id)}
              disabled={isFeedback}
              className={cn(
                "p-4 rounded-xl border border-slate-800 text-center transition-all cursor-pointer",
                "disabled:cursor-default min-h-[48px]",
                !isFeedback && "hover:bg-slate-800",
                isSelected && !isFeedback && colors.active,
                isFeedback && isCorrectAnswer && "border-emerald-400 bg-emerald-500/10",
                isFeedback && isSelected && !isCorrectAnswer && "border-rose-400 bg-rose-500/10"
              )}
            >
              <span className={cn("font-semibold text-base", colors.base)}>
                {option.label}
              </span>
              <p className="text-xs text-slate-400 mt-1 sm:hidden">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
