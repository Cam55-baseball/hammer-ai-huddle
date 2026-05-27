import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CircleAlert, CircleSlash, CircleHelp, CircleCheck } from "lucide-react";
import type { Missingness } from "@/lib/command/projections";

interface Props {
  missingness: Missingness;
}

const META: Record<Exclude<Missingness, null>, { label: string; tip: string; icon: typeof CircleAlert; cls: string }> = {
  no_signal: { label: "No info yet", tip: "Nothing logged for this yet.", icon: CircleSlash, cls: "text-muted-foreground" },
  stale: { label: "Needs a fresh check-in", tip: "It's been a while since your last update.", icon: CircleAlert, cls: "text-destructive" },
  partial: { label: "Some info missing", tip: "We have some of the info, but not all of it.", icon: CircleHelp, cls: "text-muted-foreground" },
};

export function MissingnessChip({ missingness }: Props) {
  if (!missingness) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 text-xs">
              <CircleCheck className="h-3 w-3" />
              Up to date
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Your recent check-ins are current.</TooltipContent>
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
          <Badge variant="outline" className={`gap-1 text-xs ${m.cls}`}>
            <Icon className="h-3 w-3" />
            {m.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{m.tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
