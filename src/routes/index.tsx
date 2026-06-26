import { createFileRoute } from "@tanstack/react-router";

import { useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import FullCalendar from "@fullcalendar/react";
import { format, getISOWeek } from "date-fns";
import { de } from "date-fns/locale";

import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/components/right-sidebar";
import { CalendarViewComponent } from "@/components/calendar-view";
import { Topbar } from "@/components/topbar";
import { SessionPanel } from "@/components/session-panel";
import { KlausurPanel } from "@/components/klausur-panel";
import { QuickCreateModal, type QuickCreatePayload, type QuickCreatePrefill } from "@/components/quick-create-modal";
import { DayPlanDialog } from "@/components/day-plan-dialog";
import { DayDetailPanel } from "@/components/day-detail-panel";
import { useAppStore } from "@/lib/store";
import { toLocalISO, toDateOnly } from "@/lib/utils";
import { useLernblockStore } from "@/lib/lernblock-store";
import {
  DUMMY_SESSIONS,
  DUMMY_KLAUSUREN,
  DUMMY_TODOS,
  DUMMY_POMODOROS,
} from "@/lib/dummy-data";
import type { LernSession, Klausur, Todo, GCalEvent } from "@/lib/types";

async function fetchJsonOrFallback<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return fallback;
    return res.json();
  } catch {
    return fallback;
  }
}

async function notionWrite(url: string, init: RequestInit): Promise<{ skipped: boolean; body?: any }> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));

  if (res.ok) return { skipped: false, body };
  const configMissing =
    res.status === 500 &&
    typeof body?.error === "string" &&
    (body.error.includes("DB ID missing") || body.error.includes("not configured"));

  if (configMissing) {
    return { skipped: true, body };
  }

  throw new Error(body?.error ?? "Notion konnte nicht aktualisiert werden.");
}

