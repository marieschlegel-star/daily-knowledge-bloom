
import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, Timer, ListChecks, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { CalendarView } from "@/lib/types";
import FullCalendar from "@fullcalendar/react";

const VIEW_LABELS: Record<CalendarView, string> = {
  timeGridDay: "Tag",
  timeGridWeek: "Woche",
  dayGridMonth: "Monat",
  multiMonthYear: "Jahr",
  listWeek: "Agenda",
};

interface TopbarProps {
  calRef: React.RefObject<FullCalendar | null>;
  title: string;
  onNewLernblock: () => void;
}

export function Topbar({ calRef, title, onNewLernblock }: TopbarProps) {
  const { calendarView, setCalendarView } = useAppStore();

  const navigate = (dir: "prev" | "next" | "today") => {
    const api = calRef.current?.getApi();
    if (!api) return;
    if (dir === "prev") api.prev();
    else if (dir === "next") api.next();
    else api.today();
  };

  const switchView = (view: CalendarView) => {
    const api = calRef.current?.getApi();
    if (api) api.changeView(view);
    setCalendarView(view);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-card shrink-0">
      {/* Title + Nav */}
      <div className="flex items-center gap-2">
        <h1 className="text-base font-semibold text-foreground mr-1">{title}</h1>
        <button
          onClick={() => navigate("prev")}
          className="p-1 rounded-md hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => navigate("today")}
          className="px-2.5 py-1 text-label rounded-md border border-border hover:bg-muted transition-colors text-foreground"
        >
          Heute
        </button>
        <button
          onClick={() => navigate("next")}
          className="p-1 rounded-md hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* View switcher + actions */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg bg-muted p-0.5">
          {(Object.keys(VIEW_LABELS) as CalendarView[]).map((view) => (
            <button
              key={view}
              onClick={() => switchView(view)}
              className={cn(
                "px-3 py-1 text-label rounded-md transition-colors",
                calendarView === view
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {VIEW_LABELS[view]}
            </button>
          ))}
        </div>

        <Link
          to="/staatsexamen"
          className="flex items-center gap-1.5 px-3 py-1.5 text-label rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <GraduationCap className="h-3.5 w-3.5" />
          Staatsexamen
        </Link>

        <Link
          to="/todos"
          className="flex items-center gap-1.5 px-3 py-1.5 text-label rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ListChecks className="h-3.5 w-3.5" />
          To-Dos
        </Link>

        <Link
          to="/fokus"
          className="flex items-center gap-1.5 px-3 py-1.5 text-label rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Timer className="h-3.5 w-3.5" />
          Fokus-Timer
        </Link>

        <Button size="sm" onClick={onNewLernblock} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          Lernblock
        </Button>
      </div>
    </div>
  );
}
