/**
 * FieldDirectionPicker — tap a spot on the field instead of picking a code.
 *
 * Stores the same `gp_at_bats.exit_direction` codes (LF, LCF, CF, RCF, RF,
 * 3B, SS, 2B, 1B, P, C). The code stays visible next to the plain name so
 * experienced users lose nothing.
 *
 * Stateless: parent owns the value.
 */
import { DIRECTIONS } from "@/lib/games/glossary";

interface Props {
  value?: string | null;
  onChange: (code: string | null) => void;
  size?: number;
}

/** x / y in a 200x200 viewBox, home plate bottom-center. */
const SPOTS: Record<string, { x: number; y: number }> = {
  LF: { x: 38, y: 52 },
  LCF: { x: 74, y: 33 },
  CF: { x: 100, y: 26 },
  RCF: { x: 126, y: 33 },
  RF: { x: 162, y: 52 },
  "3B": { x: 58, y: 108 },
  SS: { x: 78, y: 88 },
  "2B": { x: 122, y: 88 },
  "1B": { x: 142, y: 108 },
  P: { x: 100, y: 112 },
  C: { x: 100, y: 168 },
};

export function FieldDirectionPicker({ value, onChange, size = 220 }: Props) {
  const selected = value ?? null;
  const meaning = DIRECTIONS.find((d) => d.code === selected) ?? null;

  return (
    <div className="space-y-1.5">
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        role="group"
        aria-label="Where the ball went"
        className="rounded-md border bg-muted/20"
      >
        {/* outfield arc */}
        <path
          d="M20 150 A 110 110 0 0 1 180 150 Z"
          className="fill-emerald-500/10 stroke-border"
          strokeWidth={1}
        />
        {/* infield diamond */}
        <path
          d="M100 155 L145 110 L100 68 L55 110 Z"
          className="fill-amber-500/10 stroke-border"
          strokeWidth={1}
        />
        {/* foul lines */}
        <line x1="100" y1="155" x2="20" y2="72" className="stroke-border" strokeWidth={1} />
        <line x1="100" y1="155" x2="180" y2="72" className="stroke-border" strokeWidth={1} />

        {DIRECTIONS.map((d) => {
          const p = SPOTS[d.code];
          if (!p) return null;
          const on = selected === d.code;
          return (
            <g
              key={d.code}
              onClick={() => onChange(on ? null : d.code)}
              className="cursor-pointer"
            >
              <title>{`${d.code} — ${d.plain}: ${d.help}`}</title>
              <circle
                cx={p.x}
                cy={p.y}
                r={13}
                className={
                  on
                    ? "fill-primary stroke-primary"
                    : "fill-background stroke-border hover:fill-muted"
                }
                strokeWidth={1.5}
              />
              <text
                x={p.x}
                y={p.y + 3.5}
                textAnchor="middle"
                className={`text-[9px] font-mono ${on ? "fill-primary-foreground" : "fill-muted-foreground"}`}
              >
                {d.code}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-[11px] text-muted-foreground">
        {meaning
          ? `${meaning.code} — ${meaning.plain}. ${meaning.help}`
          : "Tap the spot on the field where the ball ended up. Optional — leave it blank if you're not sure."}
      </p>
    </div>
  );
}
