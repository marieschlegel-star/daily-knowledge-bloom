"use client";

import { useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput, EventDropArg } from "@fullcalendar/core";
import deLocale from "@fullcalendar/core/locales/de";
import { useAppStore } from "@/lib/store";
import { getFachColors } from "@/lib/utils";
import type { LernSession, Klausur, Todo, GCalEvent } from "@/lib/types";
import { format } from "date-fns";

interface CalendarViewProps {
  calRef: React.RefObject<FullCalendar>;
  sessions: LernSession[];
  klausuren: Klausur[];
  todos: Todo[];
  gcalEvents: GCalEvent[];
  view: string;
  onSessionDrop: (sessionId: string, newDate: string) => void;
  onEventClick: (sessionId: string) => void;
  onDatesSet?: (info: any) => void;
}

export function CalendarViewComponent({
  calRef,
  sessions,
  klausuren,
  todos,
  gcalEvents,
  view,
  onSessionDrop,
  onEventClick,
  onDatesSet,
}: CalendarViewProps) {
  const { visibility } = useAppStore();

  const buildEvents = useCallback((): EventInput[] => {
    const events: EventInput[] = [];

    if (visibility.lernplan) {
      sessions
        .filter((s) => s.date)
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
            extendedProps: { type: "klausur" },
          });
        });
    }

    if (visibility.todos) {
      todos
        .filter((t) => t.date && !t.completed)
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
  }, [sessions, klausuren, todos, gcalEvents, visibility]);

  return (
    <div className="h-full overflow-hidden px-2 pt-1">
      <FullCalendar
        ref={calRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={view}
        locale={deLocale}
        headerToolbar={false}
        events={buildEvents()}
        editable={true}
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
        eventDrop={(info: EventDropArg) => {
          const sid = info.event.extendedProps.sessionId;
          if (sid) onSessionDrop(sid, info.event.start!.toISOString());
          else info.revert();
        }}
        eventReceive={(info) => {
          // Fired when an external chip is dropped onto the calendar
          const { type, sessionId } = info.event.extendedProps ?? {};
          if (type === "session" && sessionId) {
            onSessionDrop(sessionId, info.event.start!.toISOString());
          }
          // Remove from FC's internal store — our controlled events list handles rendering
          info.event.remove();
        }}
        eventClick={(info) => {
          const sid = info.event.extendedProps.sessionId;
          if (sid) onEventClick(sid);
        }}
        eventContent={(arg) => <EventContent arg={arg} />}
      />
    </div>
  );
}

function EventContent({ arg }: { arg: any }) {
  const { event, view } = arg;
  const isMonth = view.type === "dayGridMonth";

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
