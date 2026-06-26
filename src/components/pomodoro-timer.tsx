
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Play, Pause, Square, Settings, SkipForward, Plus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FachChip } from "./fach-chip";
import TimerSettingsModal from "./timer-settings-modal";
import {
  DEFAULT_SETTINGS,
  appendPomoLog,
  computeDisplaySeconds,
  computeElapsedMinutes,
  hasActiveSession,
  loadCustomCats,
  loadPomoLog,
  loadSettings,
  loadTimerState,
  saveCustomCats,
  saveSettings,
  saveTimerState,
  type PersistedTimerState,
  type TimerType,
} from "@/lib/timer-state";
import type { LernSession } from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────────────────────
function fmt2(n: number) { return String(n).padStart(2, "0"); }
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

const DEFAULT_OTHER_CATEGORIES = ["Freizeit", "Arbeit Skript", "Sport", "Sonstiges"];

// ─── Props ───────────────────────────────────────────────────────────
interface PomodoroTimerProps {
  /** Pre-selected session (from SessionPanel). Can be null on the /fokus page. */
  initialSession?: LernSession | null;
  /** All sessions for the task selector. */
  sessions?: LernSession[];
  onClose?: () => void;
  /** True = renders as full-page layout, false = panel overlay (default) */
  fullPage?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────
export function PomodoroTimer({
  initialSession = null,
  sessions = [],
  onClose,
  fullPage = false,
}: PomodoroTimerProps) {
  const [settings, setSettings]                 = useState(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings]         = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [showSonstigesMode, setShowSonstigesMode] = useState(false);
  const [selectedSession, setSelectedSession]   = useState<LernSession | null>(initialSession);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedFach, setSelectedFach]         = useState<string | null>(null);
  const [customCats, setCustomCats]             = useState<string[]>([]);
  const [newCatName, setNewCatName]             = useState("");

  const [timerType, setTimerType] = useState<TimerType>("pomodoro");
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [hasActive, setHasActive] = useState(false);
  const [, force] = useState(0);

  const stateRef = useRef<PersistedTimerState | null>(null);

