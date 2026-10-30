/**
 * Owner Oct30: at most ONE breathing item per day, as the LAST task of the
 * recovery card. Never in warm-up, lift or any other card. Order/removal only —
 * never adds work.
 */
type DrillLike = { readonly name?: string; readonly slug?: string };
type BlockLike = { readonly modality: string; readonly drills: ReadonlyArray<DrillLike> };

export function isBreathingDrill(d: DrillLike): boolean {
  return /breath/i.test(`${d.slug ?? ""} ${d.name ?? ""}`);
}

export function placeBreathing<B extends BlockLike>(blocks: ReadonlyArray<B>, toSteps?: (drills: B["drills"]) => ReadonlyArray<string>): B[] {
  let kept = false;
  return blocks.map((b) => {
    const breathing = b.drills.filter(isBreathingDrill);
    if (!breathing.length) return b;
    const rest = b.drills.filter((d) => !isBreathingDrill(d));
    let drills: DrillLike[] = rest;
    if (b.modality === "recovery" && !kept) { kept = true; drills = [...rest, breathing[0]]; }
    const next = { ...b, drills } as B;
    return toSteps ? ({ ...next, steps: toSteps(drills as B["drills"]) } as B) : next;
  });
}
