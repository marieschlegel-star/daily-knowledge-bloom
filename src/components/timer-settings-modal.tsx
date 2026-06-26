
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { TimerSettings } from "@/lib/timer-state";

interface TimerSettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: TimerSettings;
  onSave: (s: TimerSettings) => void;
}

export default function TimerSettingsModal({ open, onClose, settings, onSave }: TimerSettingsModalProps) {
  const [local, setLocal] = useState(settings);

  useEffect(() => {
    if (open) setLocal(settings);
  }, [open, settings]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-[320px] border border-border p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Timer-Einstellungen</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          <SliderField
            label="Fokuszeit"
            value={local.focusMinutes}
            min={5} max={60} step={5}
            unit="Min"
            onChange={(v) => setLocal({ ...local, focusMinutes: v })}
          />
          <SliderField
            label="Kurze Pause"
            value={local.shortBreakMinutes}
            min={1} max={15} step={1}
            unit="Min"
            onChange={(v) => setLocal({ ...local, shortBreakMinutes: v })}
          />
          <SliderField
            label="Lange Pause"
            value={local.longBreakMinutes}
            min={5} max={30} step={5}
            unit="Min"
            onChange={(v) => setLocal({ ...local, longBreakMinutes: v })}
          />

          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Auto-Start nächste Session</span>
            <button
              onClick={() => setLocal({ ...local, autoStart: !local.autoStart })}
              className={`relative w-10 h-5 rounded-full transition-colors ${local.autoStart ? "bg-violet-600" : "bg-slate-200"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${local.autoStart ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        <button
          onClick={() => { onSave(local); onClose(); }}
          className="w-full mt-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
        >
          Speichern
        </button>
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm text-muted-foreground">{label}</label>
        <span className="text-sm font-semibold text-foreground">{value} {unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: "#7c3aed" }}
      />
    </div>
  );
}
