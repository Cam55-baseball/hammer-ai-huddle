import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

export function RosterEmptyState() {
  return (
    <Card className="border-dashed bg-muted/20 p-8 text-center">
      <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <h3 className="font-semibold">No athletes in your roster</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Athletes appear here once they are assigned to you via the MPI coach
        relationship, share an organization with you, or accept a linked follow.
        Nothing is fabricated — the roster is a strict union of canonical sources.
      </p>
    </Card>
  );
}
