
import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { FachChip } from "./fach-chip";
import { getFachColors } from "@/lib/utils";
import type { Klausur } from "@/lib/types";

interface KlausurPanelProps {
  klausur: Klausur;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export function KlausurPanel({ klausur, onClose, onDelete }: KlausurPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const colors = getFachColors(klausur.fach);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white border-l border-border shadow-panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FachChip fach={klausur.fach} />
          <span className="text-sm font-semibold text-foreground truncate">
            {klausur.title || "Ohne Titel"}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {confirmDelete ? (
            <div className="flex items-center gap-1.5 mr-1">
              <span className="text-[11px] text-red-600 font-medium">Löschen?</span>
              <button
                type="button"
                onClick={() => onDelete?.(klausur.id)}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Ja
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Nein
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              title="Klausur entfernen"
              className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div
          className="rounded-xl px-3 py-2.5 border"
          style={{ background: colors.bg, borderColor: colors.border }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: colors.text, opacity: 0.7 }}>
            Examensklausur
          </p>
          <p className="text-sm font-medium" style={{ color: colors.text }}>
            {klausur.title || "Ohne Titel"}
          </p>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground">
          {klausur.schreibDatum && (
            <p>
              Schreibtermin:{" "}
              <span className="text-foreground font-medium">
                {format(parseISO(klausur.schreibDatum), "EEEE, d. MMMM yyyy", { locale: de })}
              </span>
            </p>
          )}
          {klausur.ort && (
            <p>
              Ort: <span className="text-foreground font-medium">{klausur.ort}</span>
            </p>
          )}
          {klausur.status && (
            <p>
              Status: <span className="text-foreground font-medium">{klausur.status}</span>
            </p>
          )}
        </div>

        {onDelete && !confirmDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full py-2 text-xs font-medium rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            Klausur aus Kalender entfernen
          </button>
        )}
        {confirmDelete && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onDelete?.(klausur.id)}
              className="flex-1 py-2 text-xs font-semibold rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Endgültig entfernen
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-2 text-xs font-medium rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              Abbrechen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
