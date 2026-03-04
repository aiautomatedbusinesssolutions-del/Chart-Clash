"use client";

import { CandlestickChart } from "@/components/charts/CandlestickChart";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import type { ChartConfig } from "@/lib/types";

interface ChartOptionProps {
  config: ChartConfig;
  label: string;
  selected?: boolean;
  correct?: boolean;
  disabled?: boolean;
  chartHeight?: number;
  onClick: () => void;
}

export function ChartOption({
  config,
  label,
  selected = false,
  correct,
  disabled = false,
  chartHeight = 200,
  onClick,
}: ChartOptionProps) {
  const showResult = correct !== undefined;
  const isCorrect = showResult && correct;
  const isWrong = showResult && selected && !correct;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full text-left cursor-pointer disabled:cursor-default transition-all",
        !showResult && !disabled && "hover:scale-[1.01] active:scale-[0.99]"
      )}
    >
      <Card
        className={cn(
          "overflow-hidden transition-all",
          !showResult && !disabled && "hover:border-sky-500/50",
          selected && !showResult && "border-sky-400 bg-sky-500/5",
          isCorrect && "border-emerald-400 bg-emerald-500/5",
          isWrong && "border-rose-400 bg-rose-500/5"
        )}
      >
        {/* Chart label */}
        <div className="flex items-center justify-between mb-2 px-1">
          <span
            className={cn(
              "text-sm font-medium",
              isCorrect && "text-emerald-400",
              isWrong && "text-rose-400",
              !showResult && "text-slate-300"
            )}
          >
            {label}
          </span>
          {isCorrect && (
            <span className="text-xs font-medium text-emerald-400">
              Correct
            </span>
          )}
          {isWrong && (
            <span className="text-xs font-medium text-rose-400">
              Your pick
            </span>
          )}
        </div>

        {/* Chart — pointer events disabled so clicks go to the button */}
        <div className="pointer-events-none">
          <CandlestickChart config={config} height={chartHeight} />
        </div>
      </Card>
    </button>
  );
}
