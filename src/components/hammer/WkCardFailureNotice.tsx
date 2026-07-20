/**
 * WkCardFailureNotice — surfaces the *actual* reason today's plan couldn't
 * publish instead of a bare "Retry" button. Consumed by the four canonical
 * WIC cards (Speed / BatSpeed / Lifts / Conditioning) so the athlete knows
 * exactly what to do next.
 */
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export type WkCardFailure = {
  code?: string | null;
  title?: string | null;
  detail?: string | null;
  missingFields?: string[];
  engineFailures?: Record<string, string[] | undefined>;
} | null;

const FIELD_LABEL: Record<string, string> = {
  sport: "Sport",
  primary_position: "Primary position",
  handedness: "Handedness",
  hitting_side: "Hitting side",
  throwing_side: "Throwing side",
  training_age_years: "Training age",
  competitive_level: "Competition level",
  season_phase: "Season phase",
  equipment: "Equipment",
  available_time_min: "Time available",
  height_in: "Height",
  weight_lb: "Weight",
};

function humanizeField(f: string): string {
  return FIELD_LABEL[f] ?? f.replace(/_/g, " ");
}

export function WkCardFailureNotice({
  engine,
  failure,
  retry,
  retrying,
}: {
  engine: "speed" | "bat_speed" | "lift" | "conditioning";
  failure: WkCardFailure;
  retry: () => void;
  retrying?: boolean;
}) {
  const navigate = useNavigate();
  const engineReasons = failure?.engineFailures?.[engine] ?? [];
  const missing = failure?.missingFields ?? [];

  const primary =
    engineReasons[0] ??
    failure?.detail ??
    (missing.length
      ? `Finish onboarding — we need: ${missing.slice(0, 3).map(humanizeField).join(", ")}${missing.length > 3 ? "…" : ""}`
      : failure?.title ?? "Couldn't build this block. Tap retry.");

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="font-semibold text-amber-800 dark:text-amber-200">
            Plan couldn't publish
          </div>
          <p className="text-amber-900/80 dark:text-amber-100/80">{primary}</p>
          {engineReasons.length > 1 && (
            <ul className="mt-1 space-y-0.5 text-amber-900/70 dark:text-amber-100/70 list-disc list-inside">
              {engineReasons.slice(1, 4).map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" className="h-7" onClick={retry} disabled={retrying}>
              {retrying ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Retry
            </Button>
            {missing.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => navigate("/onboarding/athlete")}
              >
                Finish onboarding
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
