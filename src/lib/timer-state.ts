export type TimerType = "fokuszeit" | "pomodoro";

export const TIMER_STATE_KEY = "juris-timer-state";
export const TIMER_SETTINGS_KEY = "juris-timer-settings";
export const POMO_LOG_KEY = "juris-pomo-log";
export const CUSTOM_CATS_KEY = "juris-timer-custom-cats";

export interface TimerSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  autoStart: boolean;
}

export const DEFAULT_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  autoStart: false,
};

export interface PersistedTimerState {
  isRunning: boolean;
  startedAt: number;
  timerType: TimerType;
  initialSeconds: number;
  pausedElapsed: number;
  sessionStartedAt: number | null;
  focusMinutes: number;
  sessionId: string | null;
  subject: string | null;
  category: string | null;
  sonstigesMode: boolean;
  updatedAt: number;
}

export interface PomoLogEntry {
  id: string;
  start: string;
  end: string;
  durationMin: number;
  type: "Pomodoro" | "Other";
  sessionId: string | null;
  subject: string | null;
  category: string | null;
  title: string;
}

function safeLoad<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function loadTimerState(): PersistedTimerState | null {
  return safeLoad<PersistedTimerState>(TIMER_STATE_KEY);
}

export function saveTimerState(state: PersistedTimerState | null) {
  if (typeof window === "undefined") return;
  if (state) localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
  else localStorage.removeItem(TIMER_STATE_KEY);
}

export function loadSettings(): TimerSettings {
  return { ...DEFAULT_SETTINGS, ...(safeLoad<Partial<TimerSettings>>(TIMER_SETTINGS_KEY) ?? {}) };
}

export function saveSettings(s: TimerSettings) {
  if (typeof window !== "undefined") localStorage.setItem(TIMER_SETTINGS_KEY, JSON.stringify(s));
}

export function loadPomoLog(): PomoLogEntry[] {
  return safeLoad<PomoLogEntry[]>(POMO_LOG_KEY) ?? [];
}

export function appendPomoLog(entry: PomoLogEntry) {
  if (typeof window === "undefined") return;
  const log = loadPomoLog();
  log.unshift(entry);
  localStorage.setItem(POMO_LOG_KEY, JSON.stringify(log.slice(0, 200)));
}

export function loadCustomCats(): string[] {
  return safeLoad<string[]>(CUSTOM_CATS_KEY) ?? [];
}

export function saveCustomCats(cats: string[]) {
  if (typeof window !== "undefined") localStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(cats));
}

export function hasActiveSession(state: PersistedTimerState | null): boolean {
  return !!state && state.sessionStartedAt != null;
}

export function computeDisplaySeconds(state: PersistedTimerState): number {
  if (!state.isRunning) {
    if (state.timerType === "pomodoro") return state.initialSeconds;
    return state.pausedElapsed;
  }
  const segmentSec = Math.floor((Date.now() - state.startedAt) / 1000);
  if (state.timerType === "fokuszeit") {
    return state.pausedElapsed + segmentSec;
  }
  return Math.max(state.initialSeconds - segmentSec, 0);
}

export function computeElapsedMinutes(state: PersistedTimerState): number {
  const focus = state.focusMinutes;
  if (state.timerType === "fokuszeit") {
    if (state.isRunning) {
      const seg = Math.floor((Date.now() - state.startedAt) / 1000);
      return Math.round((state.pausedElapsed + seg) / 60);
    }
    return Math.round(state.pausedElapsed / 60);
  }
  const display = computeDisplaySeconds(state);
  const total = focus * 60;
  return Math.max(0, Math.round((total - display) / 60));
}
