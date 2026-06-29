/**
 * GameReports — aggregate dashboards over the gp_* ledger.
 *
 * Sections (each a drop-down):
 *  - Hitting heat map (zone × result, split L/R/S)
 *  - Plate discipline (chase / contact / whiff by zone)
 *  - Pitch usage by count (pitcher perspective)
 *  - Defense play-type accuracy
 *  - Baserunning success / read quality
 *
 * Every chart is computed locally from the user's own gp_* data — no
 * server-side aggregation drift to worry about.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { gp } from "@/lib/games/ledger";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StrikeZoneGrid, type Zone } from "@/components/games/StrikeZoneGrid";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";

type Side = "all" | "L" | "R" | "S";

export default function GameReports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [side, setSide] = useState<Side>("all");

  const pitches = useQuery({
    queryKey: ["gp-pitches-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await gp("gp_pitches")
        .select("perspective,inning,pitch_type,pitch_velo,location,result,batter_handedness,count_balls,count_strikes")
        .eq("user_id", user!.id)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const atBats = useQuery({
    queryKey: ["gp-at-bats-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await gp("gp_at_bats")
        .select("result,batting_side,exit_velo,launch_angle,exit_direction,rbi")
        .eq("user_id", user!.id)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const defense = useQuery({
    queryKey: ["gp-defense-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await gp("gp_defense_plays")
        .select("position,play_type,result,error_flag")
        .eq("user_id", user!.id)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const baserun = useQuery({
    queryKey: ["gp-baserun-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await gp("gp_baserun_events")
        .select("event_type,success")
        .eq("user_id", user!.id)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const sideFilter = (h: string | null | undefined) => {
    if (side === "all") return true;
    return h === side;
  };

  // Pitch heat map — frequency the user saw a pitch in each zone (as hitter)
  const heat = useMemo(() => {
    const counts: Record<number, number> = {};
    let max = 0;
    (pitches.data ?? []).forEach((p) => {
      if (p.perspective !== "hitter") return;
      if (!sideFilter(p.batter_handedness)) return;
      const z = p.location?.zone;
      if (z >= 1 && z <= 9) {
        counts[z] = (counts[z] ?? 0) + 1;
        if (counts[z] > max) max = counts[z];
      }
    });
    const heatMap: Partial<Record<Zone, number>> = {};
    const labels: Partial<Record<Zone, string>> = {};
    (Object.keys(counts) as unknown as Zone[]).forEach((k) => {
      const z = Number(k) as Zone;
      heatMap[z] = max ? counts[z] / max : 0;
      labels[z] = String(counts[z]);
    });
    return { heatMap, labels, total: (pitches.data ?? []).filter((p) => p.perspective === "hitter").length };
  }, [pitches.data, side]);

  // Plate discipline
  const discipline = useMemo(() => {
    const rows = (pitches.data ?? []).filter(
      (p) => p.perspective === "hitter" && sideFilter(p.batter_handedness),
    );
    const total = rows.length;
    const swings = rows.filter((p) => /strike|foul|in_play/.test(p.result ?? "") && p.result !== "called_strike").length;
    const chases = rows.filter((p) => !p.location?.zone && /strike|foul|in_play/.test(p.result ?? "") && p.result !== "called_strike").length;
    const whiff = rows.filter((p) => p.result === "swinging_strike").length;
    const inPlay = rows.filter((p) => p.result === "in_play").length;
    return {
      total,
      swingPct: total ? Math.round((swings / total) * 100) : 0,
      chasePct: total ? Math.round((chases / total) * 100) : 0,
      whiffPct: swings ? Math.round((whiff / swings) * 100) : 0,
      contactPct: swings ? Math.round(((swings - whiff) / swings) * 100) : 0,
      inPlay,
    };
  }, [pitches.data, side]);

  // Pitch usage by count (perspective=pitcher)
  const usage = useMemo(() => {
    const rows = (pitches.data ?? []).filter((p) => p.perspective === "pitcher");
    const map: Record<string, Record<string, number>> = {};
    rows.forEach((p) => {
      const cnt = `${p.count_balls ?? "?"}-${p.count_strikes ?? "?"}`;
      const t = p.pitch_type ?? "?";
      map[cnt] ??= {};
      map[cnt][t] = (map[cnt][t] ?? 0) + 1;
    });
    return map;
  }, [pitches.data]);

  // Hitting result distribution
  const hittingResults = useMemo(() => {
    const counts: Record<string, number> = {};
    (atBats.data ?? [])
      .filter((a) => sideFilter(a.batting_side))
      .forEach((a) => {
        const r = a.result ?? "unknown";
        counts[r] = (counts[r] ?? 0) + 1;
      });
    return counts;
  }, [atBats.data, side]);

  // Defense
  const defStats = useMemo(() => {
    const total = (defense.data ?? []).length;
    const errors = (defense.data ?? []).filter((d) => d.error_flag === true || d.result === "error").length;
    const byPos: Record<string, number> = {};
    (defense.data ?? []).forEach((d) => {
      const k = d.position ?? "?";
      byPos[k] = (byPos[k] ?? 0) + 1;
    });
    return { total, errors, byPos };
  }, [defense.data]);

  // Baserunning
  const brStats = useMemo(() => {
    const total = (baserun.data ?? []).length;
    const steals = (baserun.data ?? []).filter((b) => b.event_type === "steal");
    const stealSuccess = steals.filter((b) => b.success === true).length;
    return {
      total,
      steals: steals.length,
      stealPct: steals.length ? Math.round((stealSuccess / steals.length) * 100) : 0,
    };
  }, [baserun.data]);
    const byPos: Record<string, number> = {};
    (defense.data ?? []).forEach((d) => {
      const k = d.position ?? "?";
      byPos[k] = (byPos[k] ?? 0) + 1;
    });
    return { total, errors, byPos };
  }, [defense.data]);

  // Baserunning
  const brStats = useMemo(() => {
    const total = (baserun.data ?? []).length;
    const steals = (baserun.data ?? []).filter((b) => b.event_type === "steal");
    const stealSuccess = steals.filter((b) => b.result === "safe").length;
    return {
      total,
      steals: steals.length,
      stealPct: steals.length ? Math.round((stealSuccess / steals.length) * 100) : 0,
    };
  }, [baserun.data]);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/games")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" /> Game reports
        </h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Auto-built from every event you've logged. Switch sides to keep switch-hitter / -thrower
        differentials honest.
      </p>

      <div className="flex justify-end">
        <Select value={side} onValueChange={(v) => setSide(v as Side)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sides</SelectItem>
            <SelectItem value="L">Lefty only</SelectItem>
            <SelectItem value="R">Righty only</SelectItem>
            <SelectItem value="S">Switch tagged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Accordion type="multiple" defaultValue={["heat"]}>
        <AccordionItem value="heat">
          <AccordionTrigger>Pitch heat map ({heat.total} pitches seen)</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <StrikeZoneGrid heat={heat.heatMap} heatLabels={heat.labels} readOnly size={240} />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Each cell is colored by frequency seen in that zone.</p>
                <p>Cooler blue = rare, hotter red = common.</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="discipline">
          <AccordionTrigger>Plate discipline</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Swing %" value={`${discipline.swingPct}%`} />
              <Stat label="Chase %" value={`${discipline.chasePct}%`} />
              <Stat label="Whiff %" value={`${discipline.whiffPct}%`} />
              <Stat label="Contact %" value={`${discipline.contactPct}%`} />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="usage">
          <AccordionTrigger>Pitcher usage by count</AccordionTrigger>
          <AccordionContent>
            {Object.keys(usage).length === 0 && <p className="text-xs text-muted-foreground">No pitcher-perspective pitches yet.</p>}
            {Object.entries(usage).map(([cnt, types]) => (
              <div key={cnt} className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
                <Badge variant="outline" className="w-12 justify-center">{cnt}</Badge>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                    <Badge key={t} variant="secondary">{t} × {n}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="hitting">
          <AccordionTrigger>Hitting outcomes</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(hittingResults).sort((a, b) => b[1] - a[1]).map(([r, n]) => (
                <Badge key={r} variant="secondary">{r} × {n}</Badge>
              ))}
              {Object.keys(hittingResults).length === 0 && <p className="text-xs text-muted-foreground">No at-bats yet.</p>}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="defense">
          <AccordionTrigger>Defense ({defStats.total} plays)</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Stat label="Total plays" value={String(defStats.total)} />
              <Stat label="Errors" value={String(defStats.errors)} />
              <Stat label="Positions" value={String(Object.keys(defStats.byPos).length)} />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(defStats.byPos).map(([p, n]) => (
                <Badge key={p} variant="outline">{p} × {n}</Badge>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="baserun">
          <AccordionTrigger>Baserunning</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Stat label="Events" value={String(brStats.total)} />
              <Stat label="Steal attempts" value={String(brStats.steals)} />
              <Stat label="Steal %" value={`${brStats.stealPct}%`} />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold mt-0.5">{value}</p>
    </Card>
  );
}
