/**
 * The written analysis (owner P0, Oct 28): the January–September structure
 * (summary bullets with the top takeaway first, feedback, positives,
 * corrections) plus today's additions: how to check improvement, and plain
 * connections to the athlete's own data with what the clip shows kept apart
 * from what is inferred. Last in the prompt, so it outranks earlier blocks.
 */
export const WRITTEN_REPORT_CONTRACT = `

=== WRITTEN ANALYSIS CONTRACT (FINAL — overrides anything above) ===
- Write like a coach talking to a 14-year-old player. Short, plain sentences.
- summary: the FIRST bullet is the single top takeaway for this rep. The rest are key findings from THIS clip.
- positives: 1-3 things this athlete did well in THIS clip.
- improvements: every correction, each with what to change, why it matters and how to fix it.
- check_improvement: the single most important change for this athlete after watching this clip, not an exercise or test instruction. Concrete practice actions belong only to supplied, eligible Hammers library drill entries; never invent one.
- practice_checks: 0-3 short ways to practice or check a correction, each with finding_tags copied exactly from the fault_key of the improvement it belongs to. Leave empty when no improvement has a fault_key. The app turns these into tagged Hammers library drills only.
- observed_in_clip: 2-4 plain statements of what you actually saw in these pictures.
- connected_to_your_data: 0-3 short links between a finding in THIS clip and the athlete's own data (name the data you used). Leave empty when no data is recorded. These are inferences, never facts about the clip.
- Relevant recorded goals may guide library practice even when no fault is flagged. Clearly label goal work, never present a goal as a fault. Never mention their ongoing plan or invent a library drill, video or history.
- feedback for hitting must explain all four numbers plainly: 1 — Create Balance, stay supported on the back leg; 2 — Gather, collect yourself without losing balance; 3 — Load by Stride, let the stride load the body while the hands stay back; 4 — Hitter's Move, the elbow moves forward while the hands stay back and the barrel fires last. Tie the observed rep to this sequence, not a checklist of invented faults. Contact comes before post-contact extension; never coach a separate artificial hand counter-move.
- For pitching and throwing, explain the applicable supplied Hammers doctrine in everyday words: how the athlete gathers, drives toward the target, sequences the body and releases. Preserve baseball versus softball and positional differences. Explain cause, consequence and one useful correction, without repetitive roadmaps or technical jargon. Do not flag arm slot or elbow height.
- Never mention measuring, measurements, estimates, cameras, filming, clip quality, frames, pictures, video quality, grades or scores. Never add an "Optional tip" bullet.
=== END WRITTEN ANALYSIS CONTRACT ===`;

export const WRITTEN_REPORT_REQUIRED = ["check_improvement", "observed_in_clip", "connected_to_your_data"] as const;

export function writtenReportSchema() {
  return {
    check_improvement: {
      type: "string",
      description: "The single most important change for this athlete from this clip, in plain words. Not an exercise, drill, practice rep, test, schedule or dosage.",
    },
    practice_checks: {
      type: "array",
      description: "0-3 practice checks, each tied to this clip's improvements by exact fault_key tags. Never infer tags from a drill name.",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          finding_tags: { type: "array", items: { type: "string" } },
        },
        required: ["text", "finding_tags"],
      },
    },
    observed_in_clip: {
      type: "array",
      description: "2-4 plain statements of what was actually seen in this clip.",
      items: { type: "string" },
    },
    connected_to_your_data: {
      type: "array",
      description: "0-3 inferred links between a finding in this clip and the athlete's own recorded data, naming the data used. Empty when nothing is recorded.",
      items: { type: "string" },
    },
  };
}

const strings = (v: unknown, max: number) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim()).slice(0, max) : [];

export function readWrittenReportFields(args: Record<string, unknown> | null | undefined) {
  const check = typeof args?.check_improvement === "string" ? args.check_improvement.trim() : "";
  // Only tags that name one of THIS report's own improvement fault keys survive.
  const ownKeys = new Set(Array.isArray(args?.improvements)
    ? (args!.improvements as unknown[]).map((i: any) => typeof i?.fault_key === "string" ? i.fault_key.trim() : "").filter(Boolean)
    : []);
  const practice_checks = (Array.isArray(args?.practice_checks) ? args!.practice_checks as unknown[] : [])
    .flatMap((item: any) => {
      const text = typeof item?.text === "string" ? item.text.trim() : "";
      const finding_tags = strings(item?.finding_tags, 5).filter((t) => ownKeys.has(t));
      return text && finding_tags.length ? [{ text, finding_tags }] : [];
    }).slice(0, 3);
  return {
    check_improvement: check.length > 0 ? check : null,
    practice_checks,
    observed_in_clip: strings(args?.observed_in_clip, 4),
    connected_to_your_data: strings(args?.connected_to_your_data, 3),
  };
}
