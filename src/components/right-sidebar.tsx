
import { useState } from "react";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import { cn, daysUntil, countdownLabel, formatDuration, getFachColors, formatDayPlanLabel } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { PremiumSlider } from "@/components/premium-slider";
import { useDayStore } from "@/lib/day-store";
import { useExamenStore } from "@/lib/examen-store";
import { StaatsexamenStats } from "@/components/staatsexamen-stats";
import { loadPomoLog } from "@/lib/timer-state";
import { getISOWeek, getYear } from "date-fns";
import type { Klausur, Todo, LernSession, PomodoroSession, Fach } from "@/lib/types";
import { DAY_GRUND_CONFIG } from "@/lib/types";
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, isToday } from "date-fns";
import { de } from "date-fns/locale";

interface RightSidebarProps {
  klausuren: Klausur[];
  todos: Todo[];
  sessions: LernSession[];
  pomodoros: PomodoroSession[];
  onTodoComplete: (id: string, completed: boolean) => void;
}

export function RightSidebar({ klausuren, todos, sessions, pomodoros, onTodoComplete }: RightSidebarProps) {
  return (
    <aside className="w-full flex flex-col border-l border-border bg-white overflow-y-auto">
      <div className="p-3 space-y-2">
        <StaatsexamenWidget klausuren={klausuren} sessions={sessions} />
        <HeuteWidget sessions={sessions} todos={todos} />
        <LernfortschrittWidget sessions={sessions} pomodoros={pomodoros} />
        <TodoWidget todos={todos} onComplete={onTodoComplete} />
      </div>
    </aside>
  );
}

