import { Badge } from "@/components/ui/badge";

/** Small marker for owner/admin-only features that are not released. */
export function InternalLabel({ className = "" }: { className?: string }) {
  return (
    <Badge variant="outline" className={`text-[10px] font-medium border-destructive/50 text-destructive ${className}`}>
      Internal — not released
    </Badge>
  );
}
