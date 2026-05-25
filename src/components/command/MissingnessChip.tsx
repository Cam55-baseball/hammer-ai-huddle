import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CircleAlert, CircleSlash, CircleHelp, CircleCheck } from "lucide-react";
import type { Missingness } from "@/lib/command/projections";

interface Props {
  missingness: Missingness;
}

const META: Record<Exclude<Missingness, null>, { label: string; tip: string; icon: typeof CircleAlert; cls: string }> = {
  no_signal: { label: "no signal", tip: "No source event for this topic yet.", icon: CircleSlash, cls: "text-muted-foreground" },
  stale: { label: "stale", tip: "Source event exists but is older than the freshness window.", icon: CircleAlert, cls: "text-destructive" },
  partial: { label: "partial", tip: "Source event declares partial coverage.", icon: CircleHelp, cls: "text-muted-foreground" },
};

export function MissingnessChip({ missingness }: Props) {
  if (!missingness) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 font-mono text-xs">
              <CircleCheck className="h-3 w-3" />
              live
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Source event present and within freshness window.</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  const m = META[missingness];
  const Icon = m.icon;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 font-mono text-xs ${m.cls}`}>
            <Icon className="h-3 w-3" />
            {m.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{m.tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
