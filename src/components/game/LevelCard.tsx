"use client";

import { Lock, Star, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import type { LevelNumber, LevelStatus } from "@/lib/types";

interface LevelCardProps {
  level: LevelNumber;
  status: LevelStatus;
  stars?: number;
  onSelect: (level: LevelNumber) => void;
}

const LEVEL_INFO: Record<
  LevelNumber,
  { title: string; subtitle: string; description: string }
> = {
  1: {
    title: "Indicator Recognition",
    subtitle: "Learn the basics",
    description:
      "Two charts, two indicators — tap the one showing a potential buy signal.",
  },
  2: {
    title: "Read the Signal",
    subtitle: "Interpret the indicator",
    description:
      "One chart, one indicator — is it telling you to Buy, Sell, or Wait?",
  },
  3: {
    title: "Confluence",
    subtitle: "Put it all together",
    description:
      "RSI + MACD on one chart — do they agree on Buy, Wait, or Sell?",
  },
};

export function LevelCard({ level, status, stars = 0, onSelect }: LevelCardProps) {
  const info = LEVEL_INFO[level];
  const isLocked = status === "locked";
  const isCompleted = status === "completed";

  return (
    <button
      disabled={isLocked}
      onClick={() => onSelect(level)}
      className="w-full text-left cursor-pointer disabled:cursor-not-allowed"
    >
      <Card
        className={cn(
          "relative overflow-hidden transition-all",
          isLocked && "opacity-50",
          !isLocked && "hover:border-slate-700 hover:bg-slate-800/50"
        )}
      >
        <div className="flex items-center gap-4">
          {/* Level number badge */}
          <div
            className={cn(
              "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold",
              isLocked && "bg-slate-800 text-slate-500",
              !isLocked && !isCompleted && "bg-sky-500/10 text-sky-400",
              isCompleted && "bg-emerald-500/10 text-emerald-400"
            )}
          >
            {isLocked ? <Lock className="w-5 h-5" /> : level}
          </div>

          {/* Level info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100 text-base">
                {info.title}
              </h3>
              {isCompleted && (
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={cn(
                        "w-4 h-4",
                        s <= stars
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-600"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">{info.subtitle}</p>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {info.description}
            </p>
          </div>

          {/* Arrow */}
          {!isLocked && (
            <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
          )}
        </div>
      </Card>
    </button>
  );
}
