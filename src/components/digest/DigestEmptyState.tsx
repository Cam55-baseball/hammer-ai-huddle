import { Card, CardContent } from "@/components/ui/card";
import { CircleSlash } from "lucide-react";

export function DigestEmptyState({
  message = "No organism history yet.",
}: { message?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <CircleSlash className="h-8 w-8 text-muted-foreground" />
        <p className="text-base font-medium text-foreground">{message}</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Once canonical events land on the ledger, weekly organism summaries appear here —
          each one lineage-cited and replay-drillable.
        </p>
      </CardContent>
    </Card>
  );
}
