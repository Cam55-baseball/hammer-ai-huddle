import { cn } from "@/lib/utils";
import type { GradeResult } from "@/lib/reportCard/grade";

const COLORS: Record<GradeResult["letter"], string> = {
  A: "bg-primary text-primary-foreground",
  B: "bg-primary/80 text-primary-foreground",
  C: "bg-amber-500 text-white",
  D: "bg-orange-500 text-white",
  F: "bg-destructive text-destructive-foreground",
};

export function ReportCardGradeRibbon({ grade }: { grade: GradeResult }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-card p-4">
      <div
        className={cn(
          "flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl text-4xl font-extrabold leading-none",
          COLORS[grade.letter],
        )}
      >
        {grade.letter}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">{grade.score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px] uppercase tracking-wider">
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            {grade.measured}/{grade.total} measured
          </span>
          {grade.nonNegotiableFailed > 0 && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 font-bold text-destructive">
              {grade.nonNegotiableFailed} non-negotiable failed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
