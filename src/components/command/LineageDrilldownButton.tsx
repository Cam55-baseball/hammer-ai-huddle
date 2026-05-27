import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

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
              <Button variant="ghost" size="sm" disabled className="gap-1">
                <HelpCircle className="h-4 w-4" />
                Why?
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Nothing to show yet.</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return (
    <Button asChild variant="ghost" size="sm" className="gap-1">
      <Link to={`/replay/${sourceEventId}`} aria-label="Why am I seeing this?">
        <HelpCircle className="h-4 w-4" />
        Why?
      </Link>
    </Button>
  );
}
