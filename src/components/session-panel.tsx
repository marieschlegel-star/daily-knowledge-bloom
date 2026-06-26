"use client";

import { useState } from "react";
import { X, Brain, HelpCircle, List, CreditCard, PenLine, Calendar, ExternalLink, FileText, Loader2, Trash2, Timer } from "lucide-react";
import { PomodoroTimer } from "./pomodoro-timer";
import { cn, daysUntil, countdownLabel, getFachColors, formatDuration, priorityDot } from "@/lib/utils";
import { FachChip } from "./fach-chip";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { LernSession, Klausur, PomodoroSession, AIMessage, AIAction, PlanStatus } from "@/lib/types";
import { PLAN_STATUS_CONFIG } from "@/lib/types";
import { useLernblockStore } from "@/lib/lernblock-store";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useAppStore } from "@/lib/store";

interface SessionPanelProps {
  session: LernSession;
  klausuren: Klausur[];
  pomodoros: PomodoroSession[];
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  "Skript geschrieben": "Skript",
  Hemmer: "Hemmer",
  Ankis: "Ankis",
  AG: "AG",
  offen: "offen",
};

const AI_BUTTONS: { action: AIAction; label: string; icon: React.ReactNode; warning?: string }[] = [
  { action: "erklaeren", label: "Thema erklären", icon: <Brain className="h-3.5 w-3.5" /> },
  { action: "testen", label: "Verständnis testen", icon: <HelpCircle className="h-3.5 w-3.5" /> },
  { action: "lernfragen", label: "Lernfragen", icon: <List className="h-3.5 w-3.5" /> },
  { action: "karteikarten", label: "Karteikarten", icon: <CreditCard className="h-3.5 w-3.5" /> },
  {
    action: "klausur",
    label: "Klausur simulieren",
    icon: <PenLine className="h-3.5 w-3.5" />,
    warning: "2.000 Tokens – etwas mehr KI-Aufwand",
  },
  { action: "optimieren", label: "Plan optimieren", icon: <Calendar className="h-3.5 w-3.5" /> },
];

