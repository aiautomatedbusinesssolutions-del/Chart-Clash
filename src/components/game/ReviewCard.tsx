import { CheckCircle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import type { RoundResult } from "@/lib/types";

interface ReviewCardProps {
  result: RoundResult;
}

function getHeadline(result: RoundResult): string {
  const scenario = result.scenario;
  if (scenario.level === 3) {
    return scenario.explanation.headline;
  }
  return scenario.explanation.headline;
}

export function ReviewCard({ result }: ReviewCardProps) {
  const headline = getHeadline(result);

  return (
    <Card
      className={cn(
        "space-y-2",
        result.isCorrect
          ? "border-emerald-500/20"
          : "border-rose-500/20"
      )}
    >
      <div className="flex items-start gap-3">
        {result.isCorrect ? (
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-300">
              Round {result.roundNumber}
            </span>
            {!result.isCorrect && (
              <span className="text-xs text-slate-500">
                You picked {result.playerAnswer} — correct was {result.correctAnswer}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">{headline}</p>
        </div>
      </div>
    </Card>
  );
}
