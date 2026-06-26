"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PomodoroTimer } from "@/components/pomodoro-timer";
import { DUMMY_SESSIONS } from "@/lib/dummy-data";
import type { LernSession } from "@/lib/types";

export default function FokusPage() {
  const { data: sessions = DUMMY_SESSIONS } = useQuery<LernSession[]>({
    queryKey: ["sessions"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/notion/sessions", { cache: "no-store" });
        return res.ok ? res.json() : DUMMY_SESSIONS;
      } catch {
        return DUMMY_SESSIONS;
      }
    },
    staleTime: 30_000,
  });

  return (
    <div className="min-h-screen bg-violet-50/30">
      {/* Back link */}
      <div className="fixed top-4 left-4 z-10">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Zurück zum Kalender
        </Link>
      </div>

      <PomodoroTimer sessions={sessions} fullPage />
    </div>
  );
}
