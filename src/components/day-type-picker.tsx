"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { TAGESTYP_CONFIG, type DayTyp } from "@/lib/types";
import { useDayStore } from "@/lib/day-store";

interface DayTypePickerProps {
  date: Date;
  onClose: () => void;
}

export function DayTypePicker({ date, onClose }: DayTypePickerProps) {
  const { dayTypes, setDayType, removeDayType } = useDayStore();
  const dateStr = format(date, "yyyy-MM-dd");
  const current = dayTypes[dateStr];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-border w-[300px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
          <div>
            <p className="text-xs font-semibold text-foreground">Tagestyp setzen</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {format(date, "eeee, d. MMMM yyyy", { locale: de })}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Type options */}
        <div className="p-3 space-y-1">
          {(Object.entries(TAGESTYP_CONFIG) as [DayTyp, typeof TAGESTYP_CONFIG[DayTyp]][]).map(
            ([typ, cfg]) => {
              const active = current === typ;
              return (
                <button
                  key={typ}
                  onClick={() => {
                    if (active) removeDayType(dateStr);
                    else setDayType(dateStr, typ);
                    onClose();
                  }}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl transition-all hover:bg-muted/60"
                  style={{ background: active ? cfg.bg : undefined }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{cfg.emoji}</span>
                    <div className="text-left">
                      <p className="text-xs font-medium text-foreground">{cfg.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Lernfaktor: {cfg.factor}
                        {cfg.factor === 0 ? " · kein Lerntag" : cfg.factor < 1 ? " · halber Tag" : " · voller Tag"}
                      </p>
                    </div>
                  </div>
                  {active && (
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                  )}
                </button>
              );
            }
          )}
        </div>

        {/* Reset */}
        {current && (
          <div className="px-3 pb-3">
            <button
              onClick={() => { removeDayType(dateStr); onClose(); }}
              className="w-full py-1.5 text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-muted/40 transition-all"
            >
              Tagestyp entfernen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
