export type TimingStudyRole = "defender" | "baserunner" | "hitter" | "pitcher";
/** Study suggestions describe what to inspect, never claim a fault without its source. */
export function timingStudy(input: { role: TimingStudyRole; sport: "baseball" | "softball"; flags?: readonly string[]; goals?: readonly string[]; caughtStealing?: boolean }) {
  const signals = [...(input.flags ?? []), ...(input.goals ?? [])].join(" ").toLowerCase();
  switch (input.role) {
    case "defender": return { reason: /range|first.step|reaction/.test(signals) ? "Your saved range or first-step focus makes contact-to-first-step timing worth studying." : "For your defensive position, study how quickly you move after contact.", examples: ["Time your first step after contact."] };
    case "baserunner": return { reason: input.caughtStealing ? "Your logged game includes being thrown out stealing; study the jump, not just the run." : /steal|jump|baserun/.test(signals) ? "Your saved baserunning focus is the reason to study your jump." : "For baserunning, study your jump and the pitcher's first move.", examples: ["Time your steal jump."] };
    case "pitcher": return { reason: /timing|runner|delivery/.test(signals) ? "Your saved pitching focus is the reason to study delivery timing." : `For ${input.sport} pitching, study delivery timing with runners on.`, examples: ["Time to the plate with runners on.", input.sport === "softball" ? "Time your first move into the windmill delivery through release." : "Time your first move through release."] };
    case "hitter": return { reason: /timing|load|swing|hitting/.test(signals) ? "Your saved hitting focus is the reason to compare your load with the pitcher's delivery." : "For hitting, compare your load and foot-down with the arriving pitch.", examples: ["Time from foot-down to the ball reaching the contact zone.", "Check how early you're loaded compared to the pitcher."] };
  }
}