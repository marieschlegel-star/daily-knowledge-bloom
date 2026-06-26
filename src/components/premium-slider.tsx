
import { useState, useRef, useCallback, useEffect } from "react";

// ─── Utils ──────────────────────────────────────────────────────────
const STEP_COARSE = 15 / 60; // 0.25h = 15 min
const STEP_FINE   =  5 / 60; // ~0.083h = 5 min

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function snapTo(v: number, step: number, max: number) {
  return clamp(Math.round(v / step) * step, 0, max);
}
function toHM(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return { h, m };
}
function fmtHM(hours: number) {
  const { h, m } = toHM(hours);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Props ──────────────────────────────────────────────────────────
interface PremiumSliderProps {
  label: string;
  value: number;   // hours (e.g. 7.25 = 7h 15min)
  max: number;     // max hours
  color: string;   // accent hex
  onChange: (v: number) => void;
  onReset?: () => void;
}

// ─── Component ──────────────────────────────────────────────────────
export function PremiumSlider({ label, value, max, color, onChange, onReset }: PremiumSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging]   = useState(false);
  const [tooltipX, setTooltipX]   = useState(0);
  const [editing, setEditing]     = useState(false);
  const [inputH,  setInputH]      = useState("");
  const [inputM,  setInputM]      = useState("");
  const hInputRef = useRef<HTMLInputElement>(null);

  const pct = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
  const { h: curH, m: curM } = toHM(value);

  // ── Sync text inputs when value changes externally ──────────────
  useEffect(() => {
    if (!editing) {
      setInputH(String(Math.floor(value)));
      setInputM(String(Math.round((value % 1) * 60)));
    }
  }, [value, editing]);

  // ── clientX → snapped value ────────────────────────────────────
  const clientXToValue = useCallback(
    (clientX: number, fine: boolean) => {
      const track = trackRef.current;
      if (!track) return value;
      const rect  = track.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      return snapTo(ratio * max, fine ? STEP_FINE : STEP_COARSE, max);
    },
    [max, value]
  );

  const updateTooltip = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    setTooltipX(clamp(clientX - rect.left, 0, rect.width));
  }, []);

  // ── Mouse drag ─────────────────────────────────────────────────
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      onChange(clientXToValue(e.clientX, e.shiftKey));
      updateTooltip(e.clientX);
    };
    const onUp = () => setDragging(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    };
  }, [dragging, clientXToValue, onChange, updateTooltip]);

  // ── Touch drag (non-passive to allow preventDefault) ───────────
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      onChange(clientXToValue(e.touches[0].clientX, false));
      updateTooltip(e.touches[0].clientX);
    };
    track.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => track.removeEventListener("touchmove", onTouchMove);
  }, [clientXToValue, onChange, updateTooltip]);

  const onTrackDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    onChange(clientXToValue(e.clientX, e.shiftKey));
    updateTooltip(e.clientX);
  };
  const onTouchStart = (e: React.TouchEvent) => {
    setDragging(true);
    onChange(clientXToValue(e.touches[0].clientX, false));
    updateTooltip(e.touches[0].clientX);
  };
  const onTouchEnd = () => setDragging(false);

  // ── Mouse wheel ────────────────────────────────────────────────
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const step = e.shiftKey ? STEP_FINE : STEP_COARSE;
    onChange(snapTo(value + (e.deltaY < 0 ? 1 : -1) * step, step, max));
  };

  // ── Arrow keys ─────────────────────────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? STEP_FINE : STEP_COARSE;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(snapTo(value + step, step, max));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(snapTo(value - step, step, max));
    }
  };

  const adjust = (delta: number) =>
    onChange(snapTo(value + delta, Math.abs(delta), max));

  // ── Direct input ───────────────────────────────────────────────
  const openEdit = () => {
    setEditing(true);
    setInputH(String(curH));
    setInputM(String(curM));
    setTimeout(() => hInputRef.current?.select(), 10);
  };
  const commitEdit = () => {
    setEditing(false);
    const hv = clamp(parseInt(inputH) || 0, 0, 999);
    const mv = clamp(parseInt(inputM) || 0, 0, 59);
    onChange(snapTo(hv + mv / 60, STEP_FINE, max));
  };

  // ── Tick marks ─────────────────────────────────────────────────
  const ticks: { pct: number; major: boolean }[] = [];
  for (let t = 0; t <= max; t += STEP_COARSE) {
    const roundT = Math.round(t * 100) / 100;
    ticks.push({ pct: (roundT / max) * 100, major: roundT % 1 === 0 });
  }

  // Hour-scale labels every 4h
  const scaleLabels: { h: number; pct: number }[] = [];
  const interval = max <= 16 ? 2 : 4;
  for (let t = 0; t <= max; t += interval) {
    scaleLabels.push({ h: t, pct: (t / max) * 100 });
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {/* Label + value + reset */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-foreground tracking-wide">{label}</span>

        <div className="flex items-center gap-1.5">
          {editing ? (
            <div className="flex items-center gap-0.5">
              <input
                ref={hInputRef}
                type="number" min={0} max={99}
                value={inputH}
                onChange={e => setInputH(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => e.key === "Enter" && commitEdit()}
                className="w-9 text-[11px] text-center font-semibold border border-primary/60 rounded-lg py-0.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
              <span className="text-[10px] text-muted-foreground">h</span>
              <input
                type="number" min={0} max={59} step={5}
                value={inputM}
                onChange={e => setInputM(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => e.key === "Enter" && commitEdit()}
                className="w-9 text-[11px] text-center font-semibold border border-primary/60 rounded-lg py-0.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
              <span className="text-[10px] text-muted-foreground">min</span>
            </div>
          ) : (
            <button
              onClick={openEdit}
              className="text-[12px] font-bold text-foreground hover:text-primary transition-colors tabular-nums group flex items-center gap-1"
              title="Klicken zum Bearbeiten"
            >
              {fmtHM(value)}
              <span className="text-[9px] text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
            </button>
          )}

          {onReset && (
            <button
              onClick={onReset}
              title="Zurücksetzen"
              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-100 text-[11px] text-muted-foreground hover:text-foreground transition-all"
            >
              ↺
            </button>
          )}
        </div>
      </div>

      {/* Slider area */}
      <div className="relative">
        {/* Floating tooltip */}
        {dragging && (
          <div
            className="absolute -top-8 z-20 pointer-events-none"
            style={{ left: tooltipX, transform: "translateX(-50%)" }}
          >
            <div
              className="text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap"
              style={{ background: color }}
            >
              {fmtHM(value)}
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                style={{ borderTopColor: color }}
              />
            </div>
          </div>
        )}

        {/* Track */}
        <div
          ref={trackRef}
          className="relative h-10 flex items-center cursor-pointer select-none outline-none focus:outline-none"
          onMouseDown={onTrackDown}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onWheel={onWheel}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={label}
        >
          {/* Track background */}
          <div className="absolute inset-x-0 h-2 rounded-full shadow-inner"
            style={{ background: "linear-gradient(0deg, #e8edf4, #f1f5f9)" }}>
            {/* Fill */}
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${color}55 0%, ${color}bb 60%, ${color} 100%)`,
                boxShadow: `0 0 8px ${color}40, 0 1px 2px ${color}30`,
                transition: dragging ? "none" : "width 0.15s ease-out",
              }}
            />
          </div>

          {/* Tick marks */}
          <div className="absolute inset-x-0 top-[calc(50%+8px)] pointer-events-none">
            {ticks.map((tick, i) => (
              <div
                key={i}
                className="absolute -translate-x-1/2"
                style={{ left: `${tick.pct}%` }}
              >
                <div
                  className="w-px mx-auto"
                  style={{
                    height: tick.major ? 6 : 3,
                    background: tick.major ? "#94a3b8" : "#cbd5e1",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Thumb */}
          <div
            className="absolute top-1/2 z-10"
            style={{
              left: `${pct}%`,
              transform: "translateX(-50%) translateY(-50%)",
              transition: dragging ? "none" : "left 0.15s ease-out",
            }}
          >
            {/* 32×32 hitbox */}
            <div className="w-8 h-8 flex items-center justify-center">
              <div
                className="rounded-full border-[2.5px] border-white"
                style={{
                  width:  dragging ? 18 : 14,
                  height: dragging ? 18 : 14,
                  background: color,
                  boxShadow: dragging
                    ? `0 0 0 5px ${color}25, 0 4px 12px ${color}50, 0 2px 4px rgba(0,0,0,0.15)`
                    : `0 2px 6px rgba(0,0,0,0.18), 0 0 0 0px ${color}00`,
                  transition: "all 0.15s ease-out",
                }}
              />
            </div>
          </div>
        </div>

        {/* Hour scale */}
        <div className="relative h-4 pointer-events-none">
          {scaleLabels.map((lbl, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 text-[9px] text-slate-400 tabular-nums"
              style={{ left: `${lbl.pct}%` }}
            >
              {lbl.h}h
            </span>
          ))}
        </div>
      </div>

      {/* Adjust buttons */}
      <div className="flex justify-between">
        <div className="flex gap-1">
          <AdjBtn label="−15m" onClick={() => adjust(-15 / 60)} color={color} />
          <AdjBtn label="−5m"  onClick={() => adjust(-5  / 60)} color={color} />
        </div>
        <div className="flex gap-1">
          <AdjBtn label="+5m"  onClick={() => adjust( 5  / 60)} color={color} />
          <AdjBtn label="+15m" onClick={() => adjust(15  / 60)} color={color} />
        </div>
      </div>
    </div>
  );
}

function AdjBtn({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-border bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 active:scale-95 transition-all shadow-sm"
    >
      {label}
    </button>
  );
}
