"use client";

import { Home, Flame } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { LevelNumber } from "@/lib/types";

interface RoundHeaderProps {
  level: LevelNumber;
  round: number;
  totalRounds: number;
  streak: number;
  onHome: () => void;
}

const LEVEL_TITLES: Record<LevelNumber, string> = {
  1: "Indicator Recognition",
  2: "Fakeout vs Breakout",
  3: "Confluence",
};

export function RoundHeader({
  level,
  round,
  totalRounds,
  streak,
  onHome,
}: RoundHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onHome}
          className="p-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer min-w-[48px] min-h-[48px] flex items-center justify-center"
        >
          <Home className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-slate-500">
            Level {level} — {LEVEL_TITLES[level]}
          </p>
          <p className="text-sm font-medium text-slate-200">
            Round {round} of {totalRounds}
          </p>
        </div>
      </div>

      {/* Streak counter */}
      {streak > 0 && (
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
            "bg-amber-500/10 border border-amber-500/30",
            "animate-streak-pulse"
          )}
          key={streak}
        >
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-amber-400">{streak}</span>
        </div>
      )}
    </div>
  );
}
