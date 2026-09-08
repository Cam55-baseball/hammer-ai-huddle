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
import { firstWhatMovesIt } from "@/lib/benchmarks/whatMovesIt";

interface Props {
  /** Every grade rendered on the surface. Nulls are ignored. */
  grades: readonly (number | null | undefined)[];
  /**
   * Metric keys sitting below the floor on this surface. Used to render
   * "what moves this number" — never a projection, which would require
   * development-curve data we do not have.
   */
  subFloorMetricKeys?: readonly string[];
  /** When a real trend projection already exists, the trend wins. */
  hasTrendProjection?: boolean;
  className?: string;
}

export function DevelopmentCurveNote({
  grades,
  subFloorMetricKeys,
  hasTrendProjection,
  className,
}: Props) {
  const hasSubFloor = grades.some(
    (g) => typeof g === "number" && Number.isFinite(g) && g < MLB_FLOOR_GRADE,
  );
  if (!hasSubFloor) return null;

  const moves =
    !hasTrendProjection && subFloorMetricKeys?.length
      ? firstWhatMovesIt(subFloorMetricKeys)
      : null;

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-muted/40 px-2 py-1.5 text-[10px] leading-relaxed text-muted-foreground space-y-1.5",
        className,
      )}
    >
      <p>{SUB_FLOOR_DISCLOSURE}</p>
      {moves && (
        <div className="space-y-0.5 border-t border-border pt-1.5">
          <p className="font-medium text-foreground">What moves this number</p>
          <p>
            <span className="font-medium">{moves.familyLabel}:</span> {moves.plain}
          </p>
          <p>Start here, no equipment needed: {moves.startHere}.</p>
          {moves.nextMark && <p>Next mark to chase: {moves.nextMark}.</p>}
        </div>
      )}
    </div>
  );
}
