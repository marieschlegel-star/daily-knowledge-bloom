
import { useEffect, useRef, useState } from "react";
import { Draggable } from "@fullcalendar/interaction";
import { useAppStore } from "@/lib/store";
import { useGCalConnection } from "@/lib/use-gcal";
import { useGCalStore } from "@/lib/gcal-store";
import { getFachColors, cn } from "@/lib/utils";
import type { Fach, TodoKategorie, LernSession, Todo } from "@/lib/types";
import { GripVertical, ChevronDown, ChevronRight } from "lucide-react";

const GCAL_COLOR_PRESETS = [
  "#4285F4", "#EA4335", "#FBBC05", "#34A853",
  "#FF6D00", "#AA00FF", "#00BCD4", "#E91E63",
  "#795548", "#607D8B", "#2E7D32", "#1565C0",
];

const ALL_FAECHER: Fach[] = ["ZPO", "ZivR", "ZPO III", "StrafR", "StPO", "VwR", "VwGO"];
const ALL_KATEGORIEN: TodoKategorie[] = ["Lernen", "KK", "AssK", "AG"];

const KATEGORIE_COLORS: Record<TodoKategorie, { bg: string; text: string }> = {
  Lernen: { bg: "#F3EFFE", text: "#6D28D9" },
  KK:     { bg: "#FEF8E8", text: "#A16207" },
  AssK:   { bg: "#E8F8F0", text: "#047857" },
  AG:     { bg: "#EEF4FD", text: "#2563EB" },
};

function hoursToFCDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

interface LeftSidebarProps {
  sessions: LernSession[];
  todos: Todo[];
}

