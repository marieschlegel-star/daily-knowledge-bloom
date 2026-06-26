
import { useEffect, useState } from "react";
import { X, Trash2, Plus, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { DAY_GRUND_CONFIG, DAY_GRUND_ORDER } from "@/lib/types";
import { useDayStore } from "@/lib/day-store";
import { resolveGrundConfig } from "@/lib/day-grund";
import { cn, formatDayPlanHoursLabel, formatDayPlanLabel } from "@/lib/utils";

const HOUR_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 8] as const;
const EMOJI_SUGGESTIONS = ["📌", "🎯", "💡", "📖", "🧠", "⚡", "🎓", "📝", "☕", "🚗"];

interface DayPlanDialogProps {
  date: Date;
  onClose: () => void;
}

export function DayPlanDialog({ date, onClose }: DayPlanDialogProps) {
  const dateStr = format(date, "yyyy-MM-dd");
  const {
    dayPlans,
    customGrunds,
    setDayPlan,
    removeDayPlan,
    getGrundDefault,
    setGrundDefault,
    addCustomGrund,
    removeCustomGrund,
  } = useDayStore();

  const saved = dayPlans[dateStr];
  const [grund, setGrund] = useState<string | null>(saved?.grund ?? null);
  const [hours, setHours] = useState(saved?.hours ?? 0);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newEmoji, setNewEmoji] = useState("📌");
  const [newDefaultHours, setNewDefaultHours] = useState(4);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (manageMode) setManageMode(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, manageMode]);

  const persist = (nextGrund: string, nextHours: number, updateDefault: boolean) => {
    setDayPlan(dateStr, { grund: nextGrund, hours: nextHours });
    if (updateDefault) setGrundDefault(nextGrund, nextHours);
    onClose();
  };

  const selectGrund = (g: string) => {
    if (saved?.grund === g) return;
    persist(g, getGrundDefault(g), false);
  };

  const hoursDirty = saved != null && grund != null && hours !== saved.hours;
  const showHoursSection = saved != null && grund != null;
  const grundCfg = grund ? resolveGrundConfig(grund, customGrunds) : null;

  const saveHours = () => {
    if (!grund) return;
    persist(grund, hours, saveAsDefault);
  };

  const handleAddCustom = () => {
    if (!newLabel.trim()) return;
    addCustomGrund({
      label: newLabel.trim(),
      emoji: newEmoji,
      defaultHours: newDefaultHours,
    });
    setNewLabel("");
    setNewEmoji("📌");
    setNewDefaultHours(4);
  };

  const renderGrundCard = (grundId: string, label: string, emoji: string) => {
    const active = grund === grundId;
    return (
      <button
        key={grundId}
        type="button"
        onClick={() => {
          if (!saved) selectGrund(grundId);
          else if (saved.grund !== grundId) selectGrund(grundId);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-3 transition-all",
          active
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-transparent bg-slate-50 hover:bg-slate-100 hover:border-border"
        )}
      >
        <span className="text-2xl leading-none">{emoji}</span>
        <span className="text-[11px] font-medium text-foreground text-center leading-tight">{label}</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-border w-full max-w-[420px] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {manageMode ? "Eigene Kategorien" : "Tagesplanung"}
            </p>
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

        <div className="px-5 pb-5 space-y-5 overflow-y-auto">
          {manageMode ? (
            <>
              <div className="rounded-xl border border-border bg-slate-50/80 p-3 space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Neue Kategorie
                </p>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Name, z. B. Repetitorium"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="flex flex-wrap gap-1">
                  {EMOJI_SUGGESTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setNewEmoji(e)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-colors",
                        newEmoji === e ? "bg-primary/15 ring-2 ring-primary/30" : "hover:bg-white"
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {HOUR_OPTIONS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setNewDefaultHours(h)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors",
                        newDefaultHours === h
                          ? "bg-primary text-white"
                          : "bg-white text-foreground border border-border hover:bg-slate-100"
                      )}
                    >
                      {h}h Standard
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddCustom}
                  disabled={!newLabel.trim()}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Kategorie hinzufügen
                </button>
              </div>

              {customGrunds.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Noch keine eigenen Kategorien. Lege oben eine an.
                </p>
              ) : (
                <div className="space-y-2">
                  {customGrunds.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-white"
                    >
                      <span className="text-xl">{c.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.label}</p>
                        <p className="text-[10px] text-muted-foreground">{c.defaultHours}h Standard</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCustomGrund(c.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Kategorie löschen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setManageMode(false)}
                className="w-full py-2 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-muted/40 transition-all"
              >
                Zurück zur Tagesplanung
              </button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {DAY_GRUND_ORDER.map((g) => {
                  const cfg = DAY_GRUND_CONFIG[g];
                  return renderGrundCard(g, cfg.label, cfg.emoji);
                })}
              </div>

              {customGrunds.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
                    Eigene Kategorien
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {customGrunds.map((c) => renderGrundCard(c.id, c.label, c.emoji))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setManageMode(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Eigene Kategorien verwalten
              </button>

              {showHoursSection && (
                <>
                  <div className="text-center py-2">
                    <p className="text-2xl font-bold text-foreground tracking-tight">
                      {formatDayPlanHoursLabel(hours)}
                    </p>
                    {grund && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDayPlanLabel(grund, hours, customGrunds)}
                      </p>
                    )}
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
                        {grundCfg?.label ?? "diesen Grund"}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
