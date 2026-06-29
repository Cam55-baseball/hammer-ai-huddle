/**
 * GameTotalsHeader — sticky one-line summary at the top of GameSheet.
 * Reads from the same `gp-ab` / `gp-pitches` query caches each logger uses.
 */
import { useQuery } from "@tanstack/react-query";
import { gp } from "@/lib/games/ledger";

interface Totals {
  pa: number;
  ab: number;
  h: number;
  bb: number;
  k: number;
  rbi: number;
  pitchesAsPitcher: number;
  pitchesAsHitter: number;
}

const HITS = new Set(["1B", "2B", "3B", "HR"]);
const OUTS_NOT_AB = new Set(["BB", "HBP", "SAC", "SF"]);

export function GameTotalsHeader({ gameId }: { gameId: string }) {
  const ab = useQuery({
    queryKey: ["gp-ab", gameId],
    queryFn: async () => {
      const { data } = await gp("gp_at_bats")
        .select("result,rbi")
        .eq("game_id", gameId);
      return (data ?? []) as Array<{ result: string | null; rbi: number | null }>;
    },
  });
  const pitches = useQuery({
    queryKey: ["gp-pitches", gameId],
    queryFn: async () => {
      const { data } = await gp("gp_pitches")
        .select("perspective")
        .eq("game_id", gameId);
      return (data ?? []) as Array<{ perspective: string }>;
    },
  });

  const t: Totals = {
    pa: 0, ab: 0, h: 0, bb: 0, k: 0, rbi: 0,
    pitchesAsPitcher: 0, pitchesAsHitter: 0,
  };
  for (const r of ab.data ?? []) {
    t.pa += 1;
    if (r.result && !OUTS_NOT_AB.has(r.result)) t.ab += 1;
    if (r.result && HITS.has(r.result)) t.h += 1;
    if (r.result === "BB") t.bb += 1;
    if (r.result?.startsWith("K_")) t.k += 1;
    t.rbi += r.rbi ?? 0;
  }
  for (const p of pitches.data ?? []) {
    if (p.perspective === "pitcher") t.pitchesAsPitcher += 1;
    else if (p.perspective === "hitter") t.pitchesAsHitter += 1;
  }

  if (t.pa === 0 && t.pitchesAsPitcher === 0 && t.pitchesAsHitter === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-6 py-2 text-[11px] bg-muted/40 border-b">
      {t.pa > 0 && (
        <>
          <Stat label="PA" value={t.pa} />
          <Stat label="AB" value={t.ab} />
          <Stat label="H" value={t.h} />
          <Stat label="BB" value={t.bb} />
          <Stat label="K" value={t.k} />
          <Stat label="RBI" value={t.rbi} />
        </>
      )}
      {t.pitchesAsPitcher > 0 && <Stat label="P (mound)" value={t.pitchesAsPitcher} />}
      {t.pitchesAsHitter > 0 && <Stat label="P (seen)" value={t.pitchesAsHitter} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="text-muted-foreground">
      <span className="font-semibold text-foreground">{value}</span>{" "}
      <span className="uppercase tracking-wide">{label}</span>
    </span>
  );
}