function HomePage() {
  const calRef = useRef<FullCalendar>(null);
  const qc = useQueryClient();
  const { selectedSessionId, setSelectedSessionId, calendarView, filters, toggleFach, toggleTodoKategorie } = useAppStore();
  const [calTitle, setCalTitle] = useState("KW 26 · Juni 2026");
  const [quickCreate, setQuickCreate] = useState<{ date: Date; allDay: boolean; prefill?: QuickCreatePrefill } | null>(null);
  const [pickerDate, setPickerDate] = useState<Date | null>(null);
  const [detailDate, setDetailDate] = useState<Date | null>(null);
  const [selectedKlausurId, setSelectedKlausurId] = useState<string | null>(null);

  // ─── Data ─────────────────────────────────────────────────────────
  const { data: sessions = DUMMY_SESSIONS } = useQuery<LernSession[]>({
    queryKey: ["sessions"],
    queryFn: () => fetchJsonOrFallback("/api/notion/sessions", DUMMY_SESSIONS),
    staleTime: 30_000,
  });

  const { data: klausuren = DUMMY_KLAUSUREN } = useQuery<Klausur[]>({
    queryKey: ["klausuren"],
    queryFn: () => fetchJsonOrFallback("/api/notion/klausuren", DUMMY_KLAUSUREN),
    staleTime: 30_000,
  });

  const { data: todos = DUMMY_TODOS } = useQuery<Todo[]>({
    queryKey: ["todos"],
    queryFn: () => fetchJsonOrFallback("/api/notion/todos", DUMMY_TODOS),
    staleTime: 30_000,
  });

  const gcalEvents: GCalEvent[] = [];

  // ─── Mutations ────────────────────────────────────────────────────
  const updateSessionDate = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string | null }) => {
      await notionWrite("/api/notion/sessions", {
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
      await notionWrite("/api/notion/sessions", {
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
      if (id.startsWith("local-")) return;
      await notionWrite("/api/notion/sessions", {
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
      useLernblockStore.getState().clearMeta(id);
      return { prev };
    },
    onError: (error, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["sessions"], ctx.prev);
      toast.error("Lerneinheit konnte nicht gelöscht werden", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const handleDeleteSession = useCallback(
    (id: string, options?: { closePanel?: boolean }) => {
      if (selectedSessionId === id || options?.closePanel !== false) {
        setSelectedSessionId(null);
      }
      deleteSession.mutate(id);
    },
    [deleteSession, selectedSessionId, setSelectedSessionId]
  );

  const deleteKlausur = useMutation({
    mutationFn: async (id: string) => {
      await notionWrite("/api/notion/klausuren", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["klausuren"] });
      const prev = qc.getQueryData<Klausur[]>(["klausuren"]);
      qc.setQueryData<Klausur[]>(["klausuren"], (old) =>
        old?.filter((k) => k.id !== id) ?? []
      );
      return { prev };
    },
    onError: (error, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["klausuren"], ctx.prev);
      toast.error("Klausur konnte nicht entfernt werden", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["klausuren"] }),
  });

  const handleDeleteKlausur = useCallback(
    (id: string) => {
      setSelectedKlausurId(null);
      deleteKlausur.mutate(id);
    },
    [deleteKlausur]
  );

  const completeTodo = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      await notionWrite("/api/notion/todos", {
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
      toast.error("To-Do konnte nicht aktualisiert werden");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["todos"] }),
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

        try {
          const result = await notionWrite("/api/notion/todos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: payload.name, date: dateStr, kategorie: payload.kategorie }),
          });
          const newTodo: Todo = {
            id: result.body?.id ?? `local-${Date.now()}`,
            name: payload.name,
            date: dateStr,
            completed: false,
            kategorie: payload.kategorie,
            kat: null,
            lernplanIds: [],
          };
          qc.setQueryData<Todo[]>(["todos"], (old) => [...(old ?? []), newTodo]);
          if (!result.skipped) qc.invalidateQueries({ queryKey: ["todos"] });
        } catch (error: any) {
          return { ok: false, error: error.message ?? "To-Do konnte nicht gespeichert werden." };
        }

        if (!filters.todoKategorien.includes(payload.kategorie)) {
          toggleTodoKategorie(payload.kategorie);
        }

        return { ok: true };
      }

      const dateStr = toLocalISO(payload.slotDate);
      const duration = payload.duration;

      try {
        const result = await notionWrite("/api/notion/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: payload.title,
            date: dateStr,
            subject: payload.subject,
            duration,
          }),
        });
        const newSession: LernSession = {
          id: result.body?.id ?? `local-${Date.now()}`,
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
        if (!result.skipped) qc.invalidateQueries({ queryKey: ["sessions"] });
      } catch (error: any) {
        return { ok: false, error: error.message ?? "Lerneinheit konnte nicht gespeichert werden." };
      }

      if (!filters.faecher.includes(payload.subject)) {
        toggleFach(payload.subject);
      }

      return { ok: true };
    },
    [qc, filters.faecher, filters.todoKategorien, toggleFach, toggleTodoKategorie]
  );

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) ?? null;
  const selectedKlausur = klausuren.find((k) => k.id === selectedKlausurId) ?? null;

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
              setSelectedKlausurId(null);
              setSelectedSessionId(id);
            }}
            onKlausurClick={(id) => {
              setDetailDate(null);
              setSelectedSessionId(null);
              setSelectedKlausurId(id);
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
            onDelete={(id) => handleDeleteSession(id)}
          />
        ) : selectedKlausur ? (
          <KlausurPanel
            klausur={selectedKlausur}
            onClose={() => setSelectedKlausurId(null)}
            onDelete={(id) => handleDeleteKlausur(id)}
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
            onDeleteSession={(id) => handleDeleteSession(id, { closePanel: false })}
            onOpenDayPlan={() => setPickerDate(detailDate)}
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
        <DayPlanDialog date={pickerDate} onClose={() => setPickerDate(null)} />
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

export const Route = createFileRoute("/")({ component: HomePage });
