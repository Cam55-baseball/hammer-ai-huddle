/**
 * MethodPanel — renders the training method attached to a prescription:
 * numbered stations, rest law, why it is prescribed today, the one cue that
 * matters, and the bailout so no athlete is ever left guessing.
 */
import { Badge } from "@/components/ui/badge";
import { Layers, Timer, Lightbulb, LifeBuoy } from "lucide-react";
import {
  formatRest,
  methodTone,
  type TrainingMethodPayload,
} from "@/lib/wic/methods";

export function MethodBadge({ method }: { method: TrainingMethodPayload }) {
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${methodTone(method.family)}`}>
      <Layers className="h-3 w-3" />
      {method.display_name}
    </Badge>
  );
}

export function MethodPanel({ method }: { method: TrainingMethodPayload }) {
  const hasStations = method.stations.length > 0;

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="font-semibold text-xs">{method.display_name}</div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Timer className="h-3 w-3" />
          {hasStations
            ? `${method.rounds} round${method.rounds === 1 ? "" : "s"} • ${formatRest(method.rest_between_rounds_seconds)} between rounds`
            : method.shape}
        </div>
      </div>

      {hasStations && (
        <ol className="space-y-1.5">
          {method.stations.map((s) => (
            <li key={s.order} className="flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                {s.order}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium break-words">
                  {s.name ?? s.label}
                  <span className="ml-1 font-normal text-muted-foreground">
                    × {s.reps}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground break-words">
                  {s.intent} {s.loadHint}. {s.restLabel ?? formatRest(s.restSeconds)}.
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {method.why && (
        <p className="text-[11px] text-muted-foreground break-words">{method.why}</p>
      )}
      {method.cue && (
        <p className="flex items-start gap-1.5 text-[11px] break-words">
          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
          <span>{method.cue}</span>
        </p>
      )}
      {method.bailout && (
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground break-words">
          <LifeBuoy className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{method.bailout}</span>
        </p>
      )}
    </div>
  );
}
