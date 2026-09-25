/**
 * Step 30 E — one-tap throw entry inside the throwing card and the pitching card.
 * Both cards read and write the SAME arm ledger and show the SAME budget line.
 */
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Minus, Plus, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useHammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import { useRecentPitchingLoad } from "@/hooks/useRecentPitchingLoad";
import { hasFeatureAccess } from "@/utils/tierAccess";
import {
  THROW_TYPES,
  ageFrom,
  armLedgerView,
  enterableTypes,
  prescribedThrows,
  throwRoleFrom,
  type ArmEntry,
  type EntrySource,
  type ThrowType,
} from "@/lib/throwing/armLedgerEntry";

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function ArmThrowsPanel({ source, planDate }: { source: EntrySource; planDate?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const ctx = useHammerAthleteContext();
  const { modules } = useSubscription();
  const { isOwner } = useOwnerAccess();
  const date = planDate ?? todayIso();

  const sport = ctx.get<unknown>("sport_primary")?.value === "softball" ? "softball" : "baseball";
  const primary = ctx.get<unknown>("position_primary")?.value ?? null;
  const secondary = ctx.get<unknown>("position_secondary")?.value ?? null;
  const age = ageFrom(ctx.get<string>("date_of_birth")?.value as string | null);
  const role = throwRoleFrom(primary, secondary);

  const pitchLoad = useRecentPitchingLoad(7);
  const from = new Date(Date.parse(date + "T00:00:00Z") - 6 * 86400000).toISOString().slice(0, 10);
  const key = ["arm-ledger", user?.id, date];
  const entriesQ = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async (): Promise<ArmEntry[]> => {
      const { data, error } = await (supabase as any)
        .from("arm_ledger_entries")
        .select("entry_date, throw_type, count, status")
        .eq("user_id", user!.id)
        .gte("entry_date", from)
        .lte("entry_date", date);
      if (error) throw error;
      return (data ?? []) as ArmEntry[];
    },
  });

  const entries = entriesQ.data ?? [];
  const prescribed = useMemo(() => prescribedThrows(role, primary, secondary), [role, primary, secondary]);
  const pitches = useMemo(
    () => Object.entries(pitchLoad.data?.byDate ?? {}).map(([plan_date, n]) => ({ plan_date, pitches: n })),
    [pitchLoad.data],
  );
  const view = useMemo(
    () => armLedgerView({ sport, role, age }, date, prescribed, entries, pitches),
    [sport, role, age, date, prescribed, entries, pitches],
  );

  const types = enterableTypes(role, source);
  // Position entry is part of 5Tool Player and The Golden 2Way.
  const entitled = source === "pitching" || isOwner || hasFeatureAccess(modules, "throwing");
  if (!user || types.length === 0 || !entitled) return null;

  const save = async (t: ThrowType, count: number, status: "done" | "skipped") => {
    const rx = prescribed.find((p) => p.throw_type === t)?.count ?? null;
    const { error } = await (supabase as any).from("arm_ledger_entries").upsert(
      { user_id: user.id, entry_date: date, source: THROW_TYPES[t].source, throw_type: t, count: Math.max(0, count), prescribed: rx, status },
      { onConflict: "user_id,entry_date,throw_type" },
    );
    if (error) {
      toast.error("Couldn't save that. Check your connection and try again.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["arm-ledger"] });
  };

  const byType = new Map(entries.filter((e) => e.entry_date === date).map((e) => [e.throw_type, e]));

  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-2" data-testid={`arm-throws-${source}`}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {source === "pitching" ? "Warm-up and catch play" : "Throws today"}
        </div>
        <div className={`text-[11px] ${view.today.overDaily || view.overWeekly ? "text-destructive font-medium" : "text-muted-foreground"}`} data-testid="arm-budget-line">
          {view.line}
        </div>
      </div>
      {source === "pitching" && (
        <p className="text-[11px] text-muted-foreground" data-testid="arm-pitch-only-line">
          Pitches today: {view.pitchesToday} (Pitch Smart counts pitches only). Warm-up and catch play add on to the arm total above.
        </p>
      )}
      <ul className="space-y-1.5">
        {types.map((t) => {
          const rx = prescribed.find((p) => p.throw_type === t)?.count ?? 0;
          const e = byType.get(t);
          const count = e ? e.count : rx;
          const skipped = e?.status === "skipped";
          return (
            <li key={t} className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs flex-1 min-w-[8rem] ${skipped ? "line-through text-muted-foreground" : ""}`}>
                {THROW_TYPES[t].label}
                {!e && rx > 0 && <span className="text-muted-foreground"> · {rx} planned</span>}
              </span>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-11 w-11" aria-label={`Fewer ${THROW_TYPES[t].label}`}
                  onClick={() => save(t, count - 5, "done")} disabled={count <= 0}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center text-sm tabular-nums">{skipped ? 0 : count}</span>
                <Button size="icon" variant="ghost" className="h-11 w-11" aria-label={`More ${THROW_TYPES[t].label}`}
                  onClick={() => save(t, count + 5, "done")}>
                  <Plus className="h-4 w-4" />
                </Button>
                <Button size="sm" variant={e && !skipped ? "default" : "outline"} className="min-h-11"
                  aria-label={`Log ${THROW_TYPES[t].label}`} onClick={() => save(t, count || rx, "done")}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant={skipped ? "secondary" : "ghost"} className="min-h-11"
                  aria-label={`Skip ${THROW_TYPES[t].label}`} onClick={() => save(t, 0, "skipped")}>
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {(view.today.overDaily || view.overWeekly) && (
        <p className="text-xs font-medium text-destructive" data-testid="arm-budget-stop">
          {view.today.overDaily ? "Today's arm budget is used up — no more throwing today." : "This week's arm budget is used up — keep today to catch play only."}
        </p>
      )}
      {view.today.warnings.length > 0 && (
        <p className="text-[11px] text-destructive">{view.today.warnings.join(" ")}</p>
      )}
      <p className="text-[11px] text-muted-foreground">Anything you don't enter counts as done at the planned number, unless you skip it.</p>
    </div>
  );
}
