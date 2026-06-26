
import { useState } from "react";
import { X, Plus } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { TAGESTYP_CONFIG, type DayTyp } from "@/lib/types";
import { useDayStore } from "@/lib/day-store";
import { useLernblockStore } from "@/lib/lernblock-store";
import { getFachColors, formatDuration } from "@/lib/utils";
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
}

export function DayDetailPanel({
  date,
  sessions,
  todos,
  klausuren,
  onClose,
  onNewLernblock,
  onSessionClick,
}: DayDetailPanelProps) {
  const dateStr = format(date, "yyyy-MM-dd");
  const { dayTypes, setDayType, removeDayType } = useDayStore();
  const { dayNotes, setDayNote } = useLernblockStore();
  const [showTypPicker, setShowTypPicker] = useState(false);

  const dayType = dayTypes[dateStr] as DayTyp | undefined;
  const typCfg = dayType ? TAGESTYP_CONFIG[dayType] : null;
  const note = dayNotes[dateStr] ?? "";

  // Sessions for this day
  const daySessions = sessions.filter((s) => s.date && isSameDay(parseISO(s.date), date));
  const dayTodos = todos.filter((t) => !t.completed && t.date && isSameDay(parseISO(t.date), date));
  const dayKlausuren = klausuren.filter((k) => k.schreibDatum && isSameDay(parseISO(k.schreibDatum), date));

  const geplantH = daySessions.reduce((acc, s) => acc + s.duration, 0);
  const erledigtH = daySessions.filter((s) => s.completed).reduce((acc, s) => acc + s.duration, 0);

  const dateLabel = format(date, "eeee, d. MMMM yyyy", { locale: de });

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
        {/* Tagestyp */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Tagestyp
          </p>
          {showTypPicker ? (
            <div className="space-y-1">
              {(Object.entries(TAGESTYP_CONFIG) as [DayTyp, typeof TAGESTYP_CONFIG[DayTyp]][]).map(([typ, cfg]) => {
                const active = dayType === typ;
                return (
                  <button
                    key={typ}
                    onClick={() => { active ? removeDayType(dateStr) : setDayType(dateStr, typ); setShowTypPicker(false); }}
                    className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                    style={{ background: active ? cfg.bg : undefined }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cfg.emoji}</span>
                      <span className="text-[11px] font-medium text-foreground">{cfg.label}</span>
                      <span className="text-[9px] text-muted-foreground">Faktor {cfg.factor}</span>
                    </div>
                    {active && <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />}
                  </button>
                );
              })}
              <button onClick={() => setShowTypPicker(false)} className="w-full text-[10px] text-muted-foreground py-1 hover:text-foreground transition-colors">
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowTypPicker(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl w-full text-left border border-border hover:bg-muted/40 transition-colors"
              style={typCfg ? { background: typCfg.bg, borderColor: "transparent" } : {}}
            >
              <span className="text-base">{typCfg ? typCfg.emoji : "📅"}</span>
              <div>
                <p className="text-xs font-medium" style={typCfg ? { color: typCfg.color } : { color: "#94a3b8" }}>
                  {typCfg ? typCfg.label : "Kein Tagestyp"}
                </p>
                {typCfg && (
                  <p className="text-[9px]" style={{ color: typCfg.color, opacity: 0.7 }}>
                    Lernfaktor: {typCfg.factor}
                  </p>
                )}
              </div>
              <span className="ml-auto text-[10px] text-muted-foreground">ändern</span>
            </button>
          )}
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
                  <button
                    key={s.id}
                    onClick={() => { onSessionClick(s.id); onClose(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:opacity-90 transition-opacity"
                    style={{ background: colors.bg }}
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
