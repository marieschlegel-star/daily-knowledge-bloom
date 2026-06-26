
import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { getFachColors } from "@/lib/utils";
import type { Fach, TodoKategorie } from "@/lib/types";

const ALL_FAECHER: Fach[] = ["ZPO", "ZivR", "ZPO III", "StrafR", "StPO", "VwR", "VwGO"];
const ALL_KATEGORIEN: TodoKategorie[] = ["Lernen", "KK", "AssK", "AG"];

type CreateType = "lerneinheit" | "todo" | "termin";

export type QuickCreatePayload =
  | {
      type: "lerneinheit" | "termin";
      title: string;
      slotDate: Date;
      subject: Fach;
      duration: number;
    }
  | {
      type: "todo";
      name: string;
      slotDate: Date;
      allDay: boolean;
      kategorie: TodoKategorie;
    };

export interface QuickCreatePrefill {
  type?: CreateType;
  subject?: Fach;
  title?: string;
}

interface QuickCreateModalProps {
  date: Date;
  allDay: boolean;
  calendarView?: string;
  prefill?: QuickCreatePrefill;
  onClose: () => void;
  onCreate: (payload: QuickCreatePayload) => Promise<{ ok: boolean; error?: string }>;
}

function suggestedType(allDay: boolean, view?: string): CreateType {
  if (allDay || view === "dayGridMonth") return "todo";
  return "lerneinheit";
}

const TYPE_HINTS: Record<CreateType, string> = {
  lerneinheit: "Lernblock im Kalender einplanen",
  todo: "Aufgabe mit Fälligkeitsdatum",
  termin: "Termin (1 h) im Kalender",
};

function applyTime(base: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const next = new Date(base);
  next.setHours(h, m, 0, 0);
  return next;
}

export function QuickCreateModal({ date, allDay, calendarView, prefill, onClose, onCreate }: QuickCreateModalProps) {
  const [type, setType] = useState<CreateType>(() => prefill?.type ?? suggestedType(allDay, calendarView));
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [fach, setFach] = useState<Fach>(prefill?.subject ?? "ZPO");
  const [duration, setDuration] = useState(1);
  const [kategorie, setKategorie] = useState<TodoKategorie>("Lernen");
  const [time, setTime] = useState(format(date, "HH:mm"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const slotDate = allDay ? date : applyTime(date, time);

  useEffect(() => {
    inputRef.current?.focus();
  }, [type]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const dateLabel = allDay
    ? format(slotDate, "eeee, d. MMMM", { locale: de })
    : format(slotDate, "eeee, d. MMMM · HH:mm 'Uhr'", { locale: de });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);

    const payload: QuickCreatePayload =
      type === "todo"
        ? { type: "todo", name: title.trim(), slotDate, allDay, kategorie }
        : {
            type,
            title: title.trim(),
            slotDate,
            subject: fach,
            duration: type === "termin" ? 1 : duration,
          };

    try {
      const result = await onCreate(payload);
      if (!result.ok) {
        setError(result.error ?? "Erstellen fehlgeschlagen. Bitte erneut versuchen.");
        return;
      }
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" onClick={onClose} />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-[340px] border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">{dateLabel}</p>
            <p className="text-[10px] text-muted-foreground/80 mt-0.5">{TYPE_HINTS[type]}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="px-4 mb-3 mt-2">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-0.5">
            {(["lerneinheit", "todo", "termin"] as CreateType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setError(null); }}
                className={`flex-1 text-[11px] font-medium py-1.5 rounded-lg transition-all ${
                  type === t
                    ? "bg-white shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "lerneinheit" ? "Lerneinheit" : t === "todo" ? "To-Do" : "Termin"}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3">
          {error && (
            <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === "lerneinheit" ? "Thema / Stoff..."
              : type === "todo" ? "Aufgabe..."
              : "Titel des Termins..."
            }
            className="w-full text-sm px-3 py-2.5 rounded-xl border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />

          {!allDay && type !== "todo" && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground shrink-0">Uhrzeit:</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                step={300}
                className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-border bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}

          {(type === "lerneinheit" || type === "termin") && (
            <div className="flex flex-wrap gap-1">
              {ALL_FAECHER.map((f) => {
                const colors = getFachColors(f);
                const active = fach === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFach(f)}
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium transition-all"
                    style={{
                      background: active ? colors.bg : "#F1F5F9",
                      color: active ? colors.text : "#94a3b8",
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          )}

          {type === "lerneinheit" && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground shrink-0">Dauer:</span>
              <div className="flex gap-1 flex-wrap">
                {[0.5, 1, 1.5, 2, 3].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`text-[10px] px-2 py-0.5 rounded-lg font-medium transition-all ${
                      duration === d
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-muted-foreground hover:bg-slate-200"
                    }`}
                  >
                    {d}h
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === "todo" && (
            <div className="flex gap-1 flex-wrap">
              {ALL_KATEGORIEN.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKategorie(k)}
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium transition-all ${
                    kategorie === k
                      ? "bg-violet-100 text-violet-700"
                      : "bg-slate-100 text-muted-foreground hover:bg-slate-200"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-all"
          >
            {loading ? "Wird erstellt..." : "Erstellen"}
          </button>
          <p className="text-[9px] text-center text-muted-foreground">Enter zum Erstellen · Esc zum Schließen</p>
        </form>
      </div>
    </div>
  );
}
