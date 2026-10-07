/** Shows the one labelled option (Step 8 content) the planner attached to a row. Display only. */
export function ProgramContentBlock({ pc }: { pc: any }) {
  if (!pc || typeof pc.name !== "string") return null;
  const label = pc.kind === "note" ? "Coach note" : pc.kind === "check" ? "Readiness check" : "Drill option";
  return (
    <div className="rounded-md border border-border bg-muted/40 p-2 text-xs break-words" data-testid="program-content">
      <div className="font-medium text-foreground">{label}: {pc.name}</div>
      {pc.cue ? <div className="text-muted-foreground">How: {pc.cue}</div> : null}
      {pc.rest ? <div className="text-muted-foreground">Rest: {String(pc.rest).replace(/^Full rest:\s*/i, "")}</div> : null}
      {pc.kind === "drill" ? <div className="text-muted-foreground">Same sets and reps as this exercise — swap it in if you like.</div> : null}
    </div>
  );
}

/** Shows the body-size guide the planner attached to a row. Display only. */
export function LimbHintBlock({ text }: { text: unknown }) {
  if (typeof text !== "string" || !text) return null;
  return (
    <div className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground break-words" data-testid="limb-hint">
      <span className="font-medium text-foreground">Body-size guide: </span>{text}
    </div>
  );
}
