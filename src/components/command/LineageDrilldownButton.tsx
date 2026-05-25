import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRight } from "lucide-react";

interface Props {
  sourceEventId: string | null;
}

/**
 * One-click drilldown to /replay/:eventId. Disabled (with tooltip) when no
 * source event exists — never silently navigates to a fabricated target.
 */
export function LineageDrilldownButton({ sourceEventId }: Props) {
  if (!sourceEventId) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="ghost" size="sm" disabled className="w-full justify-between sm:w-auto">
                View lineage
                <ArrowRight className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>No source event yet — nothing to replay.</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return (
    <Button asChild variant="ghost" size="sm" className="w-full justify-between sm:w-auto">
      <Link to={`/replay/${sourceEventId}`}>
        View lineage
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  );
}
