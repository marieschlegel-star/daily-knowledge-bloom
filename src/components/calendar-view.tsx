
import { useCallback, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import multiMonthPlugin from "@fullcalendar/multimonth";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import type { EventReceiveArg, EventResizeDoneArg } from "@fullcalendar/interaction";
import { durationHoursFromRange, toLocalISO } from "@/lib/utils";
import deLocale from "@fullcalendar/core/locales/de";
import { useAppStore } from "@/lib/store";
import { useGCalStore } from "@/lib/gcal-store";
import { useDayStore } from "@/lib/day-store";
import { getFachColors } from "@/lib/utils";
import type { LernSession, Klausur, Todo, GCalEvent } from "@/lib/types";
import { resolveGrundConfig } from "@/lib/day-grund";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { formatDayPlanLabel } from "@/lib/utils";

interface CalendarViewProps {
  calRef: React.RefObject<FullCalendar | null>;
  sessions: LernSession[];
  klausuren: Klausur[];
  todos: Todo[];
  gcalEvents: GCalEvent[];
  view: string;
  onSessionDrop: (sessionId: string, newDate: string) => void;
  onTodoDrop?: (todoId: string, newDate: string) => void;
  onWorkBlockChange?: (dateStr: string, workStart: string, hours: number) => void;
  onSessionResize: (sessionId: string, duration: number) => void;
  onEventClick: (sessionId: string) => void;
  onKlausurClick?: (klausurId: string) => void;
  onDatesSet?: (info: any) => void;
  onDateClick?: (date: Date, allDay: boolean) => void;
  onDayHeaderClick?: (date: Date) => void;
  onThemeDrop?: (subject: string, thema: string, date: Date) => void;
  onTodoClearDate?: (todoId: string) => void;
}

export function CalendarViewComponent({
  calRef,
  sessions,
  klausuren,
  todos,
  gcalEvents,
  view,
  onSessionDrop,
  onTodoDrop,
  onWorkBlockChange,
  onSessionResize,
  onEventClick,
  onKlausurClick,
  onDatesSet,
  onDateClick,
  onDayHeaderClick,
  onThemeDrop,
  onTodoClearDate,
}: CalendarViewProps) {
  const { visibility, filters } = useAppStore();
  const { customColors } = useGCalStore();
  const { dayPlans, customGrunds } = useDayStore();
  const lastDateClick = useRef<{ key: string; time: number } | null>(null);

  const buildEvents = useCallback((): EventInput[] => {
    const events: EventInput[] = [];
    const fachFilterActive = filters.faecher.length > 0;
    const katFilterActive = filters.todoKategorien.length > 0;

    // Background events for day types
    Object.entries(dayPlans).forEach(([dateStr, plan]) => {
      const cfg = resolveGrundConfig(plan.grund, customGrunds);
      if (!cfg) return;
      events.push({
        id: `daytype-${dateStr}`,
        start: dateStr,
        allDay: true,
        display: "background",
        backgroundColor: cfg.bg,
        extendedProps: { type: "daytype", grund: plan.grund },
      });

      // Timed work block for "arbeit" plans
      if (plan.grund === "arbeit" && plan.hours > 0) {
        const workStart = plan.workStart ?? "08:00";
        const [h, m] = workStart.split(":").map(Number);
        const start = new Date(`${dateStr}T${workStart}:00`);
        const end = new Date(start.getTime() + plan.hours * 3600000);
        const endStr = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
        events.push({
          id: `workblock-${dateStr}`,
          title: `🏛 Arbeit ${workStart}–${endStr}`,
          start: `${dateStr}T${workStart}:00`,
          end: end.toISOString(),
          backgroundColor: "rgba(203,213,225,0.45)",
          borderColor: "rgba(148,163,184,0.6)",
          textColor: "#64748B",
          editable: true,
          startEditable: true,
          durationEditable: true,
          extendedProps: { type: "workblock", dateStr },
        });
      }
    });

    if (visibility.lernplan) {
      sessions
        .filter((s) => s.date && (!fachFilterActive || filters.faecher.includes(s.subject)))
        .forEach((s) => {
          const colors = getFachColors(s.subject);
          const start = new Date(s.date!);
          const end = new Date(start.getTime() + s.duration * 3600000);
          events.push({
            id: `session-${s.id}`,
            title: s.title,
            start: s.date!,
            end: end.toISOString(),
            backgroundColor: colors.bg,
            borderColor: colors.border,
            textColor: colors.text,
            extendedProps: { type: "session", sessionId: s.id, fach: s.subject },
            startEditable: true,
            durationEditable: true,
          });
        });
    }

    if (visibility.klausuren) {
      klausuren
        .filter((k) => k.schreibDatum)
        .forEach((k) => {
          events.push({
            id: `klausur-${k.id}`,
            title: `📝 ${k.title}`,
            start: k.schreibDatum!,
            allDay: true,
            backgroundColor: "#FEE2E2",
            borderColor: "#FCA5A5",
            textColor: "#991B1B",
            editable: false,
            extendedProps: { type: "klausur", klausurId: k.id },
          });
        });
    }

    if (visibility.todos) {
      todos
        .filter((t) => t.date && !t.completed && (!katFilterActive || (t.kategorie != null && filters.todoKategorien.includes(t.kategorie))))
        .forEach((t) => {
          events.push({
            id: `todo-${t.id}`,
            title: `· ${t.name}`,
            start: t.date!,
            allDay: !t.date?.includes("T"),
            backgroundColor: "#FEF3C7",
            borderColor: "#FDE68A",
            textColor: "#92400E",
            editable: true,
            startEditable: true,
            extendedProps: { type: "todo", todoId: t.id },
          });
        });
    }

    gcalEvents.forEach((e) => {
      if (visibility.gcal[e.calendarId] !== true) return;
      const color = customColors[e.calendarId] ?? e.color;
      const bg = color ? `${color}33` : "#F1EFE8";
      const border = color ?? "#E5E0D5";
      events.push({
        id: `gcal-${e.id}`,
        title: e.title,
        start: e.start,
        end: e.end,
        allDay: e.allDay,
        backgroundColor: bg,
        borderColor: border,
        textColor: "#5F5E5A",
        editable: false,
        extendedProps: { type: "gcal" },
      });
    });

    return events;
  }, [sessions, klausuren, todos, gcalEvents, visibility, customColors, dayPlans, customGrunds, filters]);

  const isScrollableView = view === "dayGridMonth" || view === "multiMonthYear";

  return (
    <div className={`h-full px-2 pt-1 ${isScrollableView ? "overflow-y-auto" : "overflow-hidden"}`}>
      <FullCalendar
        ref={calRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, multiMonthPlugin, interactionPlugin]}
        initialView={view}
        locale={deLocale}
        headerToolbar={false}
        events={buildEvents()}
        editable={true}
        eventStartEditable={false}
        droppable={true}
        eventResizableFromStart={false}
        eventDurationEditable={true}
        height={isScrollableView ? "auto" : "100%"}
        views={{
          multiMonthYear: {
            multiMonthMaxColumns: 3,
            multiMonthMinWidth: 250,
          },
        }}
        slotMinTime="07:00:00"
        slotMaxTime="23:00:00"
        slotDuration="00:15:00"
        slotLabelInterval="01:00:00"
        snapDuration="00:05:00"
        nowIndicator={true}
        dayMaxEvents={3}
        allDaySlot={true}
        firstDay={1}
        datesSet={onDatesSet}
        dayHeaderContent={(arg) => {
          const dateStr = format(arg.date, "yyyy-MM-dd");
          const plan = dayPlans[dateStr];
          const cfg = plan ? resolveGrundConfig(plan.grund, customGrunds) : null;
          const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;

          return (
            <div
              className="flex flex-col items-center gap-1 py-1.5 px-1 cursor-pointer group w-full rounded-lg hover:bg-muted/40 transition-colors"
              onClick={() => onDayHeaderClick?.(arg.date)}
              title="Tagesplanung"
            >
              <span className={`text-label font-medium transition-colors group-hover:text-primary ${isToday ? "text-primary" : "text-foreground/85"}`}>
                {format(arg.date, "EEE d.", { locale: de })}
              </span>
              {plan && cfg ? (
                <span className="text-meta font-medium leading-tight text-center px-0.5" style={{ color: cfg.color }}>
                  {formatDayPlanLabel(plan.grund, plan.hours, customGrunds)}
                </span>
              ) : (
                <span className="text-meta text-transparent group-hover:text-muted-foreground transition-colors">
                  + Planen
                </span>
              )}
            </div>
          );
        }}
        dayCellContent={(arg) => {
          if (view !== "dayGridMonth" && view !== "multiMonthYear") return undefined;
          const dateStr = format(arg.date, "yyyy-MM-dd");
          const plan = dayPlans[dateStr];
          const cfg = plan ? resolveGrundConfig(plan.grund, customGrunds) : null;
          return (
            <div className="flex flex-col w-full min-h-0">
              <span className="text-xs font-semibold text-right pr-1">{arg.dayNumberText}</span>
              {cfg && (
                <span className="text-[9px] font-medium leading-tight px-1 pb-0.5" style={{ color: cfg.color }}>
                  {cfg.emoji} {plan!.hours > 0 ? `${plan!.hours}h` : cfg.label.slice(0, 6)}
                </span>
              )}
            </div>
          );
        }}
        eventDrop={(info) => {
          const { type, sessionId, todoId, dateStr } = info.event.extendedProps ?? {};
          if (!info.event.start) { info.revert(); return; }
          if (type === "workblock" && dateStr) {
            const newStart = `${String(info.event.start.getHours()).padStart(2,"0")}:${String(info.event.start.getMinutes()).padStart(2,"0")}`;
            const hours = info.event.end
              ? (info.event.end.getTime() - info.event.start.getTime()) / 3600000
              : 8;
            onWorkBlockChange?.(dateStr, newStart, hours);
          } else if (type === "todo" && todoId) {
            const newDate = info.event.allDay
              ? info.event.startStr.slice(0, 10)
              : toLocalISO(info.event.start);
            onTodoDrop?.(todoId, newDate);
          } else if (sessionId) {
            onSessionDrop(sessionId, toLocalISO(info.event.start));
          } else {
            info.revert();
          }
        }}
        eventResize={(info: EventResizeDoneArg) => {
          const { type, sessionId, dateStr } = info.event.extendedProps ?? {};
          if (!info.event.start || !info.event.end) { info.revert(); return; }
          if (type === "workblock" && dateStr) {
            const newStart = `${String(info.event.start.getHours()).padStart(2,"0")}:${String(info.event.start.getMinutes()).padStart(2,"0")}`;
            const hours = (info.event.end.getTime() - info.event.start.getTime()) / 3600000;
            onWorkBlockChange?.(dateStr, newStart, Math.round(hours * 4) / 4);
          } else if (sessionId) {
            onSessionResize(sessionId, durationHoursFromRange(info.event.start, info.event.end, 5));
          } else {
            info.revert();
          }
        }}
        eventReceive={(info: EventReceiveArg) => {
          const { type, sessionId, subject, thema } = info.event.extendedProps ?? {};
          if (type === "session" && sessionId) {
            onSessionDrop(sessionId, toLocalISO(info.event.start!));
          } else if (type === "new-theme" && info.event.start) {
            onThemeDrop?.(subject, thema, info.event.start);
          }
          info.event.remove();
        }}
        eventClick={(info) => {
          info.jsEvent.preventDefault();
          info.jsEvent.stopPropagation();
          const { sessionId, klausurId, type, todoId } = info.event.extendedProps ?? {};
          if (sessionId) onEventClick(sessionId);
          else if (type === "klausur" && klausurId) onKlausurClick?.(klausurId);
          else if (type === "todo" && todoId) onTodoClearDate?.(todoId);
        }}
        dateClick={(info) => {
          const key = info.dateStr;
          const now = Date.now();
          if (lastDateClick.current?.key === key && now - lastDateClick.current.time < 400) {
            onDateClick?.(info.date, info.allDay);
            lastDateClick.current = null;
          } else {
            lastDateClick.current = { key, time: now };
          }
        }}
        eventContent={(arg) => <EventContent arg={arg} />}
      />
    </div>
  );
}

function EventContent({ arg }: { arg: any }) {
  const { event, view } = arg;
  const isMonth = view.type === "dayGridMonth";
  const isAgenda = view.type === "listWeek";

  if (isAgenda) {
    return (
      <div className="px-1 py-0.5">
        <span className="text-sm font-medium">{event.title}</span>
        {event.start && event.end && !event.allDay && (
          <span className="text-xs text-muted-foreground ml-2">
            {format(event.start, "HH:mm")}–{format(event.end, "HH:mm")}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden px-1 py-0.5 w-full truncate">
      <span className="font-medium text-[11px] leading-tight block truncate">
        {event.title}
      </span>
      {!isMonth && !event.allDay && event.start && event.end && (
        <span className="text-[9px] opacity-70 block">
          {format(event.start, "HH:mm")}–{format(event.end, "HH:mm")}
        </span>
      )}
    </div>
  );
}