export function SessionPanel({ session, klausuren, pomodoros, onClose, onDelete }: SessionPanelProps) {
  const { aiCallCount, incrementAiCallCount } = useAppStore();
  const { meta, setMeta } = useLernblockStore();
  const lbMeta = meta[session.id] ?? {};

  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState<AIAction | null>(null);
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPomodoro, setShowPomodoro]   = useState(false);

  const linkedKlausuren = klausuren.filter((k) => session.klausurenIds.includes(k.id));
  const sessionPomodoros = pomodoros.filter((p) => session.pomodoroIds.includes(p.id));
  const pomodoroMinutes = sessionPomodoros.reduce((acc, p) => acc + p.dauerMin, 0);

  const completedStatuses = session.status.filter((s) => s !== "offen");
  const totalStatuses = ["Skript geschrieben", "Hemmer", "Ankis", "AG"];
  const progress = Math.round((completedStatuses.length / totalStatuses.length) * 100);

  const colors = getFachColors(session.subject);

  async function callAI(action: AIAction) {
    if (loading) return;

    const context = {
      fach: session.subject,
      thema: session.title,
      klausurdatum: linkedKlausuren[0]?.schreibDatum ?? null,
      tagesBisKlausur: daysUntil(linkedKlausuren[0]?.schreibDatum ?? null),
      lernstand: session.status,
      wiederholungen: session.wiederholungen,
      examensrelevanz: session.examensrelevanz,
      pomodoroMinuten: pomodoroMinutes,
    };

    setLoading(action);
    setActiveAction(action);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, context, messages }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      incrementAiCallCount();
      setMessages((prev) => [
        ...prev,
        { role: "user", content: data.userMessage },
        { role: "assistant", content: data.message },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Fehler: ${err.message}` },
      ]);
    } finally {
      setLoading(null);
    }
  }

  if (showPomodoro) {
    return <PomodoroTimer initialSession={session} sessions={[session]} onClose={() => setShowPomodoro(false)} />;
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white border-l border-border shadow-panel overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FachChip fach={session.subject} />
          <span className="text-sm font-semibold text-foreground truncate">{session.title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {confirmDelete ? (
            <div className="flex items-center gap-1.5 mr-1">
              <span className="text-[11px] text-red-600 font-medium">Löschen?</span>
              <button
                onClick={() => { onDelete?.(session.id); onClose(); }}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Ja
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Nein
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowPomodoro(true)}
                title="Pomodoro-Timer starten"
                className="p-1 rounded hover:bg-violet-50 text-muted-foreground hover:text-violet-600 transition-colors"
              >
                <Timer className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                title="Lerneinheit löschen"
                className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Meta row */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {session.date && (
              <span className="flex items-center gap-1">
                📅 {format(parseISO(session.date), "EEE, dd. MMM HH:mm", { locale: de })}
              </span>
            )}
            <span className="flex items-center gap-1">
              ⏱ {formatDuration(session.duration)} geplant
            </span>
            <span className="flex items-center gap-1">
              <span className={cn("w-2 h-2 rounded-full", priorityDot(session.priority))} />
              {session.priority}
            </span>
          </div>

          {/* Stats row */}
          <div className="mt-2 flex gap-3">
            <StatBadge label="Wieder­holungen" value={session.wiederholungen} />
            <StatBadge
              label="Examens­rel."
              value={session.examensrelevanz[0] ? `${session.examensrelevanz[0]}/5` : "–"}
            />
            <StatBadge label="Pomodoros" value={sessionPomodoros.length} />
          </div>

          {/* Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">Lernfortschritt</span>
              <span className="text-[10px] font-medium text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </div>

        {/* ── Planungsstatus + Zusatzfelder ──────────────────── */}
        <div className="px-4 py-3 border-b border-border space-y-3">
          {/* PlanStatus */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Planungsstatus
            </p>
            <div className="flex gap-1.5">
              {(["geplant", "begonnen", "erledigt"] as PlanStatus[]).map((s) => {
                const cfg = PLAN_STATUS_CONFIG[s];
                const active = (lbMeta.planStatus ?? "geplant") === s;
                return (
                  <button
                    key={s}
                    onClick={() => setMeta(session.id, { planStatus: s })}
                    className={cn(
                      "flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border font-medium transition-all",
                      active ? "border-transparent" : "border-border text-muted-foreground bg-transparent hover:bg-muted"
                    )}
                    style={active ? { background: cfg.bg, color: cfg.color, borderColor: cfg.color + "40" } : {}}
                  >
                    <span>{cfg.emoji}</span>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unterthema */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Unterthema
            </label>
            <input
              type="text"
              value={lbMeta.unterthema ?? ""}
              onChange={(e) => setMeta(session.id, { unterthema: e.target.value })}
              placeholder="z. B. §§ 823 ff. BGB, Deliktsrecht…"
              className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Lernziel */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Lernziel
            </label>
            <input
              type="text"
              value={lbMeta.lernziel ?? ""}
              onChange={(e) => setMeta(session.id, { lernziel: e.target.value })}
              placeholder="Was soll ich heute können?"
              className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Notizen */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Notizen
            </label>
            <textarea
              value={lbMeta.notizen ?? ""}
              onChange={(e) => setMeta(session.id, { notizen: e.target.value })}
              placeholder="Wichtige Hinweise, Probleme, Gedanken…"
              rows={3}
              className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all resize-none"
            />
          </div>
        </div>

        {/* Linked Klausuren */}
        {linkedKlausuren.length > 0 && (
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Verknüpfte Klausur
            </p>
            {linkedKlausuren.map((k) => {
              const days = daysUntil(k.schreibDatum);
              const countdown = countdownLabel(days);
              const kColors = getFachColors(k.fach);
              return (
                <div
                  key={k.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 gap-2"
                  style={{ background: kColors.bg }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: kColors.text }}>
                      {k.title}
                    </p>
                    <p className="text-[10px]" style={{ color: kColors.text, opacity: 0.7 }}>
                      {k.ort} · {k.schreibDatum ? format(parseISO(k.schreibDatum), "dd. MMM", { locale: de }) : "–"}
                    </p>
                  </div>
                  <span className={cn("text-[10px] font-semibold shrink-0", countdown.color)}>
                    {countdown.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Status */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Status
          </p>
          <div className="flex flex-wrap gap-1.5">
            {totalStatuses.map((s) => {
              const active = session.status.includes(s as any);
              return (
                <span
                  key={s}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                    active
                      ? "border-primary/30 text-primary bg-primary/10"
                      : "border-border text-muted-foreground bg-transparent"
                  )}
                >
                  {active ? "✓ " : ""}{STATUS_LABELS[s] ?? s}
                </span>
              );
            })}
          </div>
        </div>

        {/* AI Assistant */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              KI-Assistent · {session.subject}
            </p>
            {process.env.NODE_ENV === "development" && (
              <span className="text-[9px] text-muted-foreground">Calls: {aiCallCount}</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {AI_BUTTONS.map(({ action, label, icon, warning }) => (
              <button
                key={action}
                onClick={() => callAI(action)}
                disabled={loading !== null}
                title={warning}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-medium transition-colors text-left",
                  "bg-muted hover:bg-muted/70 text-foreground",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  loading === action && "opacity-70"
                )}
              >
                {loading === action ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-primary" />
                ) : (
                  <span className="shrink-0 text-primary">{icon}</span>
                )}
                {label}
              </button>
            ))}
          </div>

          {/* Chat messages */}
          {messages.length > 0 && (
            <div className="space-y-2 mt-2">
              {messages.map((msg, i) =>
                msg.role === "assistant" ? (
                  <div key={i} className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                    <p className="text-[11px] text-foreground whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                ) : null
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMessages([])}
                className="text-[10px] text-muted-foreground h-6"
              >
                Chat leeren
              </Button>
            </div>
          )}
        </div>

        {/* Lern-ToDos */}
        {session.lernTodos && (
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Aktuelle Lern-To-Dos
            </p>
            <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-amber-50 rounded-lg p-2.5 border border-amber-100">
              {session.lernTodos}
            </div>
          </div>
        )}

        {/* Unterlagen */}
        {session.unterlagen.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Unterlagen
            </p>
            <div className="space-y-1">
              {session.unterlagen.map((u) => (
                <div key={u} className="flex items-center gap-1.5 text-xs text-foreground">
                  <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                  {u}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center bg-muted/40 rounded-lg px-3 py-1.5 flex-1">
      <span className="text-sm font-bold text-foreground">{value}</span>
      <span className="text-[9px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}
