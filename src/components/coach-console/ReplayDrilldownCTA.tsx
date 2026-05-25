import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

interface Props {
  eventId: string | null;
  label?: string;
}

/** Single-click drill to canonical replay. Disabled when no source. */
export function ReplayDrilldownCTA({ eventId, label = "Open in replay" }: Props) {
  if (!eventId) {
    return (
      <Button variant="ghost" size="sm" disabled className="text-xs">
        no source
      </Button>
    );
  }
  return (
    <Button asChild variant="ghost" size="sm" className="text-xs">
      <Link to={`/replay/${eventId}`}>
        {label}
        <ArrowUpRight className="ml-1 h-3 w-3" />
      </Link>
    </Button>
  );
}
