"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { GameScenario } from "@/lib/types";

interface AnswerFeedbackProps {
  isCorrect: boolean;
  scenario: GameScenario;
  onNext: () => void;
  isLastRound: boolean;
}

function getExplanationText(scenario: GameScenario) {
  if (scenario.level === 3) {
    const exp = scenario.explanation;
    return {
      headline: exp.headline,
      body: `${exp.rsiReason} ${exp.macdReason} ${exp.confluenceReason}`,
      disclaimer: exp.disclaimer,
    };
  }
  const exp = scenario.explanation;
  return {
    headline: exp.headline,
    body: `${exp.detail}\n\n${exp.lesson}`,
    disclaimer: exp.disclaimer,
  };
}

export function AnswerFeedback({
  isCorrect,
  scenario,
  onNext,
  isLastRound,
}: AnswerFeedbackProps) {
  const { headline, body, disclaimer } = getExplanationText(scenario);

  return (
    <div className="animate-bounce-in">
      <Card
        className={cn(
          "space-y-4",
          isCorrect
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-rose-500/30 bg-rose-500/5"
        )}
      >
        {/* Result icon + headline */}
        <div className="flex items-start gap-3">
          {isCorrect ? (
            <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p
              className={cn(
                "font-semibold text-base",
                isCorrect ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {isCorrect ? "Correct!" : "Not quite"}
            </p>
            <p className="text-sm text-slate-200 mt-1">{headline}</p>
          </div>
        </div>

        {/* Explanation body */}
        <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">
          {body}
        </p>

        {/* Disclaimer */}
        <p className="text-xs text-slate-600 italic">{disclaimer}</p>

        {/* Next button */}
        <Button
          variant={isCorrect ? "success" : "primary"}
          size="lg"
          onClick={onNext}
          className="w-full"
        >
          {isLastRound ? "See Results" : "Next Round"}
        </Button>
      </Card>
    </div>
  );
}
