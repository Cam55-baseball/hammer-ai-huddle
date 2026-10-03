import { Input } from "@/components/ui/input";

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

/** Height as two number-pad fields (feet, inches); value stays in the existing `5'10"` format. */
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
  const digits = (s: string, max: number) => s.replace(/\D/g, "").slice(0, max);
  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label="Feet"
        placeholder="ft"
        value={ft}
        required={required}
        onChange={(e) => onChange(serialize(digits(e.target.value, 1), inch))}
      />
      <Input
        id={`${id}-inches`}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label="Inches"
        placeholder="in"
        value={inch}
        onChange={(e) => {
          const d = digits(e.target.value, 2);
          onChange(serialize(ft, d && Number(d) > 11 ? "11" : d));
        }}
      />
    </div>
  );
}