// ─── Staatsexamen Widget ─────────────────────────────────────────────
function StaatsexamenWidget({ klausuren }: { klausuren: Klausur[]; sessions: LernSession[] }) {
  const [open, setOpen] = useState(true);
  const { examDate } = useExamenStore();

  const firstKlausur = klausuren
    .filter((k) => k.schreibDatum && (daysUntil(k.schreibDatum) ?? -1) >= 0)
    .sort((a, b) => new Date(a.schreibDatum!).getTime() - new Date(b.schreibDatum!).getTime())[0];

  const klausurenList = klausuren
    .filter((k) => k.schreibDatum && (daysUntil(k.schreibDatum) ?? -1) >= -30)
    .sort((a, b) => new Date(a.schreibDatum!).getTime() - new Date(b.schreibDatum!).getTime())
    .slice(0, 6);

  const showStoredExam = Boolean(examDate);
  const showNotionList = !showStoredExam && klausurenList.length > 0;

  return (
    <WidgetCard title="Staatsexamen" open={open} onToggle={() => setOpen(!open)}>
      <div className="space-y-3">
        {showStoredExam && examDate ? (
          <StaatsexamenStats examDate={examDate} subtitle="Dein Prüfungstermin" />
        ) : firstKlausur?.schreibDatum ? (
          <StaatsexamenStats
            examDate={firstKlausur.schreibDatum}
            title={firstKlausur.title}
            subtitle="Nächste Examensklausur"
          />
        ) : (
          <p className="text-xs text-muted-foreground py-1">Kein Prüfungstermin gesetzt</p>
        )}

        {showNotionList && (
          <div className="space-y-1 pt-1 border-t border-border">
            {klausurenList.map((k) => {
              const days = daysUntil(k.schreibDatum);
              const cd = countdownLabel(days);
              const colors = getFachColors(k.fach);
              return (
                <div key={k.id} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colors.text }} />
                  <p className="text-[10px] text-foreground flex-1 truncate">{k.title}</p>
                  <span className={cn("text-[10px] font-semibold shrink-0", cd.color)}>{cd.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WidgetCard>
  );
}

// ─── Heute Widget ─────────────────────────────────────────────────────
function HeuteWidget({ sessions, todos }: { sessions: LernSession[]; todos: Todo[] }) {
  const [open, setOpen] = useState(true);
  const { dayPlans } = useDayStore();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayPlan = dayPlans[todayStr];
  const todayPlanCfg = todayPlan ? DAY_GRUND_CONFIG[todayPlan.grund] : null;

  const todaySessions = sessions.filter((s) => {
    if (!s.date) return false;
    try { return s.date.startsWith(todayStr); }
    catch { return false; }
  });

  const todayTodos = todos.filter((t) => {
    if (!t.date || t.completed) return false;
    return t.date.startsWith(todayStr);
  });

  const totalH = todaySessions.reduce((acc, s) => acc + (s.duration ?? 0), 0);
  const doneH = todaySessions.filter((s) => s.completed).reduce((acc, s) => acc + (s.duration ?? 0), 0);

  return (
    <WidgetCard title="Heute" open={open} onToggle={() => setOpen(!open)}>
      <div className="space-y-2">
        {/* Day type badge */}
        {todayPlan && todayPlanCfg && (
          <div
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium"
            style={{ background: todayPlanCfg.bg, color: todayPlanCfg.color }}
          >
            <span>{formatDayPlanLabel(todayPlan.grund, todayPlan.hours)}</span>
          </div>
        )}

        {/* Hours summary */}
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg bg-slate-50 border border-border px-2 py-1.5 text-center">
            <p className="text-[10px] text-muted-foreground">Geplant</p>
            <p className="text-sm font-bold text-foreground">{formatDuration(totalH)}</p>
          </div>
          <div className="flex-1 rounded-lg bg-slate-50 border border-border px-2 py-1.5 text-center">
            <p className="text-[10px] text-muted-foreground">Erledigt</p>
            <p className="text-sm font-bold text-green-600">{formatDuration(doneH)}</p>
          </div>
        </div>

        {/* Today's sessions */}
        {todaySessions.length > 0 && (
          <div className="space-y-1">
            {todaySessions.slice(0, 4).map((s) => {
              const colors = getFachColors(s.subject);
              return (
                <div key={s.id} className="flex items-center gap-2 rounded-md px-2 py-1" style={{ background: colors.bg }}>
                  <div className="w-1 h-full rounded-full shrink-0" style={{ background: colors.text }} />
                  <p className="text-[10px] font-medium flex-1 truncate" style={{ color: colors.text }}>{s.title}</p>
                  <span className="text-[9px] shrink-0" style={{ color: colors.text, opacity: 0.7 }}>{formatDuration(s.duration)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Today's todos */}
        {todayTodos.length > 0 && (
          <div className="space-y-0.5 pt-1 border-t border-border">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">To-Dos heute</p>
            {todayTodos.map((t) => (
              <div key={t.id} className="flex items-center gap-1.5 py-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <p className="text-[10px] text-foreground">{t.name}</p>
              </div>
            ))}
          </div>
        )}

        {todaySessions.length === 0 && todayTodos.length === 0 && !todayPlanCfg && (
          <p className="text-[11px] text-muted-foreground">Nichts geplant für heute</p>
        )}
      </div>
    </WidgetCard>
  );
}

// ─── Lernfortschritt Widget ─────────────────────────────────────────
const FACH_LIST: Fach[] = ["ZPO", "ZivR", "StrafR", "VwR", "StPO", "VwGO", "ZPO III"];
const MAX_SLIDER_H = 40;

function LernfortschrittWidget({ sessions, pomodoros }: { sessions: LernSession[]; pomodoros: PomodoroSession[] }) {
  const [open, setOpen] = useState(true);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const weekSessions = sessions.filter((s) => {
    if (!s.date) return false;
    try { return isWithinInterval(parseISO(s.date), { start: weekStart, end: weekEnd }); }
    catch { return false; }
  });

  const autoGeplant = weekSessions.reduce((acc, s) => acc + (s.duration ?? 0), 0);
  const weekPomodoros = pomodoros.filter((p) => {
    try { return isWithinInterval(parseISO(p.start), { start: weekStart, end: weekEnd }); }
    catch { return false; }
  });
  // Notion-Pomodoros + lokale PomoLog-Einträge dieser KW
  const notionMinutes = weekPomodoros.reduce((acc, p) => acc + p.dauerMin, 0);
  const thisWeek = `${getYear(weekStart)}-W${String(getISOWeek(weekStart)).padStart(2, "0")}`;
  const localMinutes = loadPomoLog()
    .filter((e) => {
      const d = e.end.slice(0, 10);
      return `${getYear(new Date(d))}-W${String(getISOWeek(new Date(d))).padStart(2, "0")}` === thisWeek;
    })
    .reduce((acc, e) => acc + e.durationMin, 0);
  const autoAbsolviert = (notionMinutes + localMinutes) / 60;

  const [manualGeplant, setManualGeplant] = useState<number | null>(null);
  const [manualAbsolviert, setManualAbsolviert] = useState<number | null>(null);

  const geplant = manualGeplant ?? autoGeplant;
  const absolviert = manualAbsolviert ?? autoAbsolviert;
  const pct = geplant > 0 ? Math.min(100, Math.round((absolviert / geplant) * 100)) : 0;

  const fachStunden = FACH_LIST.map((fach) => ({
    fach,
    h: weekSessions.filter((s) => s.subject === fach).reduce((acc, s) => acc + (s.duration ?? 0), 0),
  })).filter((f) => f.h > 0);

  return (
    <WidgetCard title="Lernfortschritt KW" open={open} onToggle={() => setOpen(!open)}>
      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <div>
            <p className="text-[10px] text-muted-foreground">Absolviert</p>
            <p className="text-lg font-bold text-foreground">{formatDuration(absolviert)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Lernziel</p>
            <p className="text-sm font-semibold text-foreground">{formatDuration(geplant)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Fortschritt</p>
            <p className={cn("text-sm font-bold", pct >= 100 ? "text-green-600" : pct >= 60 ? "text-primary" : "text-amber-500")}>
              {pct}%
            </p>
          </div>
        </div>

        <Progress value={absolviert} max={Math.max(geplant, 0.1)} className="h-2" color="bg-primary" />

        <div className="space-y-4 pt-2 border-t border-border">
          <PremiumSlider
            label="Lernziel"
            value={geplant}
            max={MAX_SLIDER_H}
            color="#6346dc"
            onChange={(v) => setManualGeplant(v)}
            onReset={manualGeplant !== null ? () => setManualGeplant(null) : undefined}
          />
          <PremiumSlider
            label="Absolviert"
            value={absolviert}
            max={MAX_SLIDER_H}
            color="#10b981"
            onChange={(v) => setManualAbsolviert(v)}
            onReset={manualAbsolviert !== null ? () => setManualAbsolviert(null) : undefined}
          />
        </div>

        {fachStunden.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-border">
            {fachStunden.map(({ fach, h }) => {
              const colors = getFachColors(fach);
              return (
                <div key={fach} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colors.text }} />
                  <span className="text-[10px] text-muted-foreground flex-1">{fach}</span>
                  <span className="text-[10px] font-medium text-foreground">{formatDuration(h)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WidgetCard>
  );
}


// ─── Todo Widget ─────────────────────────────────────────────────────
function TodoWidget({ todos, onComplete }: { todos: Todo[]; onComplete: (id: string, completed: boolean) => void }) {
  const [open, setOpen] = useState(true);

  const openTodos = todos
    .filter((t) => !t.completed)
    .sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : Infinity;
      const db = b.date ? new Date(b.date).getTime() : Infinity;
      return da - db;
    })
    .slice(0, 8);

  return (
    <WidgetCard title={`Offene To-Dos (${openTodos.length})`} open={open} onToggle={() => setOpen(!open)}>
      <div className="space-y-1">
        {openTodos.map((todo) => {
          const days = daysUntil(todo.date);
          const isOverdue = days !== null && days < 0;
          const isTodayItem = days === 0;

          return (
            <div key={todo.id} className="flex items-start gap-2 group py-1 px-1 rounded-md hover:bg-muted/40 transition-colors">
              <button
                type="button"
                aria-label="Als erledigt markieren"
                onClick={() => onComplete(todo.id, true)}
                className="mt-0.5 w-4 h-4 rounded border-2 border-slate-400 bg-white flex items-center justify-center shrink-0 hover:border-primary hover:bg-primary/10 transition-colors"
              >
                <Check className="h-2.5 w-2.5 opacity-0 group-hover:opacity-50 text-primary" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-tight">{todo.name}</p>
                {todo.date && (
                  <p className={cn("text-[10px] mt-0.5",
                    isOverdue && "text-red-500 font-medium",
                    isTodayItem && "text-primary font-medium",
                    !isOverdue && !isTodayItem && "text-muted-foreground"
                  )}>
                    {isOverdue ? `${Math.abs(days!)}d überfällig`
                      : isTodayItem ? "Heute"
                      : format(parseISO(todo.date), "dd. MMM", { locale: de })}
                  </p>
                )}
              </div>
              {todo.kategorie && (
                <span className="text-[9px] bg-muted text-muted-foreground rounded px-1 py-0.5 shrink-0">
                  {todo.kategorie}
                </span>
              )}
            </div>
          );
        })}
        {openTodos.length === 0 && (
          <p className="text-xs text-muted-foreground py-1">Alle To-Dos erledigt ✓</p>
        )}
      </div>
    </WidgetCard>
  );
}

// ─── Widget Card Shell ──────────────────────────────────────────────
function WidgetCard({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-widget overflow-hidden">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2.5 hover:bg-muted/40 transition-colors"
      >
        <span className="text-xs font-semibold text-foreground">{title}</span>
        {open
          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
