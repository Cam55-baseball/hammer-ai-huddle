import { useEffect, useState } from "react";
import { Check, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAthletePositions } from "@/hooks/useAthletePositions";
import { playerRole, startPlanItems } from "@/lib/hammer/startPlanItems";
import { useGrowthMode } from "@/hooks/useGrowthMode";
import { GrowthModeCardView } from "@/components/hammer/GrowthModeCard";
import type { GrowthModeState } from "../../../supabase/functions/_shared/wic/growth/growthMode";

interface Props {
  onStart: () => void;
  starting: boolean;
  error: string | null;
}

const ROLE_LABEL = { pitcher: "Pitcher", position: "Position player", two_way: "2-Way player" } as const;

/** Shown once per account, where the Hammers Today plan normally appears. */
export function StartHammersTodayCard({ onStart, starting, error }: Props) {
  const { user } = useAuth();
  const { positions } = useAthletePositions();
  const [sport, setSport] = useState<string | null>(null);
  const [age, setAge] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    void Promise.all([
      supabase.from("athlete_mpi_settings").select("sport").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("date_of_birth").eq("id", user.id).maybeSingle(),
    ]).then(([m, p]) => {
      if (!alive) return;
      setSport(((m.data as any)?.sport as string | null) ?? null);
      const dob = (p.data as any)?.date_of_birth ? Date.parse(String((p.data as any).date_of_birth)) : NaN;
      setAge(Number.isFinite(dob) ? Math.floor((Date.now() - dob) / (365.25 * 86_400_000)) : null);
    });
    return () => { alive = false; };
  }, [user?.id]);

  const growth = useGrowthMode().data ?? null;
  return <StartHammersTodayCardView onStart={onStart} starting={starting} error={error} positions={positions} sport={sport} age={age} growth={growth} />;
}

/** Presentational card — the same view the player sees, from explicit player facts. */
export function StartHammersTodayCardView({ onStart, starting, error, positions, sport, age, growth = null }: Props & { positions: readonly string[]; sport: string | null; age: number | null; growth?: GrowthModeState | null }) {
  const items = startPlanItems({ positions, sport, age, growthActive: !!growth?.active });
  const role = playerRole(positions);
  const sportLabel = sport ? sport.charAt(0).toUpperCase() + sport.slice(1) : null;

  return (
    <Card id="hammer-plan" className="scroll-mt-24 overflow-hidden border-primary/30">
      <CardContent className="space-y-5 p-4 sm:p-6">
        <Button
          size="lg"
          onClick={onStart}
          disabled={starting}
          className="h-16 w-full gap-2 rounded-xl text-lg font-bold shadow-lg"
        >
          {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Play className="h-5 w-5 fill-current" /> Start Hammers Today Plan</>}
        </Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {growth?.active && <GrowthModeCardView state={growth} />}

        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Hammers Today</p>
          <h2 className="text-xl font-bold leading-tight">A new plan for you every day</h2>
          <p className="text-sm text-muted-foreground">
            Built around your season, your position and how you feel. Rest days are built in. Tap once to start — you never have to do it again.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold">Your plan includes</span>
            {sportLabel && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Sport: {sportLabel}</span>}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Role: {ROLE_LABEL[role]}</span>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {items.map((it) => (
              <li key={it.key} className="flex items-start gap-3 bg-card px-3 py-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Check className="h-3 w-3 text-primary" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{it.title}</span>
                  <span className="block text-xs text-muted-foreground">{it.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
