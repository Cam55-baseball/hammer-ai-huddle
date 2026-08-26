import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/**
 * Loading skeleton that mirrors the composed results layout (score anchor →
 * findings → prescription) so the reveal lands on familiar geometry instead
 * of a layout jump. Shown beneath AnalysisProgressIndicator while the model
 * runs.
 */
export const AnalysisResultSkeleton = () => {
  return (
    <div className="space-y-5" aria-hidden="true">
      {/* Score anchor hero */}
      <Card className="border-2">
        <div className="flex items-center gap-5 p-5 sm:gap-8 sm:p-7">
          <Skeleton className="h-[132px] w-[132px] shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-3 w-28" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-7 w-28 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full max-w-sm" />
            <Skeleton className="h-3 w-2/3 max-w-xs" />
          </div>
        </div>
      </Card>

      {/* Key findings */}
      <Card className="space-y-4 p-5 sm:p-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </Card>

      {/* Prescription drills */}
      <Card className="space-y-4 p-5 sm:p-6">
        <Skeleton className="h-3 w-32" />
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3 rounded-xl border p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-md" />
              <Skeleton className="h-6 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};
