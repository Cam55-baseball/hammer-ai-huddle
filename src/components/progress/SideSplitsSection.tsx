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
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { canSeeReportCard } from "@/lib/reportCard/visibility";
import { withStaffScores } from "@/lib/reportCard/staffVideoScores";
import { ReportCardAccessGate } from "@/components/report-card/hammer/ReportCardAccessGate";
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
  const { isOwner, loading: l1 } = useOwnerAccess();
  const { isAdmin, loading: l2 } = useAdminAccess();
  const canSee = !l1 && !l2 && canSeeReportCard({ isOwner, isAdmin });
  const { isSwitchHitter, isAmbidextrousThrower } = useSideContext();
  const showAny = isSwitchHitter || isAmbidextrousThrower;

  const { data: rows = [] } = useQuery({
    queryKey: ["side-splits-videos", user?.id],
    enabled: !!user && showAny && canSee,
    staleTime: 60_000,
    queryFn: async (): Promise<SidedVideoRow[]> => {
      const { data, error } = await supabase
        .from("videos")
        .select("id,module,batting_side,throwing_hand,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return [];
      // Scores are locked to owner/admin; the chart only renders for them.
      return (await withStaffScores((data ?? []) as any)) as unknown as SidedVideoRow[];
    },
  });

  const hitPoints = useMemo(() => toPoints(rows, "hit"), [rows]);
  const throwPoints = useMemo(() => toPoints(rows, "throw"), [rows]);

  // Daily-plan side bias: server-side summary only (never raw scores).
  const { data: biasRows } = useQuery({
    queryKey: ["side-split-inputs", user?.id],
    enabled: !!user && showAny,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_my_side_split_inputs");
      if (error) return null;
      return (data ?? []) as Array<{ discipline: "hit" | "throw"; favored: Side | "even"; diff_pct: number; left_n: number; right_n: number }>;
    },
  });

  useEffect(() => {
    if (!showAny || !biasRows) return;
    const pick = (d: "hit" | "throw"): SideBiasInput | null => {
      const r = biasRows.find((x) => x.discipline === d);
      return r ? { favored: r.favored, diffPct: Number(r.diff_pct), leftN: r.left_n, rightN: r.right_n } : null;
    };
    if (isSwitchHitter) writeSideBiasInput("hit", pick("hit"));
    if (isAmbidextrousThrower) writeSideBiasInput("throw", pick("throw"));
  }, [showAny, isSwitchHitter, isAmbidextrousThrower, biasRows]);

  if (!showAny) return null;

  // Scored efficiency is Report Card data: owner/admin only.
  return (
    <ReportCardAccessGate>
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
    </ReportCardAccessGate>
  );
}
