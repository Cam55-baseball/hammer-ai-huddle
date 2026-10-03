import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Parses `5'10"`, `5 10`, `70` (inches) into feet/inches strings. */
function parse(value: string): { ft: string; inch: string } {
  const v = (value ?? "").trim();
  const m = v.match(/^(\d+)\s*['’ ]\s*(\d+)?/);
  if (m) return { ft: m[1], inch: m[2] ?? "" };
  const n = Number(v);
  if (v && Number.isFinite(n) && n > 8) return { ft: String(Math.floor(n / 12)), inch: String(Math.round(n % 12)) };
  if (/^\d+$/.test(v)) return { ft: v, inch: "" };
  return { ft: "", inch: "" };
}

function serialize(ft: string, inch: string): string {
  if (!ft && !inch) return "";
  return `${ft || 0}'${inch || 0}"`;
}

/** Total inches for a stored height string, or null when unset. */
export function heightToInches(value: string): number | null {
  const { ft, inch } = parse(value);
  if (!ft) return null;
  return Number(ft) * 12 + (Number(inch) || 0);
}

const FEET = ["3", "4", "5", "6", "7"];
const INCHES = Array.from({ length: 12 }, (_, i) => String(i));

/** Height as two selectors (feet, inches) — no typing; value stays in the existing `5'10"` format. */
export function HeightFeetInchesInput({
  id,
  value,
  onChange,
  required,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const { ft, inch } = parse(value);
  return (
    <div className="grid grid-cols-2 gap-2">
      <Select value={ft || undefined} onValueChange={(v) => onChange(serialize(v, inch || "0"))} required={required}>
        <SelectTrigger id={id} aria-label="Feet" className="h-12 text-base">
          <SelectValue placeholder="Feet" />
        </SelectTrigger>
        <SelectContent>
          {FEET.map((f) => <SelectItem key={f} value={f} className="py-3 text-base">{f} ft</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={inch || undefined} onValueChange={(v) => onChange(serialize(ft || "5", v))}>
        <SelectTrigger id={`${id}-inches`} aria-label="Inches" className="h-12 text-base">
          <SelectValue placeholder="Inches" />
        </SelectTrigger>
        <SelectContent>
          {INCHES.map((i) => <SelectItem key={i} value={i} className="py-3 text-base">{i} in</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