  // ── Initial load ──────────────────────────────────────────────────
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    setCustomCats(loadCustomCats());
    const saved = loadTimerState();
    if (saved) {
      stateRef.current = saved;
      setTimerType(saved.timerType);
      setIsRunning(saved.isRunning);
      setHasActive(hasActiveSession(saved));
      setSecondsLeft(computeDisplaySeconds(saved));
      setShowSonstigesMode(saved.sonstigesMode);
      setSelectedCategory(saved.category);
    } else {
      setSecondsLeft(s.focusMinutes * 60);
    }
  }, []);

  // Bind session from saved state once sessions array arrives
  useEffect(() => {
    const saved = stateRef.current;
    if (saved?.sessionId && sessions.length > 0 && !selectedSession) {
      const found = sessions.find((s) => s.id === saved.sessionId);
      if (found) setSelectedSession(found);
    }
  }, [sessions, selectedSession]);

  // ── Tick ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const cur = stateRef.current;
      if (!cur || !cur.isRunning) return;
      const display = computeDisplaySeconds(cur);
      setSecondsLeft(Math.max(0, display));
      if (cur.timerType === "pomodoro" && display <= 0) finishSession(true);
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Browser tab title ─────────────────────────────────────────────
  useEffect(() => {
    if (isRunning) {
      const min = Math.floor(secondsLeft / 60);
      const sec = secondsLeft % 60;
      document.title = `${fmt2(min)}:${fmt2(sec)} · Fokus-Timer`;
    } else {
      document.title = "Juris – AI Study Planner";
    }
    return () => { document.title = "Juris – AI Study Planner"; };
  }, [isRunning, secondsLeft]);

  // ── Keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") { e.preventDefault(); toggleTimer(); }
      if (e.code === "KeyR")  { e.preventDefault(); resetTimer(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  // ── Persistence ───────────────────────────────────────────────────
  function persist(next: PersistedTimerState | null) {
    stateRef.current = next;
    saveTimerState(next);
    setHasActive(hasActiveSession(next));
    force((x) => x + 1);
  }

  function startTimer() {
    if (!isRunning && Notification.permission === "default") Notification.requestPermission();
    const now = Date.now();
    const existing = stateRef.current;
    const initial = timerType === "pomodoro" ? settings.focusMinutes * 60 : 0;
    const next: PersistedTimerState = {
      isRunning: true,
      startedAt: now,
      timerType,
      initialSeconds: existing?.timerType === timerType ? (existing.initialSeconds || initial) : initial,
      pausedElapsed: existing?.pausedElapsed ?? 0,
      sessionStartedAt: existing?.sessionStartedAt ?? now,
      focusMinutes: settings.focusMinutes,
      sessionId: selectedSession?.id ?? null,
      subject: selectedSession?.subject ?? null,
      category: selectedCategory,
      sonstigesMode: showSonstigesMode,
      updatedAt: now,
    };
    persist(next);
    setIsRunning(true);
  }

  function pauseTimer() {
    const cur = stateRef.current;
    if (!cur || !cur.isRunning) return;
    const now = Date.now();
    const segmentSec = Math.floor((now - cur.startedAt) / 1000);
    let pausedElapsed = cur.pausedElapsed;
    let initialSeconds = cur.initialSeconds;
    if (cur.timerType === "fokuszeit") pausedElapsed += segmentSec;
    else initialSeconds = Math.max(0, cur.initialSeconds - segmentSec);
    persist({ ...cur, isRunning: false, pausedElapsed, initialSeconds, updatedAt: now });
    setIsRunning(false);
    setSecondsLeft(cur.timerType === "fokuszeit" ? pausedElapsed : initialSeconds);
  }

  function toggleTimer() { if (isRunning) pauseTimer(); else startTimer(); }

  function resetTimer() {
    persist(null);
    setIsRunning(false);
    setSecondsLeft(timerType === "pomodoro" ? settings.focusMinutes * 60 : 0);
  }

  function finishSession(auto = false) {
    const cur = stateRef.current;
    if (!cur || !hasActiveSession(cur)) { resetTimer(); return; }
    const minutes = computeElapsedMinutes(cur);
    if (minutes < 1) { resetTimer(); return; }
    const title = cur.sonstigesMode
      ? cur.category || "Sonstiges"
      : selectedSession
        ? `${selectedSession.subject} – ${selectedSession.title}`
        : "Lern-Session";
    appendPomoLog({
      id: `${Date.now()}`,
      start: new Date(cur.sessionStartedAt ?? Date.now()).toISOString(),
      end: new Date().toISOString(),
      durationMin: minutes,
      type: cur.sonstigesMode ? "Other" : "Pomodoro",
      sessionId: cur.sessionId,
      subject: cur.subject,
      category: cur.category,
      title,
    });
    if (Notification.permission === "granted") {
      new Notification("Timer beendet", {
        body: auto
          ? `Pomodoro fertig! ${minutes} Min erfasst 🍅`
          : `${minutes} Minuten gespeichert`,
      });
    }
    resetTimer();
  }

  function changeTimerType(t: TimerType) {
    if (hasActive) return;
    setTimerType(t);
    setSecondsLeft(t === "pomodoro" ? settings.focusMinutes * 60 : 0);
  }

  function applySettings(s: typeof settings) {
    setSettings(s);
    saveSettings(s);
    if (!hasActive && timerType === "pomodoro") setSecondsLeft(s.focusMinutes * 60);
  }

  function addCustomCat() {
    const name = newCatName.trim();
    if (!name) return;
    const all = [...DEFAULT_OTHER_CATEGORIES, ...customCats];
    if (all.includes(name)) return;
    const updated = [...customCats, name];
    setCustomCats(updated);
    saveCustomCats(updated);
    setNewCatName("");
    setSelectedCategory(name);
  }

  function removeCustomCat(c: string) {
    const updated = customCats.filter((x) => x !== c);
    setCustomCats(updated);
    saveCustomCats(updated);
    if (selectedCategory === c) setSelectedCategory(null);
  }

  // ── Display values ────────────────────────────────────────────────
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const total = timerType === "pomodoro" ? settings.focusMinutes * 60 : Math.max(3600, secondsLeft + 1);
  const pct = timerType === "pomodoro"
    ? Math.max(0, Math.min(1, 1 - secondsLeft / total))
    : (secondsLeft % 3600) / 3600;

  const R = 100;
  const CIRC = 2 * Math.PI * R;
  const dashOffset = CIRC * (1 - pct);

  const subjects = useMemo(() => Array.from(new Set(sessions.map((s) => s.subject))), [sessions]);
  const filteredSessions = useMemo(() =>
    (selectedFach ? sessions.filter((s) => s.subject === selectedFach) : sessions)
      .filter((s) => !s.completed),
    [sessions, selectedFach]
  );

  const allCategories = [...DEFAULT_OTHER_CATEGORIES, ...customCats];

  const todayMin = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return loadPomoLog()
      .filter((p) => p.end.slice(0, 10) === today)
      .reduce((acc, p) => acc + p.durationMin, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActive, isRunning]);

  const currentLabel = showSonstigesMode
    ? selectedCategory || "Kategorie wählen"
    : selectedSession
      ? `${selectedSession.subject} – ${selectedSession.title}`
      : "Aufgabe wählen";

  const accent = "#7c3aed";

  // ── Layout ────────────────────────────────────────────────────────
  const inner = (
    <div className={cn("flex flex-col", fullPage ? "max-w-md mx-auto w-full py-8 px-5" : "flex-1 overflow-y-auto px-4 py-4")}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{getGreeting()}</p>
          <h1 className={cn("font-semibold text-foreground mt-0.5", fullPage ? "text-3xl" : "text-xl")}>Fokus-Timer</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Heute: {todayMin} Min</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          disabled={hasActive}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
          title={hasActive ? "Erst stoppen" : "Einstellungen"}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Task selector */}
      <button
        onClick={() => setShowTaskSelector((v) => !v)}
        className="w-full bg-muted/40 rounded-2xl p-3.5 mb-3 border border-border flex items-center justify-between text-left hover:bg-muted/60 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Aktuelle Aufgabe</p>
          <p className="text-sm font-medium text-foreground truncate">{currentLabel}</p>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-muted-foreground shrink-0 ml-2 transition-transform", showTaskSelector && "rotate-90")} />
      </button>

      {showTaskSelector && (
        <div className="bg-background rounded-2xl p-3.5 mb-3 border border-border space-y-3">
          {/* Lernen / Sonstiges switch */}
          <div className="flex w-full bg-muted rounded-full p-0.5">
            <button
              onClick={() => setShowSonstigesMode(false)}
              className={cn("flex-1 py-1.5 rounded-full text-[11px] font-medium transition-all", !showSonstigesMode ? "bg-white shadow text-foreground" : "text-muted-foreground")}
            >Lernen</button>
            <button
              onClick={() => setShowSonstigesMode(true)}
              className={cn("flex-1 py-1.5 rounded-full text-[11px] font-medium transition-all", showSonstigesMode ? "bg-white shadow text-foreground" : "text-muted-foreground")}
            >Sonstiges</button>
          </div>

          {!showSonstigesMode ? (
            <>
              {/* Fach filter */}
              <div className="flex flex-wrap gap-1.5">
                {subjects.map((s) => (
                  <button key={s}
                    onClick={() => { setSelectedFach(selectedFach === s ? null : s); setSelectedSession(null); }}
                    className={cn("py-1 px-2.5 rounded-lg text-[11px] font-medium transition-all border",
                      selectedFach === s ? "bg-violet-600 text-white border-violet-600" : "bg-background text-foreground border-border hover:border-violet-400"
                    )}
                  >{s}</button>
                ))}
              </div>
              {/* Session list */}
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {filteredSessions.slice(0, 50).map((t) => (
                  <button key={t.id}
                    onClick={() => { setSelectedSession(t); setShowTaskSelector(false); }}
                    className={cn("w-full flex items-center justify-between text-left px-3 py-2 rounded-xl text-[12px] transition-all",
                      selectedSession?.id === t.id ? "bg-violet-50 text-violet-700 font-medium" : "hover:bg-muted text-foreground"
                    )}
                  >
                    <span className="truncate">{t.title}</span>
                    <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{t.subject}</span>
                  </button>
                ))}
                {filteredSessions.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Keine Lerneinheiten</p>
                )}
              </div>
            </>
          ) : (
            <div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {allCategories.map((cat) => (
                  <button key={cat}
                    onClick={() => { setSelectedCategory(cat); setShowTaskSelector(false); }}
                    className={cn("relative py-1 px-2.5 rounded-lg text-[11px] font-medium transition-all border",
                      selectedCategory === cat ? "bg-violet-600 text-white border-violet-600" : "bg-background text-foreground border-border hover:border-violet-400"
                    )}
                  >
                    {cat}
                    {customCats.includes(cat) && (
                      <span
                        onClick={(e) => { e.stopPropagation(); removeCustomCat(cat); }}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive rounded-full flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomCat()}
                  placeholder="Neue Kategorie…"
                  className="flex-1 bg-muted rounded-xl px-3 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
                <button onClick={addCustomCat}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-violet-600 text-white">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode switch: Fokuszeit / Pomodoro */}
      <div className="flex w-full bg-muted rounded-full p-0.5 mb-5">
        <button
          onClick={() => changeTimerType("fokuszeit")}
          disabled={hasActive}
          className={cn("flex-1 py-2 rounded-full text-[11px] font-medium transition-all disabled:opacity-40",
            timerType === "fokuszeit" ? "bg-white shadow text-foreground" : "text-muted-foreground"
          )}
        >Fokuszeit</button>
        <button
          onClick={() => changeTimerType("pomodoro")}
          disabled={hasActive}
          className={cn("flex-1 py-2 rounded-full text-[11px] font-medium transition-all disabled:opacity-40",
            timerType === "pomodoro" ? "bg-white shadow text-foreground" : "text-muted-foreground"
          )}
        >Pomodoro</button>
      </div>

      {/* Ring timer */}
      <div className="flex flex-col items-center mb-5">
        <div className="relative" style={{ width: 240, height: 240 }}>
          <svg width={240} height={240} viewBox="0 0 240 240" className="-rotate-90">
            {/* Track */}
            <circle cx={120} cy={120} r={R} fill="none" stroke="#e2e8f0" strokeWidth={10} />
            {/* Fill */}
            <circle
              cx={120} cy={120} r={R} fill="none"
              stroke={accent} strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              style={{ transition: isRunning ? "stroke-dashoffset 1s linear" : "stroke-dashoffset 0.3s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-black tabular-nums tracking-tight leading-none" style={{ color: accent }}>
              {fmt2(minutes)}:{fmt2(seconds)}
            </span>
            <span className="text-[11px] font-semibold text-violet-600 mt-1">
              {timerType === "pomodoro" ? "Pomodoro" : "Fokuszeit"}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mb-6">
        {/* Play/Pause */}
        <button
          onClick={toggleTimer}
          className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
          style={{ background: accent }}
          title={isRunning ? "Pause (Space)" : "Starten (Space)"}
        >
          {isRunning
            ? <Pause className="h-9 w-9 text-white" fill="white" />
            : <Play  className="h-9 w-9 text-white ml-1" fill="white" />
          }
        </button>
        {/* Stop & save */}
        <button
          onClick={() => finishSession(false)}
          disabled={!hasActive}
          title="Stoppen & Zeit speichern"
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-muted border border-border hover:bg-muted/80 disabled:opacity-30 active:scale-95 transition-all"
        >
          <Square className="h-5 w-5 text-foreground" />
        </button>
      </div>

      {/* Keyboard hint */}
      <div className="flex justify-center gap-4">
        <Hint k="Space" label="Play/Pause" />
        <Hint k="R" label="Reset" />
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-violet-50/30 flex items-start justify-center">
        {inner}
        <TimerSettingsModal open={showSettings} onClose={() => setShowSettings(false)} settings={settings} onSave={applySettings} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-violet-50/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {initialSession && <FachChip fach={initialSession.subject} />}
          <span className="text-sm font-semibold text-foreground truncate">
            {initialSession ? initialSession.title : "Fokus-Timer"}
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {inner}
      <TimerSettingsModal open={showSettings} onClose={() => setShowSettings(false)} settings={settings} onSave={applySettings} />
    </div>
  );
}

function Hint({ k, label }: { k: string; label: string }) {
  return (
    <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
      <kbd className="px-1.5 py-0.5 rounded border border-muted-foreground/30 bg-white/80 font-mono text-[9px]">{k}</kbd>
      <span>{label}</span>
    </div>
  );
}
