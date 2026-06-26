
import { X, Plus, Trash2 } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { resolveGrundConfig } from "@/lib/day-grund";
import { useDayStore } from "@/lib/day-store";
import { useLernblockStore } from "@/lib/lernblock-store";
import { getFachColors, formatDuration, formatDayPlanLabel } from "@/lib/utils";
import { FachChip } from "./fach-chip";
import type { LernSession, Todo, Klausur } from "@/lib/types";

interface DayDetailPanelProps {
  date: Date;
  sessions: LernSession[];
  todos: Todo[];
  klausuren: Klausur[];
  onClose: () => void;
  onNewLernblock: (date: Date) => void;
  onSessionClick: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  onOpenDayPlan?: () => void;
}

export function DayDetailPanel({
  date,
  sessions,
  todos,
  klausuren,
  onClose,
  onNewLernblock,
  onSessionClick,
  onDeleteSession,
  onOpenDayPlan,
}: DayDetailPanelProps) {
  const dateStr = format(date, "yyyy-MM-dd");
  const { dayPlans, customGrunds } = useDayStore();
  const { dayNotes, setDayNote } = useLernblockStore();

  const dayPlan = dayPlans[dateStr];
  const planCfg = dayPlan ? resolveGrundConfig(dayPlan.grund, customGrunds) : null;
  const note = dayNotes[dateStr] ?? "";

  // Sessions for this day
  const daySessions = sessions.filter((s) => s.date && isSameDay(parseISO(s.date), date));
  const dayTodos = todos.filter((t) => !t.completed && t.date && isSameDay(parseISO(t.date), date));
  const dayKlausuren = klausuren.filter((k) => k.schreibDatum && isSameDay(parseISO(k.schreibDatum), date));

  const geplantH = daySessions.reduce((acc, s) => acc + s.duration, 0);
  const erledigtH = daySessions.filter((s) => s.completed).reduce((acc, s) => acc + s.duration, 0);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white border-l border-border shadow-panel overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div>
          <p className="text-sm font-semibold text-foreground">{format(date, "d. MMMM", { locale: de })}</p>
          <p className="text-[10px] text-muted-foreground">{format(date, "EEEE yyyy", { locale: de })}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onNewLernblock(date)}
            className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Lernblock
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors ml-1">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Tagesplan */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Tagesplan
          </p>
          <button
            type="button"
            onClick={onOpenDayPlan}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl w-full text-left border border-border hover:bg-muted/40 transition-colors"
            style={planCfg ? { background: planCfg.bg, borderColor: "transparent" } : {}}
          >
            <span className="text-base">{planCfg ? planCfg.emoji : "📅"}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate" style={planCfg ? { color: planCfg.color } : { color: "#94a3b8" }}>
                {dayPlan && planCfg
                  ? formatDayPlanLabel(dayPlan.grund, dayPlan.hours, customGrunds)
                  : "Tag planen"}
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">ändern</span>
          </button>
        </div>

        {/* Lernstunden-Zusammenfassung */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Lernstunden
          </p>
          <div className="flex gap-3">
            <div className="flex-1 bg-slate-50 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Geplant</p>
              <p className="text-sm font-semibold text-foreground">{formatDuration(geplantH)}</p>
            </div>
            <div className="flex-1 bg-slate-50 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Erledigt</p>
              <p className="text-sm font-semibold text-green-600">{formatDuration(erledigtH)}</p>
            </div>
          </div>
        </div>

        {/* Examensklausuren */}
        {dayKlausuren.length > 0 && (
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              ⚖️ Examensklausur
            </p>
            {dayKlausuren.map((k) => (
              <div key={k.id} className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-xl">
                <span className="text-xs font-semibold text-yellow-800">{k.title}</span>
                <span className="text-[10px] text-yellow-600 ml-auto">{k.ort}</span>
              </div>
            ))}
          </div>
        )}

        {/* Lernblöcke */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Lernblöcke ({daySessions.length})
          </p>
          {daySessions.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Keine Lernblöcke geplant.</p>
          ) : (
            <div className="space-y-1.5">
              {daySessions.map((s) => {
                const colors = getFachColors(s.subject);
                const timeStr = s.date ? format(parseISO(s.date), "HH:mm", { locale: de }) : "";
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-1.5 rounded-xl overflow-hidden"
                    style={{ background: colors.bg }}
                  >
                    <button
                      type="button"
                      onClick={() => { onSessionClick(s.id); onClose(); }}
                      className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 text-left hover:opacity-90 transition-opacity"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate" style={{ color: colors.text }}>
                          {s.title}
                        </p>
                        <p className="text-[10px]" style={{ color: colors.text, opacity: 0.7 }}>
                          {timeStr && `${timeStr} · `}{formatDuration(s.duration)}
                        </p>
                      </div>
                      <FachChip fach={s.subject} />
                    </button>
                    {onDeleteSession && (
                      <button
                        type="button"
                        aria-label="Lernblock löschen"
                        onClick={() => onDeleteSession(s.id)}
                        className="shrink-0 mr-2 p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* To-Dos */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            To-Dos ({dayTodos.length})
          </p>
          {dayTodos.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Keine offenen To-Dos.</p>
          ) : (
            <div className="space-y-1">
              {dayTodos.map((t) => (
                <div key={t.id} className="flex items-center gap-2 px-1 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-[11px] text-foreground truncate">{t.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tages-Notiz */}
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Notizen
          </p>
          <textarea
            value={note}
            onChange={(e) => setDayNote(dateStr, e.target.value)}
            placeholder="Gedanken, Beobachtungen, Pläne für diesen Tag…"
            rows={4}
            className="w-full text-[11px] px-2.5 py-2 rounded-xl border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all resize-none"
          />
        </div>
      </div>
    </div>
  );
}
