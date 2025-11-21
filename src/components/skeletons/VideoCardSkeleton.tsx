import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const VideoCardSkeleton = () => {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="w-full aspect-video" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </Card>
  );
};
