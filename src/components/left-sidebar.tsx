"use client";

import { useEffect, useRef, useState } from "react";
import { Draggable } from "@fullcalendar/interaction";
import { useAppStore } from "@/lib/store";
import { useThemenStore } from "@/lib/themen-store";
import { getFachColors, cn } from "@/lib/utils";
import type { Fach, TodoKategorie, LernSession, Todo } from "@/lib/types";
import { GripVertical, ChevronDown, ChevronRight, Plus, X } from "lucide-react";

const ALL_FAECHER: Fach[] = ["ZPO", "ZivR", "ZPO III", "StrafR", "StPO", "VwR", "VwGO"];
const ALL_KATEGORIEN: TodoKategorie[] = ["Lernen", "KK", "AssK", "AG"];

const KATEGORIE_COLORS: Record<TodoKategorie, { bg: string; text: string }> = {
  Lernen: { bg: "#EDE9FE", text: "#5B21B6" },
  KK:     { bg: "#FEF3C7", text: "#92400E" },
  AssK:   { bg: "#D1FAE5", text: "#065F46" },
  AG:     { bg: "#DBEAFE", text: "#1E40AF" },
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
  } = useAppStore();

  const chipsRef = useRef<HTMLDivElement>(null);

  const [showThemen, setShowThemen] = useState(true);
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

  const openSessions = sessions.filter((s) => !s.completed);
  const filteredSessions = activeFaecher.length === 0
    ? []
    : openSessions.filter((s) => activeFaecher.includes(s.subject));

  const filteredTodos = activeKategorien.length === 0
    ? todos.filter((t) => !t.completed)
    : todos.filter((t) => !t.completed && t.kategorie != null && activeKategorien.includes(t.kategorie));

  return (
    <aside className="w-[220px] flex flex-col border-r border-border bg-white overflow-hidden">

      {/* ── App header ─────────────────────────────────────────────── */}
      <div className="px-3 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">⚖️</span>
          <div>
            <p className="text-[12px] font-bold text-foreground leading-none">Juris</p>
            <p className="text-[9px] text-muted-foreground leading-none mt-0.5">Examensvorbereitung</p>
          </div>
        </div>
      </div>

      {/* ── Scrollable content ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto" ref={chipsRef}>

        {/* ── THEMEN (Drag-to-Create) ───────────────────────────────── */}
        <div className="px-2 pt-2 pb-1">
          <button
            className="w-full flex items-center justify-between px-1 py-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            onClick={() => setShowThemen((v) => !v)}
          >
            <span>Themen · in Kalender ziehen</span>
            {showThemen ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
          </button>
          {showThemen && <ThemenSection />}
        </div>

        {/* ── KALENDER / FILTER ─────────────────────────────────────── */}
        <div className="border-t border-border mx-2 my-1" />
        <div className="px-2 pt-1 pb-1">
          <button
            className="w-full flex items-center justify-between px-1 py-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            onClick={() => setShowFilter((v) => !v)}
          >
            <span>Kalender & Filter</span>
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
                <div className="flex items-center gap-1 mb-0.5 px-1">
                  <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Google</p>
                </div>
                <CalToggle label="Privat"     color="#888780" active={true} onClick={() => {}} />
                <CalToggle label="Uni / Ref"  color="#5F5E5A" active={true} onClick={() => {}} />
                <CalToggle label="AG / Kurse" color="#444441" active={true} onClick={() => {}} />
              </div>

              <div className="border-t border-border" />

              {/* Fach filter */}
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">Fächer</p>
                <div className="flex flex-wrap gap-1">
                  {ALL_FAECHER.map((f) => {
                    const active = activeFaecher.includes(f);
                    const colors = getFachColors(f);
                    return (
                      <button
                        key={f}
                        onClick={() => toggleFach(f)}
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-opacity"
                        style={{ background: active ? colors.bg : "#F1F5F9", color: active ? colors.text : "#94a3b8" }}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kategorie filter */}
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">Kategorien</p>
                <div className="flex flex-wrap gap-1">
                  {ALL_KATEGORIEN.map((k) => {
                    const active = activeKategorien.includes(k);
                    const colors = KATEGORIE_COLORS[k];
                    return (
                      <button
                        key={k}
                        onClick={() => toggleTodoKategorie(k)}
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-opacity"
                        style={{ background: active ? colors.bg : "#F1F5F9", color: active ? colors.text : "#94a3b8" }}
                      >
                        {k}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── LERNEINHEITEN ─────────────────────────────────────────── */}
        <div className="border-t border-border mx-2 my-1" />
        <div className="px-2 pb-0">
          <button
            className="w-full flex items-center justify-between px-1 py-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            onClick={() => setShowSessions((v) => !v)}
          >
            <span>Lerneinheiten ({openSessions.length})</span>
            {showSessions ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
          </button>
        </div>
        {showSessions && (
          <div className="px-2 pb-2 space-y-0.5">
            {filteredSessions.map((s) => (
              <SessionChip key={s.id} session={s} />
            ))}
            {activeFaecher.length > 0 && filteredSessions.length === 0 && (
              <p className="text-[10px] text-muted-foreground px-1 py-1">Keine offenen Einheiten</p>
            )}
          </div>
        )}

        {/* ── TO-DOS ────────────────────────────────────────────────── */}
        <div className="border-t border-border mx-2 my-1" />
        <div className="px-2 pb-0">
          <button
            className="w-full flex items-center justify-between px-1 py-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            onClick={() => setShowTodos((v) => !v)}
          >
            <span>To-Dos ({filteredTodos.length})</span>
            {showTodos ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
          </button>
        </div>
        {showTodos && (
          <div className="px-2 pb-4 space-y-0.5">
            {filteredTodos.map((t) => (
              <TodoChip key={t.id} todo={t} />
            ))}
            {filteredTodos.length === 0 && (
              <p className="text-[10px] text-muted-foreground px-1 py-1">Keine offenen To-Dos</p>
            )}
          </div>
        )}

      </div>
    </aside>
  );
}

// ─── Themen Section (Rechtsgebiete mit eigenen Unterthemen) ─────────
function ThemenSection() {
  const { gruppen, addThema, removeThema } = useThemenStore();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const submitThema = (gruppeId: string) => {
    const value = draft.trim();
    if (value) addThema(gruppeId, value);
    setDraft("");
    // Eingabe offen lassen für schnelles Mehrfach-Eintragen
  };

  return (
    <div className="space-y-0.5 mt-1">
      {gruppen.map((g) => {
        const colors = getFachColors(g.subject);
        const isOpen = !!open[g.id];
        return (
          <div key={g.id}>
            {/* Gruppen-Header */}
            <button
              onClick={() => setOpen((p) => ({ ...p, [g.id]: !isOpen }))}
              className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-slate-50 transition-colors"
            >
              <span className="text-[11px]">{g.emoji}</span>
              <span className="flex-1 text-[10px] font-semibold text-left leading-none truncate" style={{ color: colors.text }}>
                {g.label}
              </span>
              {g.themen.length > 0 && (
                <span className="text-[8px] text-muted-foreground tabular-nums">{g.themen.length}</span>
              )}
              {isOpen
                ? <ChevronDown className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                : <ChevronRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />}
            </button>

            {isOpen && (
              <div className="pl-3 pr-1 pb-1 space-y-0.5">
                {/* Themen-Chips */}
                {g.themen.map((thema) => {
                  const eventData = JSON.stringify({
                    title: thema,
                    duration: "01:00:00",
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    textColor: colors.text,
                    extendedProps: { type: "new-theme", subject: g.subject, thema },
                  });
                  return (
                    <div
                      key={thema}
                      className="fc-draggable-chip group/chip flex items-center gap-1 rounded-md px-1.5 py-1 cursor-grab active:cursor-grabbing hover:opacity-90 transition-opacity select-none border border-transparent hover:border-slate-200"
                      style={{ background: colors.bg + "99" }}
                      data-event={eventData}
                    >
                      <GripVertical className="h-2.5 w-2.5 shrink-0 opacity-40" style={{ color: colors.text }} />
                      <span className="flex-1 text-[10px] font-medium truncate leading-tight" style={{ color: colors.text }}>
                        {thema}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeThema(g.id, thema); }}
                        className="opacity-0 group-hover/chip:opacity-60 hover:!opacity-100 transition-opacity shrink-0"
                        title="Thema entfernen"
                      >
                        <X className="h-2.5 w-2.5" style={{ color: colors.text }} />
                      </button>
                    </div>
                  );
                })}

                {/* Inline-Eingabe / Hinzufügen */}
                {adding === g.id ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitThema(g.id);
                      if (e.key === "Escape") { setAdding(null); setDraft(""); }
                    }}
                    onBlur={() => { submitThema(g.id); setAdding(null); }}
                    placeholder="Thema eingeben…"
                    className="w-full text-[10px] px-1.5 py-1 rounded-md border border-border bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                ) : (
                  <button
                    onClick={() => { setAdding(g.id); setDraft(""); }}
                    className="flex items-center gap-1 px-1.5 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    Thema hinzufügen
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
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
      <span className="text-[10px] font-medium truncate leading-tight" style={{ color: colors.text }}>
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
    allDay: true,
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
      <span className="text-[10px] font-medium truncate leading-tight" style={{ color: text }}>
        {todo.name}
      </span>
    </div>
  );
}
