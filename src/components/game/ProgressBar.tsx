import { cn } from "@/lib/utils/cn";

interface ProgressBarProps {
  current: number;
  total: number;
  results?: boolean[];
}

export function ProgressBar({ current, total, results = [] }: ProgressBarProps) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const isDone = i < results.length;
        const isCurrent = i === current - 1;
        const isCorrect = isDone && results[i];
        const isWrong = isDone && !results[i];

        return (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all",
              isCurrent && "bg-sky-400",
              isCorrect && "bg-emerald-400",
              isWrong && "bg-rose-400",
              !isDone && !isCurrent && "bg-slate-800"
            )}
          />
        );
      })}
    </div>
  );
}
