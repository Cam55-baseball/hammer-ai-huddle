import { useSubscription } from "@/hooks/useSubscription";

export function rulesForCard(category: string, modules: readonly string[]): string[] {
  const key = category.toLowerCase();
  const rules: string[] = [];
  if (key === "speed" || key === "conditioning") {
    rules.push("Leave at least one full rest day between hard running days. No hard running the day before a game.");
    if (key === "speed") rules.push("Warm up first. Rest fully between sprints and stop if your speed or form drops.");
    if (modules.some(m => m.endsWith("_5tool") || m.endsWith("_golden2way"))) {
      rules.push("Every steal attempt counts as a hard sprint.");
      if (modules.some(m => m.endsWith("_golden2way"))) rules.push("Steal practice is for position days, not your start day or the day before or after.");
    }
  }
  if (key === "lift") rules.push("Do your lift after skill work or after the game, as prescribed.", "Never make up a missed lift on another day. Use only your prescribed weight and rest times.");
  if (key === "bat speed" || key === "hitting") rules.push("Warm up before fast swings. Heavy and light bat work is never on consecutive days. Stop for pain or a loss of control.");
  if (key === "pitching" || key === "throwing" || key === "windmill pitching") rules.push("Warm up before throwing. Count every throw toward your throwing limit. Follow your prescribed rest days.", "Stop immediately for arm pain; do not add extra throws.");
  if (key === "warm-up") rules.push("Finish your warm-up before hard throws, swings, sprints or lifts. Stop for pain.");
  if (key === "defense") rules.push("Follow today's position drills. Stop for pain or when you can no longer move cleanly.");
  if (key === "recovery" || key === "mobility") rules.push("Keep this easy. Do not push into pain.");
  return rules;
}

export function CardRules({ category }: { category: string }) {
  const { modules } = useSubscription();
  const rules = rulesForCard(category, modules);
  if (!rules.length) return null;
  return <section data-card-rules className="mb-3 border-b border-border pb-3 text-sm">
    <h3 className="font-semibold text-foreground">Rules for this card</h3>
    <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">{rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
  </section>;
}