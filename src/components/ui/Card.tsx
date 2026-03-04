import { cn } from "@/lib/utils/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-slate-900 border border-slate-800 rounded-xl p-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
