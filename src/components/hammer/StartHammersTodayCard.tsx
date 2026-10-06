import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAthletePositions } from "@/hooks/useAthletePositions";
import { startPlanItems } from "@/lib/hammer/startPlanItems";

interface Props {
  onStart: () => void;
  starting: boolean;
  error: string | null;
}

/** Shown once per account, where the Hammers Today plan normally appears. */
export function StartHammersTodayCard({ onStart, starting, error }: Props) {
  const { positions } = useAthletePositions();
  const items = startPlanItems(positions);

  return (
    <Card id="hammer-plan" className="scroll-mt-24 overflow-hidden border-primary/30">
      <CardContent className="p-5 sm:p-6 space-y-5">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Hammers Today</p>
          <h2 className="text-xl font-bold leading-tight">Your daily training plan</h2>
        </div>

        <Button
          size="lg"
          onClick={onStart}
          disabled={starting}
          className="w-full h-14 text-base font-bold"
        >
          {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Start Hammers Today Plan"}
        </Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <p className="text-sm text-muted-foreground">
          Every day you get a plan built for you — your season, your position and how you feel.
          Rest days are built in. Here's what it can include:
        </p>

        <ul className="space-y-2.5">
          {items.map((it) => (
            <li key={it.key} className="flex items-start gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Check className="h-3 w-3 text-primary" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{it.title}</span>
                <span className="block text-xs text-muted-foreground">{it.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
