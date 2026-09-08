/**
 * Sub-floor honesty note.
 *
 * 20 is the MLB floor. Below it the scale keeps running so a developing
 * athlete can see movement — but that number is a DEVELOPMENT CURVE READING,
 * not a scouting grade. No scout uses numbers down there, and a 12.4 must
 * never read as a professional evaluation.
 *
 * Renders only when at least one grade on the surface sits below the floor.
 */
import { cn } from "@/lib/utils";
import { MLB_FLOOR_GRADE, SUB_FLOOR_DISCLOSURE } from "@/lib/benchmarks/gradeScale";

interface Props {
  /** Every grade rendered on the surface. Nulls are ignored. */
  grades: readonly (number | null | undefined)[];
  className?: string;
}

export function DevelopmentCurveNote({ grades, className }: Props) {
  const hasSubFloor = grades.some(
    (g) => typeof g === "number" && Number.isFinite(g) && g < MLB_FLOOR_GRADE,
  );
  if (!hasSubFloor) return null;

  return (
    <p
      className={cn(
        "rounded-md border border-border bg-muted/40 px-2 py-1.5 text-[10px] leading-relaxed text-muted-foreground",
        className,
      )}
    >
      {SUB_FLOOR_DISCLOSURE}
    </p>
  );
}
