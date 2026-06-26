import type { CustomDayGrund, DayGrund, DayGrundDisplay } from "./types";
import { DAY_GRUND_CONFIG } from "./types";

const CUSTOM_PALETTE: { bg: string; color: string }[] = [
  { bg: "rgba(224,231,255,0.55)", color: "#4338CA" },
  { bg: "rgba(254,243,199,0.55)", color: "#B45309" },
  { bg: "rgba(204,251,241,0.55)", color: "#0F766E" },
  { bg: "rgba(252,231,243,0.55)", color: "#BE185D" },
  { bg: "rgba(233,213,255,0.55)", color: "#7E22CE" },
];

export function isBuiltinGrund(grundId: string): grundId is DayGrund {
  return grundId in DAY_GRUND_CONFIG;
}

export function resolveGrundConfig(
  grundId: string,
  customGrunds: CustomDayGrund[]
): DayGrundDisplay | null {
  if (isBuiltinGrund(grundId)) return DAY_GRUND_CONFIG[grundId];
  const custom = customGrunds.find((c) => c.id === grundId);
  if (!custom) return null;
  return {
    label: custom.label,
    emoji: custom.emoji,
    defaultHours: custom.defaultHours,
    bg: custom.bg,
    color: custom.color,
  };
}

export function defaultHoursForGrund(
  grundId: string,
  customGrunds: CustomDayGrund[],
  grundDefaults: Record<string, number>
): number {
  if (grundDefaults[grundId] != null) return grundDefaults[grundId];
  const cfg = resolveGrundConfig(grundId, customGrunds);
  return cfg?.defaultHours ?? 4;
}

export function paletteForIndex(index: number) {
  return CUSTOM_PALETTE[index % CUSTOM_PALETTE.length];
}

export function createCustomGrundId() {
  return `custom-${Date.now().toString(36)}`;
}
