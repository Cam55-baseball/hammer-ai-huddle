/**
 * Round 8 Step 7a — Key Rules panel. Plain-words list of the rules the plan
 * builder already enforces for this player. Display only: it never changes
 * a card. Wording must stay true to `schedule/finalCheck.ts`,
 * `batSpeed/programGate.ts` and the age/growth rules.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { batSpeedProgramOf } from "../../../../supabase/functions/_shared/wic/batSpeed/programGate";
import { ageNow } from "./CompetitionLevelPrompt";

export interface KeyRulesInput {
  sport: "baseball" | "softball";
  modules: readonly string[];
  isPitcher: boolean;
  age: number | null;
}

export function keyRulesFor(i: KeyRulesInput): string[] {
  const k = i.sport;
  const has = (m: string) => i.modules.includes(`${k}_${m}`);
  const pitcherOnly = batSpeedProgramOf(i.modules) === "velocity";
  const rules = [
    "Hard running (sprints, hard conditioning, steal attempts): at least one full day off between, and never the day before a game.",
    "Big jump days: at least one full day off between.",
    "Heavy and light bat work: never two days in a row.",
    "A missed lift is never made up or moved to another day.",
    "Mark each card Done, Cut short or Missed. You can change it for 7 days.",
  ];
  if (has("5tool") || has("golden2way")) {
    rules.push(has("golden2way")
      ? "Base Stealer: on position days only — not on the day you start, the day before or the day after."
      : "Base Stealer: every steal attempt counts as a hard sprint.");
  }
  if (pitcherOnly) {
    rules.push("Bat speed is velocity training: up to 2 days a week off-season, 1 a week pre-season, 1 a week in season (light bats only). Never on a start day or the day before or after.");
  }
  if (i.isPitcher) {
    rules.push("The day after you pitch is an easy flush. The day before a start is a light primer.");
    if (k === "baseball") rules.push("Pick-off work is for baseball pitchers only.");
  }
  if (i.age != null && i.age < 13) rules.push("Weighted balls are not used under age 13.");
  if (i.age != null && i.age < 16) rules.push("Heavy lifting starts at age 16, with enough training years and no growth spurt.");
  return rules;
}

export function KeyRulesPanel(props: Omit<KeyRulesInput, "age">) {
  const [open, setOpen] = useState(false);
  const { user } = useOptionalAuth();
  const dob = useQuery({
    queryKey: ["level-prompt-dob", user?.id], enabled: !!user,
    queryFn: async () => ((await supabase.from("profiles").select("date_of_birth").eq("id", user!.id).maybeSingle()).data as any)?.date_of_birth ?? null,
  });
  const rules = keyRulesFor({ ...props, age: ageNow(dob.data ?? null) });
  return (
    <div data-key-rules className="rounded-md border border-border text-xs">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center justify-between p-2 font-medium">
        <span>Key rules for your plan ({rules.length})</span>
        <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="list-disc space-y-1 px-6 pb-2 text-muted-foreground">
          {rules.map((r) => <li key={r}>{r}</li>)}
        </ul>
      )}
    </div>
  );
}
