/**
 * WkSafePlanNotice — Stage 1, BUG-2 / L0.1.
 *
 * When the generator can't build the full session it ships a reduced one
 * instead of an error. This is the honest, non-alarming line the athlete sees
 * above it, plus a one-tap report so the failure reaches us with its plan date.
 */
import { useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHammersToday } from "@/components/hammer/HammersTodayProvider";
import { supabase } from "@/integrations/supabase/client";

export function WkSafePlanNotice() {
  const { data } = useHammersToday() as { data?: Array<Record<string, any>> };
  const [reported, setReported] = useState(false);

  const safeRow = (data ?? []).find((rx) => rx?.why_payload?.safe_plan === true);
  if (!safeRow) return null;

  const tier = String(safeRow.why_payload?.safe_plan_tier ?? "");
  const copy =
    String(safeRow.why_payload?.safe_plan_copy ?? "") ||
    "We couldn't build your full session today. Here's a session that keeps you moving.";

  const report = async () => {
    setReported(true);
    try {
      await supabase.from("behavioral_events").insert({
        event_type: "safe_plan_reported",
        event_data: {
          plan_date: safeRow.plan_date ?? null,
          safe_plan_tier: tier,
          dropped: safeRow.why_payload?.safe_plan_dropped ?? [],
        },
      } as never);
    } catch {
      /* reporting is best-effort — never block the session */
    }
  };

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">
            {tier === "safe_session" ? "Safe session today" : "Reduced session today"}
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{copy}</p>
          <Button
            size="sm"
            variant="ghost"
            className="mt-1 h-7 px-2 text-[12px]"
            onClick={report}
            disabled={reported}
          >
            {reported ? (
              <>
                <Check className="mr-1 h-3.5 w-3.5" /> Reported — thank you
              </>
            ) : (
              "Tell us this happened"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
