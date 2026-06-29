/**
 * SideSplitsSection — switch/ambi-only Progress widget showing L vs R
 * differential cards for hitting and throwing efficiency (from sided
 * video uploads). Auto-hides for single-sided athletes.
 *
 * Side-effect on render: caches the raw differential inputs to
 * localStorage via `writeSideBiasInput`, so the daily plan can read
 * a deterministic "weaker side focus" without re-querying the DB.
 */
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSideContext } from "@/contexts/SideContext";
import { SideDifferentialCard } from "./SideDifferentialCard";
import {
  computeSideDifferential,
  type SidedPoint,
} from "@/lib/side/sideDifferential";
import { writeSideBiasInput, type SideBiasInput } from "@/lib/side/sideBias";
import type { Side } from "@/lib/side/getSideFor";

interface SidedVideoRow {
  module: string | null;
  batting_side: string | null;
  throwing_hand: string | null;
  efficiency_score: number | null;
  created_at: string;
}

const HIT_MODULES = new Set(["hitting", "bp", "tee", "soft_toss"]);
const THROW_MODULES = new Set(["throwing", "pitching", "long_toss", "bullpen"]);

function normalizeSide(s: string | null): Side | null {
  if (!s) return null;
  const u = s.trim().toUpperCase();
  if (u.startsWith("L")) return "L";
  if (u.startsWith("R")) return "R";
  return null;
}

function toPoints(
  rows: SidedVideoRow[],
  kind: "hit" | "throw",
): SidedPoint[] {
  const out: SidedPoint[] = [];
  for (const r of rows) {
    if (typeof r.efficiency_score !== "number") continue;
    const inKind = kind === "hit"
      ? HIT_MODULES.has((r.module ?? "").toLowerCase())
      : THROW_MODULES.has((r.module ?? "").toLowerCase());
    if (!inKind) continue;
    const side = normalizeSide(kind === "hit" ? r.batting_side : r.throwing_hand);
    if (!side) continue;
    out.push({
      side,
      value: r.efficiency_score,
      date: r.created_at.slice(0, 10),
    });
  }
  return out;
}

export function SideSplitsSection() {
  const { user } = useAuth();
  const { isSwitchHitter, isAmbidextrousThrower } = useSideContext();
  const showAny = isSwitchHitter || isAmbidextrousThrower;

  const { data: rows = [] } = useQuery({
    queryKey: ["side-splits-videos", user?.id],
    enabled: !!user && showAny,
    staleTime: 60_000,
    queryFn: async (): Promise<SidedVideoRow[]> => {
      const { data, error } = await supabase
        .from("videos")
        .select("module,batting_side,throwing_hand,efficiency_score,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return [];
      return (data ?? []) as SidedVideoRow[];
    },
  });

  const hitPoints = useMemo(() => toPoints(rows, "hit"), [rows]);
  const throwPoints = useMemo(() => toPoints(rows, "throw"), [rows]);

  // Cache differential inputs for the daily plan side-bias reader.
  useEffect(() => {
    if (!showAny) return;
    const persist = (
      discipline: "hit" | "throw",
      points: SidedPoint[],
      higherIsBetter: boolean,
    ) => {
      const r = computeSideDifferential(points, { higherIsBetter });
      const input: SideBiasInput | null = r
        ? {
            favored: r.favored,
            diffPct: r.diffPct,
            leftN: r.leftN,
            rightN: r.rightN,
          }
        : null;
      writeSideBiasInput(discipline, input);
    };
    if (isSwitchHitter) persist("hit", hitPoints, true);
    if (isAmbidextrousThrower) persist("throw", throwPoints, true);
  }, [showAny, isSwitchHitter, isAmbidextrousThrower, hitPoints, throwPoints]);

  if (!showAny) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Side splits</h2>
        <p className="text-[11px] text-muted-foreground">
          L vs R asymmetry from your tagged uploads. Requires ≥ 3 samples
          per side to display a trusted differential.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {isSwitchHitter && (
          <SideDifferentialCard
            metricLabel="Hitting efficiency"
            unit="pts"
            points={hitPoints}
            higherIsBetter
            showEmpty
          />
        )}
        {isAmbidextrousThrower && (
          <SideDifferentialCard
            metricLabel="Throwing efficiency"
            unit="pts"
            points={throwPoints}
            higherIsBetter
            showEmpty
          />
        )}
      </div>
    </section>
  );
}
