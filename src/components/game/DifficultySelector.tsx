"use client";

import { X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { Difficulty, LevelNumber } from "@/lib/types";

interface DifficultySelectorProps {
  level: LevelNumber;
  onSelect: (difficulty: Difficulty) => void;
  onCancel: () => void;
}

const DIFFICULTIES: {
  id: Difficulty;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    id: "easy",
    label: "Easy",
    description: "Textbook-clear signals — I'm just learning",
    color: "text-emerald-400",
  },
  {
    id: "medium",
    label: "Medium",
    description: "Moderate signals — I know the basics",
    color: "text-amber-400",
  },
  {
    id: "hard",
    label: "Hard",
    description: "Subtle, tricky signals — Challenge me",
    color: "text-rose-400",
  },
];

const LEVEL_TITLES: Record<LevelNumber, string> = {
  1: "Indicator Recognition",
  2: "Fakeout vs Breakout",
  3: "Confluence",
};

export function DifficultySelector({
  level,
  onSelect,
  onCancel,
}: DifficultySelectorProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <Card className="max-w-sm w-full p-6 space-y-5 animate-bounce-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Level {level}</p>
            <h2 className="text-xl font-bold text-slate-100">
              {LEVEL_TITLES[level]}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Difficulty options */}
        <div className="space-y-3">
          <p className="text-sm text-slate-400">Pick your difficulty:</p>
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={cn(
                "w-full text-left p-4 rounded-xl border border-slate-800",
                "bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer",
                "min-h-[48px]"
              )}
            >
              <span className={cn("font-semibold", d.color)}>{d.label}</span>
              <p className="text-xs text-slate-400 mt-1">{d.description}</p>
            </button>
          ))}
        </div>

        {/* Cancel */}
        <Button
          variant="ghost"
          size="lg"
          onClick={onCancel}
          className="w-full"
        >
          Go back
        </Button>
      </Card>
    </div>
  );
}
