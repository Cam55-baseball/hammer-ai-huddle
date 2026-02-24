import { AlertTriangle } from 'lucide-react';

export function RoadmapBlockedBadge({ reason }: { reason: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">
      <AlertTriangle className="h-3 w-3" />
      Blocked: {reason}
    </span>
  );
}
