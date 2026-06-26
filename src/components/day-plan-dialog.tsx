
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { DAY_GRUND_CONFIG, DAY_GRUND_ORDER, type DayGrund } from "@/lib/types";
import { useDayStore } from "@/lib/day-store";
import { cn, formatDayPlanHoursLabel } from "@/lib/utils";

const HOUR_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 8] as const;

interface DayPlanDialogProps {
  date: Date;
  onClose: () => void;
}

export function DayPlanDialog({ date, onClose }: DayPlanDialogProps) {
  const dateStr = format(date, "yyyy-MM-dd");
  const {
    dayPlans,
    setDayPlan,
    removeDayPlan,
    getGrundDefault,
    setGrundDefault,
  } = useDayStore();

  const saved = dayPlans[dateStr];
  const [grund, setGrund] = useState<DayGrund | null>(saved?.grund ?? null);
  const [hours, setHours] = useState(saved?.hours ?? 0);
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const persist = (nextGrund: DayGrund, nextHours: number, updateDefault: boolean) => {
    setDayPlan(dateStr, { grund: nextGrund, hours: nextHours });
    if (updateDefault) setGrundDefault(nextGrund, nextHours);
    onClose();
  };

  const selectGrund = (g: DayGrund) => {
    if (saved?.grund === g) return;
    const defaultHours = getGrundDefault(g);
    persist(g, defaultHours, false);
  };

  const hoursDirty = saved != null && grund != null && hours !== saved.hours;
  const showHoursSection = saved != null && grund != null;

  const saveHours = () => {
    if (!grund) return;
    persist(grund, hours, saveAsDefault);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-border w-full max-w-[420px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Tagesplanung</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(date, "eeee, d. MMMM yyyy", { locale: de })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {DAY_GRUND_ORDER.map((g) => {
              const cfg = DAY_GRUND_CONFIG[g];
              const active = grund === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    if (!saved) selectGrund(g);
                    else if (saved.grund !== g) selectGrund(g);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-3 transition-all",
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-transparent bg-slate-50 hover:bg-slate-100 hover:border-border"
                  )}
                >
                  <span className="text-2xl leading-none">{cfg.emoji}</span>
                  <span className="text-[11px] font-medium text-foreground text-center leading-tight">
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>

          {showHoursSection && (
            <>
              <div className="text-center py-2">
                <p className="text-2xl font-bold text-foreground tracking-tight">
                  {formatDayPlanHoursLabel(hours)}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-1.5">
                {HOUR_OPTIONS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHours(h)}
                    className={cn(
                      "min-w-[2.5rem] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                      hours === h
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-foreground hover:bg-slate-200"
                    )}
                  >
                    {h}h
                  </button>
                ))}
              </div>

              <div className="px-1">
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={1}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>0h</span>
                  <span>8h</span>
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer px-1">
                <input
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                  className="mt-0.5 rounded border-border"
                />
                <span className="text-xs text-muted-foreground leading-snug">
                  Diese Stunden künftig als Standard für{" "}
                  <span className="font-medium text-foreground">
                    {grund ? DAY_GRUND_CONFIG[grund].label : "diesen Grund"}
                  </span>{" "}
                  verwenden
                </span>
              </label>

              {hoursDirty && (
                <button
                  type="button"
                  onClick={saveHours}
                  className="w-full py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  Speichern
                </button>
              )}
            </>
          )}

          {saved && (
            <button
              type="button"
              onClick={() => { removeDayPlan(dateStr); onClose(); }}
              className="w-full py-2 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-muted/40 transition-all"
            >
              Plan entfernen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
