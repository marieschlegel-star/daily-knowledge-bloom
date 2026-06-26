import { format, parseISO, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { cn, calcEffektiveLerntage } from "@/lib/utils";
import { useDayStore } from "@/lib/day-store";

interface StaatsexamenStatsProps {
  examDate: string;
  title?: string;
  subtitle?: string;
  showDayTypeHint?: boolean;
}

export function StaatsexamenStats({
  examDate,
  title = "Staatsexamen",
  subtitle = "Prüfungstermin",
  showDayTypeHint = false,
}: StaatsexamenStatsProps) {
  const { dayPlans } = useDayStore();
  const today = startOfDay(new Date());
  const stats = calcEffektiveLerntage(dayPlans, today, parseISO(examDate));

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-slate-50 border border-border px-3 py-2.5">
        <p className="text-[10px] text-muted-foreground mb-0.5">{subtitle}</p>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">
          {format(parseISO(examDate), "eeee, d. MMMM yyyy", { locale: de })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <StatBox label="Kalendertage" value={stats.kalender} color="#6346dc" icon="📅" />
        <StatBox label="Lerntage" value={stats.effektiv} color="#10b981" icon="📚" highlight />
        <StatBox label="Nicht-Lerntage" value={stats.nichtLerntage} color="#f59e0b" icon="🏖" />
      </div>

      {showDayTypeHint && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Lerntage berücksichtigen deine Tagesplanung (Stunden pro Tag).
        </p>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
  icon,
  highlight,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-2 text-center border",
        highlight ? "border-primary/20 bg-primary/5" : "border-border bg-slate-50"
      )}
    >
      <p className="text-base">{icon}</p>
      <p className="text-sm font-bold mt-0.5" style={{ color }}>{value}</p>
      <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{label}</p>
    </div>
  );
}
