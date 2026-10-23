import { Input } from "@/components/ui/input";
/** Canonical distance remains feet; the athlete enters feet and inches explicitly. */
export function DistanceField({ value, label, onChange, onBlur }: { value: string; label: string; onChange: (feet: string) => void; onBlur?: () => void }) {
  const numeric = value === "" ? null : Number(value);
  const feet = numeric == null ? "" : String(Math.floor(numeric));
  const inches = numeric == null ? "" : String(Math.round((numeric - Math.floor(numeric)) * 12 * 100) / 100);
  const update = (ft: string, inch: string) => onChange(ft === "" && inch === "" ? "" : String((Number(ft) || 0) + Math.min(11.99, Math.max(0, Number(inch) || 0)) / 12));
  return <div className="flex items-center gap-1" role="group" aria-label={label}>
    <Input aria-label={`${label} feet`} inputMode="numeric" value={feet} onChange={e => update(e.target.value.replace(/\D/g, ""), inches)} onBlur={onBlur} className="h-9 min-w-0 px-1 text-center" /><span className="text-xs">ft</span>
    <Input aria-label={`${label} inches`} inputMode="decimal" value={inches} onChange={e => update(feet, e.target.value.replace(/[^\d.]/g, ""))} onBlur={onBlur} className="h-9 min-w-0 px-1 text-center" /><span className="text-xs">in</span>
  </div>;
}