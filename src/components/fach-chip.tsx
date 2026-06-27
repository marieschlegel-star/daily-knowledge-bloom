import { cn, getFachColors } from "@/lib/utils";
import type { Fach } from "@/lib/types";

interface FachChipProps {
  fach: Fach | string | null;
  size?: "xs" | "sm";
  className?: string;
}

export function FachChip({ fach, size = "sm", className }: FachChipProps) {
  const colors = getFachColors(fach);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-medium shrink-0 border",
        size === "xs" && "px-1.5 py-0.5 text-meta",
        size === "sm" && "px-2 py-0.5 text-label",
        className
      )}
      style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}
    >
      {fach ?? "–"}
    </span>
  );
}