export function LeftSidebar({ sessions, todos }: LeftSidebarProps) {
  const {
    visibility,
    toggleLernplan,
    toggleKlausuren,
    toggleTodos,
    filters,
    toggleFach,
    toggleTodoKategorie,
    toggleGCal,
  } = useAppStore();

  const { connected, connecting, calendars, connect, disconnect } = useGCalConnection();
  const { customColors, setCalendarColor } = useGCalStore();
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);

  const chipsRef = useRef<HTMLDivElement>(null);

  const [showFilter, setShowFilter] = useState(false);
  const [showSessions, setShowSessions] = useState(true);
  const [showTodos, setShowTodos] = useState(false);

  useEffect(() => {
    const el = chipsRef.current;
    if (!el) return;
    const draggable = new Draggable(el, {
      itemSelector: ".fc-draggable-chip",
    });
    return () => draggable.destroy();
  }, []);

  const activeFaecher = filters.faecher;
  const activeKategorien = filters.todoKategorien;

  const sortByTitle = (a: LernSession, b: LernSession) => {
    const num = (s: string) => parseFloat(s.match(/^[\d.]+/)?.[0] ?? "9999");
    const diff = num(a.title) - num(b.title);
    return diff !== 0 ? diff : a.title.localeCompare(b.title, "de");
  };

  const openSessions = sessions.filter((s) => !s.completed).sort(sortByTitle);
  const filteredSessions = activeFaecher.length === 0
    ? openSessions
    : openSessions.filter((s) => activeFaecher.includes(s.subject));

  const filteredTodos = activeKategorien.length === 0
    ? todos.filter((t) => !t.completed)
    : todos.filter((t) => !t.completed && t.kategorie != null && activeKategorien.includes(t.kategorie));

  return (
    <aside className="w-[220px] flex flex-col border border-border rounded-xl bg-muted/30 overflow-hidden shrink-0">

      {/* ── App header ─────────────────────────────────────────────── */}
      <div className="px-3 py-3 border-b border-border/80 shrink-0">
        <div className="flex items-center gap-2.5 rounded-lg bg-card px-2.5 py-2 shadow-card">
          <span className="text-base">⚖️</span>
          <div>
            <p className="text-label font-bold text-foreground leading-none">Juris</p>
            <p className="text-meta leading-none mt-0.5">Examensvorbereitung</p>
          </div>
        </div>
      </div>

      {/* ── Scrollable content ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto" ref={chipsRef}>

        {/* ── KALENDER ──────────────────────────────────────────────── */}
        <div className="px-2 pt-2 pb-1">
          <button
            className="w-full flex items-center justify-between px-1 py-1 text-meta font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            onClick={() => setShowFilter((v) => !v)}
          >
            <span>Kalender</span>
            {showFilter ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
          </button>

          {showFilter && (
            <div className="space-y-2 mt-1">
              {/* Visibility toggles */}
              <div className="space-y-0.5">
                <CalToggle label="Lernplan"  color="#534AB7" active={visibility.lernplan}  onClick={toggleLernplan} />
                <CalToggle label="Klausuren" color="#A32D2D" active={visibility.klausuren} onClick={toggleKlausuren} />
                <CalToggle label="To-Dos"    color="#BA7517" active={visibility.todos}     onClick={toggleTodos} />
              </div>

              <div className="border-t border-border" />

              {/* Google */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-0.5 px-1">
                  <div className="flex items-center gap-1">
                    <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <p className="text-meta font-semibold text-muted-foreground uppercase tracking-wider">Google</p>
                  </div>
                  {connected ? (
                    <button
                      type="button"
                      onClick={() => void disconnect()}
                      className="text-meta text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Trennen
                    </button>
                  ) : null}
                </div>
                {connected ? (
                  calendars.length > 0 ? (
                    calendars.map((cal) => {
                      const color = customColors[cal.id] ?? cal.color;
                      return (
                        <div key={cal.id} className="relative">
                          <div className="flex items-center gap-1">
                            <div className="flex-1">
                              <CalToggle
                                label={cal.name}
                                color={color}
                                active={visibility.gcal[cal.id] !== false}
                                onClick={() => toggleGCal(cal.id)}
                              />
                            </div>
                            <button
                              type="button"
                              title="Farbe ändern"
                              onClick={() => setColorPickerOpen(colorPickerOpen === cal.id ? null : cal.id)}
                              className="shrink-0 w-3.5 h-3.5 rounded-full border border-white/50 shadow-sm hover:scale-110 transition-transform"
                              style={{ background: color }}
                            />
                          </div>
                          {colorPickerOpen === cal.id && (
                            <div className="mt-1 p-1.5 bg-card border border-border rounded-lg shadow-md grid grid-cols-6 gap-1">
                              {GCAL_COLOR_PRESETS.map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  title={preset}
                                  onClick={() => { setCalendarColor(cal.id, preset); setColorPickerOpen(null); }}
                                  className="w-5 h-5 rounded-full hover:scale-110 transition-transform border-2"
                                  style={{
                                    background: preset,
                                    borderColor: color === preset ? "var(--foreground)" : "transparent",
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-label text-muted-foreground px-1 py-0.5">Kalender werden geladen…</p>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => void connect()}
                    disabled={connecting}
                    className="w-full text-left px-1 py-1 text-label text-primary hover:underline disabled:opacity-50"
                  >
                    {connecting ? "Verbinde…" : "Mit Google verbinden"}
                  </button>
                )}
              </div>

            </div>
          )}
        </div>

        {/* ── LERNEINHEITEN ─────────────────────────────────────────── */}
        <div className="border-t border-border mx-2 my-1" />
        <div className="px-2 pb-0">
          <button
            className="w-full flex items-center justify-between px-1 py-1 text-meta font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            onClick={() => setShowSessions((v) => !v)}
          >
            <span>Lerneinheiten ({openSessions.length})</span>
            {showSessions ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
          </button>
        </div>
        {showSessions && (
          <div className="px-2 pb-2">
            <div className="flex flex-wrap gap-1 mb-2">
              {ALL_FAECHER.map((f) => {
                const active = activeFaecher.includes(f);
                const colors = getFachColors(f);
                return (
                  <button
                    key={f}
                    onClick={() => toggleFach(f)}
                    className="rounded-full px-1.5 py-0.5 text-label font-medium transition-opacity"
                    style={{ background: active ? colors.bg : "var(--muted)", color: active ? colors.text : "var(--muted-foreground)" }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
            <div className="space-y-0.5">
              {filteredSessions.map((s) => (
                <SessionChip key={s.id} session={s} />
              ))}
              {filteredSessions.length === 0 && (
                <p className="text-label text-muted-foreground px-1 py-1">Keine offenen Einheiten</p>
              )}
            </div>
          </div>
        )}

        {/* ── TO-DOS ────────────────────────────────────────────────── */}
        <div className="border-t border-border mx-2 my-1" />
        <div className="px-2 pb-0">
          <button
            className="w-full flex items-center justify-between px-1 py-1 text-meta font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            onClick={() => setShowTodos((v) => !v)}
          >
            <span>To-Dos ({filteredTodos.length})</span>
            {showTodos ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
          </button>
        </div>
        {showTodos && (
          <div className="px-2 pb-4">
            <div className="flex flex-wrap gap-1 mb-2">
              {ALL_KATEGORIEN.map((k) => {
                const active = activeKategorien.includes(k);
                const colors = KATEGORIE_COLORS[k];
                return (
                  <button
                    key={k}
                    onClick={() => toggleTodoKategorie(k)}
                    className="rounded-full px-1.5 py-0.5 text-label font-medium transition-opacity"
                    style={{ background: active ? colors.bg : "var(--muted)", color: active ? colors.text : "var(--muted-foreground)" }}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
            <div className="space-y-0.5">
              {filteredTodos.map((t) => (
                <TodoChip key={t.id} todo={t} />
              ))}
              {filteredTodos.length === 0 && (
                <p className="text-label text-muted-foreground px-1 py-1">Keine offenen To-Dos</p>
              )}
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}

// ─── Calendar Toggle ────────────────────────────────────────────────
function CalToggle({ label, color, active, onClick }: {
  label: string; color: string; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 w-full text-left px-1 py-0.5">
      <span className="flex-shrink-0 w-2.5 h-2.5 rounded-sm transition-opacity"
        style={{ background: color, opacity: active ? 1 : 0.3 }} />
      <span className={cn("text-[11px] transition-colors", active ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </button>
  );
}

// ─── Session Chip ───────────────────────────────────────────────────
function SessionChip({ session }: { session: LernSession }) {
  const colors = getFachColors(session.subject);
  const { setSelectedSessionId } = useAppStore();

  const eventData = JSON.stringify({
    title: session.title,
    duration: hoursToFCDuration(session.duration),
    backgroundColor: colors.bg,
    borderColor: colors.border,
    textColor: colors.text,
    extendedProps: { type: "session", sessionId: session.id, fach: session.subject },
  });

  return (
    <div
      className="fc-draggable-chip flex items-center gap-1 rounded-md px-1.5 py-1 cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity select-none"
      style={{ background: colors.bg }}
      data-event={eventData}
      onClick={() => setSelectedSessionId(session.id)}
    >
      <GripVertical className="h-2.5 w-2.5 shrink-0" style={{ color: colors.text, opacity: 0.5 }} />
      <span className="text-label font-medium truncate leading-tight" style={{ color: colors.text }}>
        {session.title}
      </span>
    </div>
  );
}

// ─── Todo Chip ──────────────────────────────────────────────────────
function TodoChip({ todo }: { todo: Todo }) {
  const bg   = todo.kategorie ? (KATEGORIE_COLORS[todo.kategorie]?.bg   ?? "#FEF3C7") : "#FEF3C7";
  const text = todo.kategorie ? (KATEGORIE_COLORS[todo.kategorie]?.text ?? "#92400E") : "#92400E";

  const eventData = JSON.stringify({
    title: `· ${todo.name}`,
    duration: "01:00",
    backgroundColor: bg,
    borderColor: bg,
    textColor: text,
    extendedProps: { type: "todo", todoId: todo.id },
  });

  return (
    <div
      className="fc-draggable-chip flex items-center gap-1 rounded-md px-1.5 py-1 cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity select-none"
      style={{ background: bg }}
      data-event={eventData}
    >
      <GripVertical className="h-2.5 w-2.5 shrink-0" style={{ color: text, opacity: 0.5 }} />
      <span className="text-label font-medium truncate leading-tight" style={{ color: text }}>
        {todo.name}
      </span>
    </div>
  );
}
