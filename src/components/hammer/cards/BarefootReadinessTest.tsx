/**
 * Guided barefoot readiness test (owner, Round 9). Barefoot, on grass or turf.
 * Items 1–4 are done now; item 5 is tomorrow morning's check-in (no foot, ankle,
 * shin, Achilles or calf pain). Any item failed → retest in 7 days.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { ageFrom } from "@/lib/throwing/armLedgerEntry";
import { calfRaiseTarget } from "@/lib/speed/speedEngine";

export function BarefootReadinessTest({ planDate, onDone }: { planDate: string; onDone?: () => void }) {
  const { user } = useOptionalAuth();
  const [age, setAge] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [ans, setAns] = useState<Record<number, boolean | undefined>>({});
  const [result, setResult] = useState<"pass" | "fail" | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("date_of_birth").eq("id", user.id).maybeSingle()
      .then(({ data }) => setAge(ageFrom((data as any)?.date_of_birth ?? null)));
  }, [user?.id]);

  const items = [
    "Balance on one foot for 30 seconds without touching down — each foot, in 2 of 3 tries.",
    `${calfRaiseTarget(age)} single-leg calf raises on each side, all the way up and down, no pain.`,
    "20 quiet, rhythmic pogo hops, no pain.",
    "2 × 20 yards of barefoot A-skips, no pain.",
  ];
  const all = items.every((_, i) => ans[i] !== undefined);
  const save = async () => {
    const passed = items.every((_, i) => ans[i] === true);
    setResult(passed ? "pass" : "fail");
    if (user?.id) await supabase.from("wk_session_logs" as any).insert({
      user_id: user.id, plan_date: planDate, movement_slug: "barefoot_test",
      metrics: { kind: "barefoot_test", passed, items: ans, calf_target: calfRaiseTarget(age) },
    } as any);
    onDone?.();
  };

  if (result) return (
    <p data-barefoot-test={result} className="text-foreground">
      {result === "pass"
        ? "Readiness test: steps 1–4 passed. Last step: tomorrow morning's check-in must show no foot, ankle, shin, Achilles or calf pain."
        : "Readiness test: not passed this time — that's fine. Try again in 7 days."}
    </p>
  );
  if (!open) return <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setOpen(true)}>Take the barefoot readiness test</Button>;
  return (
    <div data-barefoot-test-form className="space-y-1 rounded-md border border-border p-2">
      <p className="font-medium text-foreground">Barefoot readiness test — take your shoes off, on grass or turf</p>
      {items.map((t, i) => (
        <div key={i} className="space-y-1">
          <p className="text-muted-foreground">{i + 1}. {t}</p>
          <div className="flex gap-1">
            <Button size="sm" variant={ans[i] === true ? "default" : "outline"} className="h-7 px-2 text-[11px]" onClick={() => setAns({ ...ans, [i]: true })}>Passed</Button>
            <Button size="sm" variant={ans[i] === false ? "default" : "outline"} className="h-7 px-2 text-[11px]" onClick={() => setAns({ ...ans, [i]: false })}>Didn't pass / it hurt</Button>
          </div>
        </div>
      ))}
      <p className="text-muted-foreground">5. Tomorrow morning's check-in must show no foot, ankle, shin, Achilles or calf pain.</p>
      <Button size="sm" className="h-8 w-full" disabled={!all} onClick={save}>Save my test</Button>
    </div>
  );
}
