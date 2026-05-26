/**
 * Human-readable presentation labels for canonical asb_events topic_ids.
 *
 * Presentation-only. The canonical topic_id remains the source of truth and
 * MUST still be rendered alongside the label (caption / tooltip) so lineage
 * stays one interaction away.
 */

const EXACT: Record<string, string> = {
  "athlete.schedule.day_type": "Day type declared",
  "athlete.schedule.day_type.deleted": "Day type retracted",
  "onboarding.step_completed": "Onboarding step completed",
  "onboarding.path_selected": "Onboarding path selected",
  "onboarding.primer_acknowledged": "Primer acknowledged",
  "prescription.daily.rendered": "Daily prescription rendered",
  "prescription.override.requested": "Prescription override requested",
  "prescription.override.acknowledged": "Override acknowledged",
  "session.started": "Session started",
  "session.block.started": "Session block started",
  "session.block.completed": "Session block completed",
  "session.block.modified": "Session block modified",
  "session.block.skipped": "Session block skipped",
  "session.block.substituted": "Session block substituted",
  "session.deviation.logged": "Session deviation logged",
  "session.response.captured": "Post-session response captured",
  "runtime.feedback.captured": "Runtime feedback captured",
};

const PREFIXES: Array<[string, string]> = [
  ["foundation.pattern", "Foundation pattern flag"],
  ["behavioral.escalation", "Behavioral escalation"],
  ["behavioral.risk", "Behavioral risk signal"],
];

function titleCase(seg: string): string {
  return seg
    .split(/[._]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function topicLabel(topicId: string): string {
  if (!topicId) return "";
  if (EXACT[topicId]) return EXACT[topicId];
  for (const [p, label] of PREFIXES) {
    if (topicId === p || topicId.startsWith(p + ".")) return label;
  }
  // Fallback: title-case the trailing segment; if degenerate, return raw id.
  const segs = topicId.split(".");
  const tail = segs[segs.length - 1];
  const human = titleCase(tail);
  return human || topicId;
}

export function shortenEventId(id: string): string {
  if (!id || id.length <= 13) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}
