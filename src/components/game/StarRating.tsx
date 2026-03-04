"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StarRatingProps {
  stars: number;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function StarRating({ stars, size = "md", animated = false }: StarRatingProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map((s) => (
        <Star
          key={s}
          className={cn(
            sizeMap[size],
            "transition-all",
            s <= stars
              ? "fill-amber-400 text-amber-400"
              : "text-slate-700",
            animated && s <= stars && "animate-bounce-in"
          )}
          style={animated && s <= stars ? { animationDelay: `${s * 150}ms` } : undefined}
        />
      ))}
    </div>
  );
}
