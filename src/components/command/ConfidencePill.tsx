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
  const display = confidence == null ? "—" : `${Math.round(confidence * 100)}%`;
  const tooltip =
    confidence == null
      ? "Confidence not declared by source event."
      : `Confidence ${display} — read from canonical payload path.`;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 font-mono text-xs">
            <Gauge className="h-3 w-3" />
            conf {display}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
