import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

interface Props {
  sourceEventIds: string[];
  label?: string;
}

/** 1-click drilldown to /replay/:eventId for the first canonical source. */
export function DigestReplayCTA({ sourceEventIds, label = "Open in replay" }: Props) {
  const first = sourceEventIds[0];
  if (!first) {
    return (
      <Button variant="ghost" size="sm" disabled className="text-xs">
        no source
      </Button>
    );
  }
  return (
    <Button asChild variant="ghost" size="sm" className="text-xs">
      <Link to={`/replay/${first}`}>
        {label}
        {sourceEventIds.length > 1 && (
          <span className="ml-1 font-mono text-[10px] text-muted-foreground">
            +{sourceEventIds.length - 1}
          </span>
        )}
        <ArrowUpRight className="ml-1 h-3 w-3" />
      </Link>
    </Button>
  );
}
