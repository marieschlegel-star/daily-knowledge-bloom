import { createFileRoute } from "@tanstack/react-router";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, RefreshCw, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isNotionPageId } from "@/lib/notion-guards";
import type { Todo, TodoKategorie } from "@/lib/types";

const KATEGORIEN: (TodoKategorie | "Ohne")[] = ["Lernen", "KK", "AssK", "AG", "Ohne"];

const KAT_COLOR: Record<string, string> = {
  Lernen: "bg-violet-100 text-violet-700",
  KK: "bg-amber-100 text-amber-700",
  AssK: "bg-emerald-100 text-emerald-700",
  AG: "bg-sky-100 text-sky-700",
  Ohne: "bg-muted text-muted-foreground",
};

function daysUntil(d: string | null): number | null {
  if (!d) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = parseISO(d); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function TodosPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");
  const [kategorie, setKategorie] = useState<TodoKategorie | "Ohne" | "alle">("alle");

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery<Todo[]>({
    queryKey: ["todos"],
    queryFn: async () => {
      const res = await fetch("/api/notion/todos");
      if (!res.ok) throw new Error(`Notion API: ${res.status}`);
      return res.json();
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      if (!isNotionPageId(id)) return;
      const res = await fetch("/api/notion/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Update fehlgeschlagen");
    },
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: ["todos"] });
      const prev = qc.getQueryData<Todo[]>(["todos"]);
      qc.setQueryData<Todo[]>(["todos"], (old) =>
        old?.map((t) => (t.id === id ? { ...t, completed } : t)) ?? []
      );
      return { prev };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["todos"], ctx.prev);
      toast.error("To-Do konnte nicht aktualisiert werden", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["todos"] }),
  });

  const todos = data ?? [];

  const filtered = useMemo(() => {
    return todos
      .filter((t) => (filter === "open" ? !t.completed : filter === "done" ? t.completed : true))
      .filter((t) => {
        if (kategorie === "alle") return true;
        if (kategorie === "Ohne") return !t.kategorie;
        return t.kategorie === kategorie;
      })
      .sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : Infinity;
        const db = b.date ? new Date(b.date).getTime() : Infinity;
        return da - db;
      });
  }, [todos, filter, kategorie]);

  const counts = useMemo(() => ({
    open: todos.filter((t) => !t.completed).length,
    done: todos.filter((t) => t.completed).length,
    all: todos.length,
  }), [todos]);

  return (
    <div className="min-h-screen bg-violet-50/30">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Zurück
          </Link>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Aktualisieren
          </button>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-1">To-Dos aus Notion</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Live-Ansicht der Notion To-Do-Datenbank
        </p>

        {/* Status filter */}
        <div className="flex gap-2 mb-3">
          {(["open", "done", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                filter === f
                  ? "bg-foreground text-background border-foreground"
                  : "bg-white text-muted-foreground border-border hover:text-foreground"
              )}
            >
              {f === "open" ? "Offen" : f === "done" ? "Erledigt" : "Alle"} ({counts[f]})
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          <button
            onClick={() => setKategorie("alle")}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border",
              kategorie === "alle"
                ? "bg-foreground text-background border-foreground"
                : "bg-white text-muted-foreground border-border hover:text-foreground"
            )}
          >
            Alle Kategorien
          </button>
          {KATEGORIEN.map((k) => (
            <button
              key={k}
              onClick={() => setKategorie(k)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border border-transparent",
                KAT_COLOR[k],
                kategorie === k && "ring-2 ring-foreground ring-offset-1"
              )}
            >
              {k}
            </button>
          ))}
        </div>

        {/* States */}
        {isLoading && (
          <div className="rounded-xl border border-border bg-white p-6 text-sm text-muted-foreground">
            Lade To-Dos aus Notion…
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">Fehler beim Laden</p>
              <p className="text-xs text-red-600 mt-0.5">{(error as Error)?.message}</p>
            </div>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="rounded-xl border border-border bg-white shadow-widget overflow-hidden">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6 text-center">Keine To-Dos in dieser Auswahl.</p>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((t) => {
                  const days = daysUntil(t.date);
                  const isOverdue = !t.completed && days !== null && days < 0;
                  const isToday = days === 0;
                  return (
                    <li key={t.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <button
                        type="button"
                        aria-label={t.completed ? "Als offen markieren" : "Als erledigt markieren"}
                        disabled={toggle.isPending}
                        onClick={() => toggle.mutate({ id: t.id, completed: !t.completed })}
                        className={cn(
                          "mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                          t.completed
                            ? "bg-primary border-primary text-background"
                            : "border-slate-400 bg-white hover:border-primary hover:bg-primary/10"
                        )}
                      >
                        {t.completed && <Check className="h-3 w-3" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm leading-tight",
                          t.completed ? "text-muted-foreground line-through" : "text-foreground"
                        )}>
                          {t.name}
                        </p>
                        {t.date && (
                          <p className={cn(
                            "text-[11px] mt-0.5",
                            isOverdue && "text-red-500 font-medium",
                            isToday && "text-primary font-medium",
                            !isOverdue && !isToday && "text-muted-foreground"
                          )}>
                            {isOverdue
                              ? `${Math.abs(days!)} Tag(e) überfällig`
                              : isToday
                              ? "Heute"
                              : format(parseISO(t.date), "EEE, dd. MMM yyyy", { locale: de })}
                          </p>
                        )}
                      </div>
                      {t.kategorie && (
                        <span className={cn("text-[10px] rounded px-1.5 py-0.5 shrink-0", KAT_COLOR[t.kategorie])}>
                          {t.kategorie}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/todos")({ component: TodosPage });
