import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useExamenStore } from "@/lib/examen-store";
import { StaatsexamenStats } from "@/components/staatsexamen-stats";

function StaatsexamenPage() {
  const { examDate, setExamDate } = useExamenStore();
  const [draft, setDraft] = useState(examDate ?? "");

  const save = () => {
    if (draft) setExamDate(draft);
  };

  const remove = () => {
    setExamDate(null);
    setDraft("");
  };

  return (
    <div className="min-h-screen bg-violet-50/30">
      <div className="max-w-md mx-auto px-6 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zurück zum Kalender
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-1">Staatsexamen</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Trage deinen Prüfungstermin ein und sieh, wie viele Lerntage noch bleiben.
        </p>

        <div className="rounded-xl border border-border bg-white shadow-widget p-4 mb-6 space-y-3">
          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Prüfungstermin
            </span>
            <input
              type="date"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="mt-1.5 w-full text-sm px-3 py-2.5 rounded-xl border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={!draft}
              className="flex-1 py-2 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-all"
            >
              Speichern
            </button>
            {examDate && (
              <button
                type="button"
                onClick={remove}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-xl border border-border text-muted-foreground hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Entfernen
              </button>
            )}
          </div>
        </div>

        {examDate ? (
          <div className="rounded-xl border border-border bg-white shadow-widget p-4">
            <StaatsexamenStats examDate={examDate} showDayTypeHint />
            <Link
              to="/"
              className="mt-4 block text-center text-[11px] font-medium text-primary hover:underline"
            >
              Tagestypen im Kalender setzen
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-white/60 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Noch kein Termin gesetzt. Wähle oben dein Staatsexamen-Datum.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/staatsexamen")({
  component: StaatsexamenPage,
});
