import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  color?: string;
}

export function Progress({ value, max = 100, color = "bg-primary", className, ...props }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("w-full bg-muted rounded-full overflow-hidden", className)} {...props}>
      <div
        className={cn("h-full rounded-full transition-all duration-300", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
