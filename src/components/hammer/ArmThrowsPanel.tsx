/**
 * Step 30 E — one-tap throw entry inside the throwing card and the pitching card.
 * Both cards read and write the SAME arm ledger and show the SAME budget line.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, SkipForward } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SavedIndicator, useAutosave } from "@/components/hammer/logging/useAutosave";
import { AUTO_STATUS_LABEL, autoStatus } from "@/lib/logging/autoCompletion";
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

export function ArmThrowsPanel({ source, planDate, fixture }: { source: EntrySource; planDate?: string; /** Dev evidence page only: fixed athlete instead of the profile. */ fixture?: { primary: string; age: number; sport?: "baseball" | "softball" } }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const ctx = useHammerAthleteContext();
  const { modules } = useSubscription();
  const { isOwner } = useOwnerAccess();
  const date = planDate ?? todayIso();

  const sport = fixture?.sport ?? (ctx.get<unknown>("sport_primary")?.value === "softball" ? "softball" : "baseball");
  const primary = fixture ? fixture.primary : ctx.get<unknown>("position_primary")?.value ?? null;
  const secondary = fixture ? null : ctx.get<unknown>("position_secondary")?.value ?? null;
  const age = fixture ? fixture.age : ageFrom(ctx.get<string>("date_of_birth")?.value as string | null);
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

  const prescribed = useMemo(() => prescribedThrows(role, primary, secondary), [role, primary, secondary]);
  const pitches = useMemo(
    () => Object.entries(pitchLoad.data?.byDate ?? {}).map(([plan_date, n]) => ({ plan_date, pitches: n })),
    [pitchLoad.data],
  );
  const [local, setLocal] = useState<Record<string, { sets: string[]; status: "done" | "skipped" }>>(() => {
    try { return JSON.parse(localStorage.getItem(`hm-arm-sets:${date}:${source}`) ?? "{}"); } catch { return {}; }
  });
  const autosave = useAutosave(`arm:${date}:${source}`, () => qc.invalidateQueries({ queryKey: ["arm-ledger"] }));
  const serverEntries = entriesQ.data ?? [];
  // What the player entered on this device wins until it syncs — the arm total and warnings update at once.
  const entries = useMemo(() => {
    const out = serverEntries.filter((e) => !(e.entry_date === date && local[e.throw_type]));
    for (const [t, v] of Object.entries(local)) {
      const count = v.sets.reduce((s, x) => s + (Number(x) || 0), 0);
      if (v.status === "skipped" || v.sets.some((x) => x !== "")) out.push({ entry_date: date, throw_type: t as ThrowType, count, status: v.status });
    }
    return out;
  }, [serverEntries, local, date]);
  const view = useMemo(
    () => armLedgerView({ sport, role, age }, date, prescribed, entries, pitches),
    [sport, role, age, date, prescribed, entries, pitches],
  );

  const types = enterableTypes(role, source);
  // Position entry is part of 5Tool Player and The Golden 2Way.
  const entitled = !!fixture || source === "pitching" || isOwner || hasFeatureAccess(modules, "throwing");
  if (!user || types.length === 0 || !entitled) return null;

  const write = (t: ThrowType, sets: string[], status: "done" | "skipped") => {
    const next = { ...local, [t]: { sets, status } };
    setLocal(next);
    try { localStorage.setItem(`hm-arm-sets:${date}:${source}`, JSON.stringify(next)); } catch { /* memory only */ }
    const rx = prescribed.find((p) => p.throw_type === t)?.count ?? null;
    const count = status === "skipped" ? 0 : sets.reduce((s, x) => s + (Number(x) || 0), 0);
    // One job per throw type so every type's latest value is kept until it syncs.
    // Clearing every box returns the type to "done at the planned number", the ledger's default.
    const blank = sets.every((x) => x === "");
    autosave.queue({ kind: "arm", id: `arm:${date}:${t}`, userId: user.id, at: Date.now(), row: { entry_date: date, source: THROW_TYPES[t].source, throw_type: t, count: status === "skipped" ? 0 : blank ? rx ?? 0 : count, prescribed: rx, status } });
  };

  const byType = new Map(serverEntries.filter((e) => e.entry_date === date).map((e) => [e.throw_type, e]));
  const over = view.today.overDaily || view.overWeekly;

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
      <ul className="space-y-2">
        {types.map((t) => {
          const rx = prescribed.find((p) => p.throw_type === t)?.count ?? 0;
          const e = byType.get(t);
          const mine = local[t];
          const sets = mine?.sets ?? [e && e.status !== "skipped" ? String(e.count) : ""];
          const skipped = (mine?.status ?? e?.status) === "skipped";
          // A blank box counts as done at the planned number (ledger rule), so show that.
          const done = sets.every((x) => x === "") && !e ? rx : sets.reduce((s, x) => s + (Number(x) || 0), 0);
          // Throws of a type not planned today are all extra work.
          const st = !skipped && rx === 0 && done > 0 ? "did_more" as const : autoStatus({ prescribedRows: 1, targets: { throws: rx || null }, rows: [{ throws: done }], skipped });
          const label = THROW_TYPES[t].label;
          return (
            <li key={t} className="space-y-1" data-throw-type={t}>
              <div className="flex items-center gap-2">
                <span className={`flex-1 text-xs font-medium ${skipped ? "line-through text-muted-foreground" : ""}`}>{label}{rx > 0 && <span className="font-normal text-muted-foreground"> · {rx} planned</span>}</span>
                {st && <span data-auto-status={st} className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">{AUTO_STATUS_LABEL[st]}</span>}
              </div>
              {sets.map((v, i) => (
                <div key={i} className="flex items-center gap-2" data-entry-row={i === 0 ? "prescribed" : "added"}>
                  <span className="w-14 text-[11px] text-muted-foreground">{i === 0 ? "Throws" : `Added ${i}`}</span>
                  <Input aria-label={`${label} ${i === 0 ? "throws" : `added set ${i}`}`} inputMode="numeric" value={v} placeholder={i === 0 && rx ? String(rx) : "0"} className="h-9 w-24 px-2 text-sm"
                    onChange={(ev) => write(t, sets.map((x, n) => n === i ? ev.target.value.replace(/\D/g, "").slice(0, 4) : x), "done")}
                    onBlur={() => void autosave.flush()} />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-9" aria-label={`Add set ${label}`} onClick={() => write(t, [...sets, ""], "done")}><Plus className="mr-1 h-3.5 w-3.5" />Add set</Button>
                <Button size="sm" variant={skipped ? "secondary" : "ghost"} className="h-9" aria-label={`Skip ${label}`} onClick={() => write(t, sets, skipped ? "done" : "skipped")}><SkipForward className="mr-1 h-3.5 w-3.5" />{skipped ? "Undo skip" : "Skip"}</Button>
                {(done > 0 || rx > 0) && <span data-prescribed-vs-done className="ml-auto text-[11px] text-muted-foreground">Prescribed {rx} · Done {skipped ? 0 : done}</span>}
              </div>
            </li>
          );
        })}
      </ul>
      {over && (
        <p role="alert" data-testid="arm-safety-warning" className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs font-medium text-destructive">
          Safety warning: {view.today.overDaily ? `today's throws are over your daily arm limit (${view.usedToday} of ${view.budget.daily} arm units)` : `this week's throws are over your weekly arm limit (${view.usedWeek} of ${view.budget.weekly})`}. Everything you entered is saved as you really did it. Stop throwing for today — your coming days will be adjusted.
        </p>
      )}
      <SavedIndicator state={autosave.state} />
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
