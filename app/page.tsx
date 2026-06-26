"use client";

import { useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import { format, getISOWeek } from "date-fns";
import { de } from "date-fns/locale";

import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";
import { CalendarViewComponent } from "@/components/calendar-view";
import { Topbar } from "@/components/topbar";
import { SessionPanel } from "@/components/session-panel";
import { QuickCreateModal, type QuickCreatePayload, type QuickCreatePrefill } from "@/components/quick-create-modal";
import { DayTypePicker } from "@/components/day-type-picker";
import { DayDetailPanel } from "@/components/day-detail-panel";
import { useAppStore } from "@/lib/store";
import { toLocalISO, toDateOnly } from "@/lib/utils";
import {
  DUMMY_SESSIONS,
  DUMMY_KLAUSUREN,
  DUMMY_TODOS,
  DUMMY_POMODOROS,
} from "@/lib/dummy-data";
import type { LernSession, Klausur, Todo, GCalEvent } from "@/lib/types";

// Set to true to use Notion API, false for dummy data
const USE_NOTION = process.env.NEXT_PUBLIC_USE_NOTION === "true";

export default function HomePage() {
  const calRef = useRef<FullCalendar>(null);
  const qc = useQueryClient();
  const { selectedSessionId, setSelectedSessionId, calendarView, filters, toggleFach, toggleTodoKategorie } = useAppStore();
  const [calTitle, setCalTitle] = useState("KW 26 · Juni 2026");
  const [quickCreate, setQuickCreate] = useState<{ date: Date; allDay: boolean; prefill?: QuickCreatePrefill } | null>(null);
  const [pickerDate, setPickerDate] = useState<Date | null>(null);
  const [detailDate, setDetailDate] = useState<Date | null>(null);

  // ─── Data ─────────────────────────────────────────────────────────
  const { data: sessions = DUMMY_SESSIONS } = useQuery<LernSession[]>({
    queryKey: ["sessions"],
    queryFn: async () => {
      if (!USE_NOTION) return DUMMY_SESSIONS;
      const res = await fetch("/api/notion/sessions");
      return res.ok ? res.json() : DUMMY_SESSIONS;
    },
    staleTime: USE_NOTION ? 0 : Infinity,
  });

  const { data: klausuren = DUMMY_KLAUSUREN } = useQuery<Klausur[]>({
    queryKey: ["klausuren"],
    queryFn: async () => {
      if (!USE_NOTION) return DUMMY_KLAUSUREN;
      const res = await fetch("/api/notion/klausuren");
      return res.ok ? res.json() : DUMMY_KLAUSUREN;
    },
    staleTime: USE_NOTION ? 0 : Infinity,
  });

  const { data: todos = DUMMY_TODOS } = useQuery<Todo[]>({
    queryKey: ["todos"],
    queryFn: async () => {
      if (!USE_NOTION) return DUMMY_TODOS;
      const res = await fetch("/api/notion/todos");
      return res.ok ? res.json() : DUMMY_TODOS;
    },
    staleTime: USE_NOTION ? 0 : Infinity,
  });

  const gcalEvents: GCalEvent[] = [];

  // ─── Mutations ────────────────────────────────────────────────────
  const updateSessionDate = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      if (!USE_NOTION) return;
      await fetch("/api/notion/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, date }),
      });
    },
    onMutate: async ({ id, date }) => {
      await qc.cancelQueries({ queryKey: ["sessions"] });
      const prev = qc.getQueryData<LernSession[]>(["sessions"]);
      qc.setQueryData<LernSession[]>(["sessions"], (old) =>
        old?.map((s) => (s.id === id ? { ...s, date } : s)) ?? []
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["sessions"], ctx.prev);
    },
  });

  const updateSessionDuration = useMutation({
    mutationFn: async ({ id, duration }: { id: string; duration: number }) => {
      if (!USE_NOTION) return;
      await fetch("/api/notion/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, duration }),
      });
    },
    onMutate: async ({ id, duration }) => {
      await qc.cancelQueries({ queryKey: ["sessions"] });
      const prev = qc.getQueryData<LernSession[]>(["sessions"]);
      qc.setQueryData<LernSession[]>(["sessions"], (old) =>
        old?.map((s) => (s.id === id ? { ...s, duration } : s)) ?? []
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["sessions"], ctx.prev);
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      if (!USE_NOTION) return;
      await fetch("/api/notion/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["sessions"] });
      const prev = qc.getQueryData<LernSession[]>(["sessions"]);
      qc.setQueryData<LernSession[]>(["sessions"], (old) =>
        old?.filter((s) => s.id !== id) ?? []
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["sessions"], ctx.prev);
    },
  });

  const completeTodo = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      if (!USE_NOTION) return;
      await fetch("/api/notion/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed }),
      });
    },
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: ["todos"] });
      const prev = qc.getQueryData<Todo[]>(["todos"]);
      qc.setQueryData<Todo[]>(["todos"], (old) =>
        old?.map((t) => (t.id === id ? { ...t, completed } : t)) ?? []
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["todos"], ctx.prev);
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────────
  const handleSessionResize = useCallback(
    (sessionId: string, duration: number) => {
      updateSessionDuration.mutate({ id: sessionId, duration });
    },
    [updateSessionDuration]
  );

  const handleSessionDrop = useCallback(
    (sessionId: string, newDate: string) => {
      updateSessionDate.mutate({ id: sessionId, date: newDate });
    },
    [updateSessionDate]
  );

  const handleDatesSet = useCallback(
    (info: any) => {
      const start: Date = info.start;
      const kw = getISOWeek(start);
      if (info.view.type === "timeGridDay") {
        setCalTitle(format(start, "EEEE, dd. MMMM yyyy", { locale: de }));
      } else if (info.view.type === "dayGridMonth") {
        setCalTitle(format(start, "MMMM yyyy", { locale: de }));
      } else {
        setCalTitle(`KW ${kw} · ${format(start, "MMMM yyyy", { locale: de })}`);
      }
    },
    []
  );

  const handleDateClick = useCallback((date: Date, allDay: boolean) => {
    // allDay-Klick → Tages-Detailansicht öffnen; Zeitslot-Klick → neuen Lernblock erstellen
    if (allDay) {
      setDetailDate(date);
    } else {
      setQuickCreate({ date, allDay: false });
    }
  }, []);

  const handleThemeDrop = useCallback((subject: string, thema: string, date: Date) => {
    setQuickCreate({ date, allDay: false, prefill: { type: "lerneinheit", subject: subject as any, title: thema } });
  }, []);

  const handleDayHeaderClick = useCallback((date: Date) => {
    setPickerDate(date);
  }, []);

  const handleQuickCreate = useCallback(
    async (payload: QuickCreatePayload): Promise<{ ok: boolean; error?: string }> => {
      if (payload.type === "todo") {
        const dateStr = payload.allDay ? toDateOnly(payload.slotDate) : toLocalISO(payload.slotDate);

        if (USE_NOTION) {
          const res = await fetch("/api/notion/todos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: payload.name, date: dateStr, kategorie: payload.kategorie }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) {
            return { ok: false, error: body.error ?? "To-Do konnte nicht gespeichert werden." };
          }
          const newTodo: Todo = {
            id: body.id ?? `local-${Date.now()}`,
            name: payload.name,
            date: dateStr,
            completed: false,
            kategorie: payload.kategorie,
            kat: null,
            lernplanIds: [],
          };
          qc.setQueryData<Todo[]>(["todos"], (old) => [...(old ?? []), newTodo]);
          qc.invalidateQueries({ queryKey: ["todos"] });
        } else {
          const newTodo: Todo = {
            id: `local-todo-${Date.now()}`,
            name: payload.name,
            date: dateStr,
            completed: false,
            kategorie: payload.kategorie,
            kat: null,
            lernplanIds: [],
          };
          qc.setQueryData<Todo[]>(["todos"], (old) => [...(old ?? []), newTodo]);
        }

        if (!filters.todoKategorien.includes(payload.kategorie)) {
          toggleTodoKategorie(payload.kategorie);
        }

        return { ok: true };
      }

      const dateStr = toLocalISO(payload.slotDate);
      const duration = payload.duration;

      if (USE_NOTION) {
        const res = await fetch("/api/notion/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: payload.title,
            date: dateStr,
            subject: payload.subject,
            duration,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, error: body.error ?? "Lerneinheit konnte nicht gespeichert werden." };
        }
        const newSession: LernSession = {
          id: body.id ?? `local-${Date.now()}`,
          title: payload.title,
          subject: payload.subject,
          date: dateStr,
          duration,
          status: [],
          priority: "Medium",
          examensrelevanz: [],
          completed: false,
          wiederholungen: 0,
          klausurenIds: [],
          pomodoroIds: [],
          todoIds: [],
          parentId: null,
          subIds: [],
          unterlagen: [],
          lernTodos: "",
        };
        qc.setQueryData<LernSession[]>(["sessions"], (old) => [...(old ?? []), newSession]);
        qc.invalidateQueries({ queryKey: ["sessions"] });
      } else {
        const newSession: LernSession = {
          id: `local-session-${Date.now()}`,
          title: payload.title,
          subject: payload.subject,
          date: dateStr,
          duration,
          status: [],
          priority: "Medium",
          examensrelevanz: [],
          completed: false,
          wiederholungen: 0,
          klausurenIds: [],
          pomodoroIds: [],
          todoIds: [],
          parentId: null,
          subIds: [],
          unterlagen: [],
          lernTodos: "",
        };
        qc.setQueryData<LernSession[]>(["sessions"], (old) => [...(old ?? []), newSession]);
      }

      if (!filters.faecher.includes(payload.subject)) {
        toggleFach(payload.subject);
      }

      return { ok: true };
    },
    [qc, filters.faecher, filters.todoKategorien, toggleFach, toggleTodoKategorie]
  );

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) ?? null;

  return (
    <div className="flex h-screen bg-[#F8F9FB] overflow-hidden">
      {/* Left Sidebar */}
      <LeftSidebar sessions={sessions} todos={todos} />

      {/* Main */}
      <main className="flex flex-col flex-1 min-w-0 overflow-hidden bg-white border-x border-border">
        <Topbar calRef={calRef} title={calTitle} onNewLernblock={() => {
          const api = calRef.current?.getApi();
          const date = api?.getDate() ?? new Date();
          date.setHours(9, 0, 0, 0);
          setQuickCreate({ date, allDay: false });
        }} />
        <div className="flex-1 overflow-hidden">
          <CalendarViewComponent
            calRef={calRef}
            sessions={sessions}
            klausuren={klausuren}
            todos={todos}
            gcalEvents={gcalEvents}
            view={calendarView}
            onSessionDrop={handleSessionDrop}
            onSessionResize={handleSessionResize}
            onEventClick={(id) => {
              setDetailDate(null);
              setSelectedSessionId(id);
            }}
            onDatesSet={handleDatesSet}
            onDateClick={handleDateClick}
            onDayHeaderClick={handleDayHeaderClick}
            onThemeDrop={handleThemeDrop}
          />
        </div>
      </main>

      {/* Right Sidebar */}
      <div className="relative w-[300px] shrink-0 bg-white">
        {selectedSession ? (
          <SessionPanel
            session={selectedSession}
            klausuren={klausuren}
            pomodoros={DUMMY_POMODOROS}
            onClose={() => setSelectedSessionId(null)}
            onDelete={(id) => {
              deleteSession.mutate(id);
              setSelectedSessionId(null);
            }}
          />
        ) : detailDate ? (
          <DayDetailPanel
            date={detailDate}
            sessions={sessions}
            todos={todos}
            klausuren={klausuren}
            onClose={() => setDetailDate(null)}
            onNewLernblock={(date) => { setDetailDate(null); setQuickCreate({ date, allDay: false }); }}
            onSessionClick={(id) => { setDetailDate(null); setSelectedSessionId(id); }}
          />
        ) : (
          <RightSidebar
            klausuren={klausuren}
            todos={todos}
            sessions={sessions}
            pomodoros={DUMMY_POMODOROS}
            onTodoComplete={(id) => completeTodo.mutate({ id, completed: true })}
          />
        )}
      </div>

      {/* Day Type Picker */}
      {pickerDate && (
        <DayTypePicker date={pickerDate} onClose={() => setPickerDate(null)} />
      )}

      {/* Quick-Create Modal */}
      {quickCreate && (
        <QuickCreateModal
          date={quickCreate.date}
          allDay={quickCreate.allDay}
          calendarView={calendarView}
          prefill={quickCreate.prefill}
          onClose={() => setQuickCreate(null)}
          onCreate={handleQuickCreate}
        />
      )}
    </div>
  );
}
