import { inSessionDefenseGate, type CatchPlayCheck } from "../../../supabase/functions/_shared/wic/throwing/catchPlay";

type DrillLike = { name: string; dosage?: string | null; armEvent?: unknown; throwSection?: boolean };
type BlockLike = { modality: string; drills: DrillLike[]; because: string[]; steps?: unknown };

/** Position distance today = farthest regular catch-play row in the warm-up throw section. */
export function positionDistanceFromWarmup(drills: readonly DrillLike[]): number | null {
  const ft = drills.filter((d) => d.throwSection && !/long toss|pull-?down|stretch/i.test(d.name))
    .map((d) => Number((d.dosage ?? "").match(/^(\d+)ft/)?.[1] ?? NaN)).filter(Number.isFinite);
  return ft.length ? Math.max(...ft) : null;
}

/** Owner Nov 4: a logged short/painful/cut catch play turns today's Defense throws into dry work. */
export function applyCatchPlayCheck<B extends BlockLike>(blocks: readonly B[], check: CatchPlayCheck | null | undefined, toSteps?: (d: DrillLike[]) => unknown): B[] {
  const gate = inSessionDefenseGate(check);
  if (gate.allowed) return [...blocks];
  return blocks.map((b) => {
    if (b.modality !== "defense") return b;
    const drills = b.drills.filter((d) => !(/throw|toss/i.test(`${d.name} ${d.dosage ?? ""}`) || d.armEvent));
    return { ...b, drills, ...(toSteps ? { steps: toSteps(drills) } : {}), because: b.because.includes(gate.because!) ? b.because : [...b.because, gate.because!] };
  });
}
