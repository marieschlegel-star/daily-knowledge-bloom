
import { useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import type { EventReceiveArg, EventResizeDoneArg } from "@fullcalendar/interaction";
import { durationHoursFromRange, toLocalISO } from "@/lib/utils";
import deLocale from "@fullcalendar/core/locales/de";
import { useAppStore } from "@/lib/store";
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
  onSessionResize: (sessionId: string, duration: number) => void;
  onEventClick: (sessionId: string) => void;
  onKlausurClick?: (klausurId: string) => void;
  onDatesSet?: (info: any) => void;
  onDateClick?: (date: Date, allDay: boolean) => void;
  onDayHeaderClick?: (date: Date) => void;
  onThemeDrop?: (subject: string, thema: string, date: Date) => void;
}

export function CalendarViewComponent({
  calRef,
  sessions,
  klausuren,
  todos,
  gcalEvents,
  view,
  onSessionDrop,
  onSessionResize,
  onEventClick,
  onKlausurClick,
  onDatesSet,
  onDateClick,
  onDayHeaderClick,
  onThemeDrop,
}: CalendarViewProps) {
  const { visibility, filters } = useAppStore();
  const { dayPlans, customGrunds } = useDayStore();

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
            startEditable: false,
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
            allDay: true,
            backgroundColor: "#FEF3C7",
            borderColor: "#FDE68A",
            textColor: "#92400E",
            editable: false,
            extendedProps: { type: "todo" },
          });
        });
    }

    gcalEvents.forEach((e) => {
      if (visibility.gcal[e.calendarId] === false) return;
      events.push({
        id: `gcal-${e.id}`,
        title: e.title,
        start: e.start,
        end: e.end,
        backgroundColor: "#F1EFE8",
        borderColor: "#E5E0D5",
        textColor: "#5F5E5A",
        editable: false,
        extendedProps: { type: "gcal" },
      });
    });

    return events;
  }, [sessions, klausuren, todos, gcalEvents, visibility, dayPlans, customGrunds, filters]);

  return (
    <div className="h-full overflow-hidden px-2 pt-1">
      <FullCalendar
        ref={calRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={view}
        locale={deLocale}
        headerToolbar={false}
        events={buildEvents()}
        editable={true}
        eventStartEditable={false}
        droppable={true}
        eventResizableFromStart={false}
        eventDurationEditable={true}
        height="100%"
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
        eventResize={(info: EventResizeDoneArg) => {
          const sid = info.event.extendedProps.sessionId as string | undefined;
          if (!sid || !info.event.start || !info.event.end) {
            info.revert();
            return;
          }
          onSessionResize(sid, durationHoursFromRange(info.event.start, info.event.end, 5));
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
          const { sessionId, klausurId, type } = info.event.extendedProps ?? {};
          if (sessionId) onEventClick(sessionId);
          else if (type === "klausur" && klausurId) onKlausurClick?.(klausurId);
        }}
        dateClick={(info) => onDateClick?.(info.date, info.allDay)}
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
