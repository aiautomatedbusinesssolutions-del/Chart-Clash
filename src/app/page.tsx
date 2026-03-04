"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Loader2 } from "lucide-react";
import { LevelCard } from "@/components/game/LevelCard";
import { DifficultySelector } from "@/components/game/DifficultySelector";
import { useGameStore } from "@/lib/store/game-store";
import type { Difficulty, LevelNumber } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const { levelStatuses, levelResults, startLevel, loading } = useGameStore();
  const [selectedLevel, setSelectedLevel] = useState<LevelNumber | null>(null);

  const handleLevelSelect = (level: LevelNumber) => {
    setSelectedLevel(level);
  };

  const handleDifficultySelect = async (difficulty: Difficulty) => {
    if (selectedLevel) {
      setSelectedLevel(null);
      await startLevel(selectedLevel, difficulty);
      router.push("/play");
    }
  };

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500/10 mb-2">
            <BarChart3 className="w-7 h-7 text-sky-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">Chart Clash</h1>
          <p className="text-slate-400 text-sm">
            Simple Lessons for Serious Stock Market Skills
          </p>
        </div>

        {/* Level cards */}
        <div className="space-y-3">
          {([1, 2, 3] as LevelNumber[]).map((level) => (
            <LevelCard
              key={level}
              level={level}
              status={levelStatuses[level]}
              stars={levelResults[level]?.stars}
              onSelect={handleLevelSelect}
            />
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-slate-600 text-center px-4">
          For educational purposes only. Past patterns do not guarantee future
          results. This is not financial advice.
        </p>
      </div>

      {/* Difficulty selector modal */}
      {selectedLevel && (
        <DifficultySelector
          level={selectedLevel}
          onSelect={handleDifficultySelect}
          onCancel={() => setSelectedLevel(null)}
        />
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
            <p className="text-sm text-slate-400">Loading charts...</p>
          </div>
        </div>
      )}
    </main>
  );
}
