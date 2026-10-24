/**
 * CoachPrescriptionInbox — coach-sent prescriptions arrive on Hammers Today
 * with three player choices: Use instead of my [category] card, Add
 * alongside, Save for later (owner request Oct 24). "Use instead" is checked
 * server-side; when a safety rule blocks it the player sees why and the safe
 * option. Interpretive UI — it never authors training by itself.
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Loader2 } from "lucide-react";
import {
  useCoachPrescriptions,
  type CoachPrescription,
  type CoachRxChoice,
} from "@/hooks/useCoachPrescriptions";

const CATEGORY_LABEL: Record<string, string> = {
  hitting: "hitting",
  pitching: "pitching",
  throwing: "throwing",
  fielding: "fielding",
  baserunning: "baserunning",
  lift: "lifting",
  speed: "speed",
  conditioning: "conditioning",
  warmup: "warm-up",
  mobility: "mobility",
  recovery: "recovery",
  vision: "vision/timing",
};

export function CoachPrescriptionInbox({ planDate }: { planDate: string }) {
  const { pending, isLoading, choose, choosing } = useCoachPrescriptions(planDate);
  const [blocked, setBlocked] = useState<Record<string, { reasons: string[]; safeOption: string | null }>>({});

  if (isLoading || pending.length === 0) return null;

  const pick = async (rx: CoachPrescription, choice: CoachRxChoice) => {
    try {
    const r = await choose(rx.id, choice);
    if (!r.applied && r.reasons?.length) {
      setBlocked((b) => ({ ...b, [rx.id]: { reasons: r.reasons ?? [], safeOption: r.safeOption ?? null } }));
    } else {
      setBlocked((b) => { const n = { ...b }; delete n[rx.id]; return n; });
    }
    } catch { /* Mutation reports failure; retain the pending card and entries. */ }
  };

  return (
    <Card data-coach-rx-inbox className="border-primary/40">
      <CardContent className="space-y-3 p-4">
        <p className="flex items-center gap-2 text-sm font-bold">
          <ClipboardList className="h-4 w-4" />
          From your coach
        </p>
        {pending.map((rx) => {
          const label = CATEGORY_LABEL[rx.category] ?? rx.category;
          const b = blocked[rx.id];
          return (
            <div key={rx.id} className="space-y-2 rounded-lg border border-border p-3" data-coach-rx={rx.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{rx.title}</p>
                <Badge variant="secondary" className="text-xs capitalize">{label}</Badge>
              </div>
              {Array.isArray(rx.exercises) && rx.exercises.length > 0 && (
                <ul className="list-inside list-disc text-xs text-muted-foreground">
                  {rx.exercises.slice(0, 5).map((e, i) => (
                    <li key={i}>{String((e as any).name ?? "Exercise")}</li>
                  ))}
                  {rx.exercises.length > 5 && <li>+{rx.exercises.length - 5} more</li>}
                </ul>
              )}
              {b && (
                <div className="rounded-md bg-muted/50 p-2 text-xs" role="alert">
                  {b.reasons.map((r, i) => <p key={i}>{r}</p>)}
                  {b.safeOption && <p className="mt-1 font-medium">{b.safeOption}</p>}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="h-auto whitespace-normal text-left" disabled={choosing} onClick={() => void pick(rx, "use_instead")}>
                  {choosing && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Use instead of my {label} card
                </Button>
                <Button size="sm" variant="outline" disabled={choosing} onClick={() => void pick(rx, "add_alongside")}>
                  Add alongside
                </Button>
                <Button size="sm" variant="ghost" disabled={choosing} onClick={() => void pick(rx, "save_for_later")}>
                  Save for later
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
