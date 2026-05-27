import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Gauge } from "lucide-react";

interface Props {
  confidence: number | null;
}

/**
 * Confidence is canonical organism state. Never fabricated.
 * When null, render an explicit em-dash — never a synthetic number.
 */
export function ConfidencePill({ confidence }: Props) {
  const display = confidence == null ? "—" : `${Math.round(confidence * 100)}% sure`;
  const tooltip =
    confidence == null
      ? "We don't have enough info to say yet."
      : `We're about ${Math.round(confidence * 100)}% sure based on your recent check-ins.`;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 text-xs">
            <Gauge className="h-3 w-3" />
            {display}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
