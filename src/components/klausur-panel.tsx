
import { X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { FachChip } from "./fach-chip";
import { getFachColors } from "@/lib/utils";
import type { Klausur } from "@/lib/types";

interface KlausurPanelProps {
  klausur: Klausur;
  onClose: () => void;
}

export function KlausurPanel({ klausur, onClose }: KlausurPanelProps) {
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
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors shrink-0">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
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
      </div>
    </div>
  );
}
