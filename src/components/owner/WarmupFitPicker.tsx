import { Checkbox } from "@/components/ui/checkbox";
import { WARMUP_AGE_BANDS, WARMUP_LEVELS, fitLabel, type WarmupAgeBand, type WarmupFitTags, type WarmupLevel } from "@/lib/hammer/prescription/warmupFit";

/** Owner Part D: tick every level and age band a warm-up item fits. */
export function WarmupFitPicker({ value, onChange }: { value: WarmupFitTags; onChange: (next: { levels: WarmupLevel[]; ageBands: WarmupAgeBand[] }) => void }) {
  const toggle = <T extends string>(list: readonly T[], id: T, on: boolean): T[] => (on ? [...new Set([...list, id])] : list.filter((x) => x !== id));
  return (
    <fieldset data-warmup-fit className="space-y-2 rounded-md border border-border p-2">
      <legend className="px-1 text-xs font-medium text-foreground">Who this warm-up fits</legend>
      <div className="flex flex-wrap gap-3" role="group" aria-label="Levels">
        <span className="text-xs text-muted-foreground w-full">Levels</span>
        {WARMUP_LEVELS.map((l) => (
          <label key={l.id} className="flex items-center gap-1.5 text-sm">
            <Checkbox data-fit-level={l.id} checked={value.levels.includes(l.id)} onCheckedChange={(c) => onChange({ levels: toggle(value.levels, l.id, c === true), ageBands: [...value.ageBands] })} />
            {l.label}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-3" role="group" aria-label="Age bands">
        <span className="text-xs text-muted-foreground w-full">Ages</span>
        {WARMUP_AGE_BANDS.map((a) => (
          <label key={a.id} className="flex items-center gap-1.5 text-sm">
            <Checkbox data-fit-age={a.id} checked={value.ageBands.includes(a.id)} onCheckedChange={(c) => onChange({ levels: [...value.levels], ageBands: toggle(value.ageBands, a.id, c === true) })} />
            {a.label}
          </label>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Players only get this item when their level and age are both ticked. If nothing fits a slot, the plan uses the nearest easier item.</p>
    </fieldset>
  );
}

/** Read-only line shown on a video attached to a warm-up item (tags live on the item). */
export function WarmupFitReadOnly({ value }: { value: WarmupFitTags }) {
  return <p data-warmup-fit-readonly className="text-[11px] text-muted-foreground">Video uses this warm-up's tags (edit them on the item): {fitLabel(value)}</p>;
}
