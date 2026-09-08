import { Info } from "lucide-react";
import { isEstimateBenchmark } from "@/data/gradeBenchmarks";
import { METRIC_BY_KEY } from "@/data/performanceTestRegistry";

/**
 * Honesty surface: some grades compare an athlete to an interpolated
 * benchmark rather than a measured standard. Where that is true, say so
 * — the same way the standards board admits its marks are seeded targets.
 */
export function EstimateBenchmarkNote({
  metricKeys,
  className,
}: {
  metricKeys: readonly string[];
  className?: string;
}) {
  const estimated = Array.from(new Set(metricKeys)).filter(isEstimateBenchmark);
  if (estimated.length === 0) return null;

  const names = estimated
    .map((k) => METRIC_BY_KEY[k]?.label ?? k.replace(/_/g, " "))
    .sort();

  return (
    <p
      className={`flex items-start gap-2 text-[11px] text-muted-foreground ${className ?? ""}`}
    >
      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>
        Estimated benchmark{estimated.length > 1 ? "s" : ""}:{" "}
        {names.join(", ")}. {estimated.length > 1 ? "These marks are" : "This mark is"}{" "}
        interpolated from nearby data, not a measured standard — treat the grade
        as a guide, not a verified comparison.
      </span>
    </p>
  );
}
