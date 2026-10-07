/**
 * "Finish your profile" card on the plan (owner 2026-10-07). Lists exactly
 * what's missing, one tap to the right step, and why it matters. "Later"
 * hides it for 3 days. Never blocks training. Under-13 accounts are run by
 * the parent, so the wording speaks to the parent.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, UserRoundPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOptionalAuth } from "@/hooks/useAuth";
import { useProfileGaps } from "@/hooks/onboarding/useProfileGaps";
import { shouldShowReminder } from "@/lib/onboarding/profileGaps";

const TITLES = { body: "Body measurements", goals: "Goals", level: "Level of play", training: "Training experience", equipment: "Equipment" } as const;

export function FinishProfileCard() {
  const { user } = useOptionalAuth();
  const { gaps, under13, loading } = useProfileGaps();
  const key = user ? `hm.finishProfile.laterAt.${user.id}` : null;
  const [laterAt, setLaterAt] = useState<number | null>(() => {
    try { const v = key ? localStorage.getItem(key) : null; return v ? Number(v) : null; } catch { return null; }
  });
  if (!user || loading || gaps.length === 0 || !shouldShowReminder(laterAt)) return null;
  return (
    <div data-finish-profile className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <UserRoundPen className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{under13 ? "Parent: finish your player's profile" : "Finish your profile"}</p>
          <p className="text-[11px] text-muted-foreground">
            {under13 ? "A parent or guardian should fill these in. " : ""}Today's plan works without them — these make it fit {under13 ? "your player" : "you"} better.
          </p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {gaps.map((g) => (
          <li key={g.section}>
            <Link to={g.to} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5 hover:bg-muted">
              <span className="min-w-0 text-xs">
                <span className="font-medium">{TITLES[g.section]}:</span>{" "}
                <span className="break-words">missing {g.items.join(", ")}</span>
                <span className="block text-[11px] text-muted-foreground">{g.why}</span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => {
          const now = Date.now();
          try { if (key) localStorage.setItem(key, String(now)); } catch { /* storage blocked */ }
          setLaterAt(now);
        }}>Remind me in 3 days</Button>
      </div>
    </div>
  );
}
