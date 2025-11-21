import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const AnalysisResultSkeleton = () => {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </Card>
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Card>
    </div>
  );
};
