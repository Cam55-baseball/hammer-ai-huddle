/**
 * Digest sentence builders — fixed templates only.
 *
 * No string interpolation outside enumerated slots. No generative prose.
 * No psychological interpretation. No speculative coaching.
 */
import type { DigestProjection } from "./projections";
import { topicLabel } from "@/lib/asb/topicLabels";

function direction(delta: number | null): "increased" | "decreased" | "unchanged" {
  if (delta == null) return "unchanged";
  if (delta > 0) return "increased";
  if (delta < 0) return "decreased";
  return "unchanged";
}

export function workloadShiftSentence(p: DigestProjection): string {
  if (p.value == null) return "No scheduled-day events observed in the last 7 days.";
  const curr = p.value as number;
  const prev = curr - (p.delta ?? 0);
  return `Workload continuity ${direction(p.delta)} from ${prev} scheduled days to ${curr} scheduled days week-over-week.`;
}

export function organismChangeSentence(p: DigestProjection): string {
  if (p.value == null) return "No organism events observed in the last 7 days.";
  const curr = p.value as number;
  return `${curr} canonical organism events recorded this week (${direction(p.delta)} vs prior 7 days).`;
}

export function escalationEmergenceSentence(p: DigestProjection): string {
  if (p.value == null) return "No behavioral escalation topics detected in the last 7 days.";
  const n = p.value as number;
  if (n === 0) return "No new escalation topics emerged this week.";
  return `${n} new escalation topic${n === 1 ? "" : "s"} emerged this week.`;
}

export function escalationResolutionSentence(p: DigestProjection): string {
  if (p.value == null) return "No prior escalations to evaluate for resolution.";
  const n = p.value as number;
  if (n === 0) return "No prior escalation topics were resolved this week.";
  return `${n} prior escalation topic${n === 1 ? "" : "s"} did not recur this week.`;
}

export function behavioralTrendSentence(p: DigestProjection): string {
  if (p.value == null) return "No behavioral events observed in the last 7 days.";
  return `Behavioral events ${direction(p.delta)} compared to the prior 7-day window.`;
}

export function recoveryContinuitySentence(p: DigestProjection): string {
  if (p.value == null) return "No recovery-related events observed in the last 7 days.";
  return `Recovery-related events ${direction(p.delta)} compared to the prior 7-day window.`;
}

export function missingSignalSentence(topics: string[]): string {
  if (topics.length === 0) return "All tracked topics emitted at least one event this week.";
  if (topics.length === 1)
    return `1 tracked topic emitted no events this week (${topicLabel(topics[0])}).`;
  return `${topics.length} tracked topics emitted no events this week.`;
}

// ── Forecast sentences (bounded continuation only) ──────────────────────────

export function continuationSentence(
  p: DigestProjection,
  label: string,
): string {
  if (p.value == null || p.value === 0) {
    return `No ${label} events observed in the projection window.`;
  }
  const n = p.value as number;
  return `Current ${label} trend has persisted for ${n} day${n === 1 ? "" : "s"}.`;
}

export function escalationPersistenceSentence(hoursValue: DigestProjection): string {
  if (hoursValue.value == null) {
    return "No behavioral escalation events in the projection window.";
  }
  const h = hoursValue.value as number;
  return `Behavioral escalation events unresolved for ${h}h.`;
}

export function missingnessProjectionSentence(
  topic: string,
  hoursValue: DigestProjection,
): string {
  if (hoursValue.value == null) {
    return `No ${topic} events observed in the projection window.`;
  }
  const h = hoursValue.value as number;
  const days = Math.floor(h / 24);
  if (days >= 1) {
    return `No ${topic} events observed in ${days} day${days === 1 ? "" : "s"}.`;
  }
  return `Last ${topic} event observed ${h}h ago.`;
}

export const FORECAST_BOUNDARY_DISCLAIMER =
  "Bounded projection — not deterministic future state.";

// ── Plain-language organism story ──────────────────────────────────────────

export type OrganismStateWord =
  | "stable"
  | "building"
  | "overloaded"
  | "recovering"
  | "ready";

export function organismStateWord(p: {
  workloadShift: DigestProjection;
  recoveryContinuity: DigestProjection;
  behavioralTrend: DigestProjection;
  escalationEmerged: DigestProjection;
}): OrganismStateWord {
  const esc = (p.escalationEmerged.value as number | null) ?? 0;
  if (esc > 0) return "overloaded";
  const workDelta = p.workloadShift.delta ?? 0;
  const recDelta = p.recoveryContinuity.delta ?? 0;
  if (workDelta > 2 && recDelta <= 0) return "overloaded";
  if (recDelta > 0 && workDelta <= 0) return "recovering";
  if (workDelta > 0 && recDelta >= 0) return "building";
  if (workDelta === 0 && recDelta >= 0) return "ready";
  return "stable";
}

export function improvedSentence(
  workloadShift: DigestProjection,
  recoveryContinuity: DigestProjection,
): string {
  const rec = recoveryContinuity.delta ?? 0;
  const work = workloadShift.delta ?? 0;
  if (rec > 0) return "You are recovering better than last week.";
  if (work > 0) return "You showed up on more scheduled days than last week.";
  return "Nothing stood out as improved this week.";
}

export function attentionSentence(
  behavioralTrend: DigestProjection,
  escalationEmerged: DigestProjection,
): string {
  const esc = (escalationEmerged.value as number | null) ?? 0;
  if (esc > 0) {
    return `This week, ${esc} new pattern${esc === 1 ? "" : "s"} need${esc === 1 ? "s" : ""} a closer look.`;
  }
  const beh = behavioralTrend.delta ?? 0;
  if (beh > 0) return "This week your workload climbed faster than usual.";
  if (beh < 0) return "Activity has eased — keep an eye on consistency.";
  return "Nothing urgent. Keep going.";
}

export function whatToDoNextSentence(state: OrganismStateWord): string {
  switch (state) {
    case "overloaded":
      return "Take it easier for 2–3 days and protect your sleep window.";
    case "recovering":
      return "Hold your current rhythm. Add one light session when ready.";
    case "building":
      return "Stay steady. Don’t add new load until next week.";
    case "ready":
      return "You can lean into your plan. Keep recovery consistent.";
    case "stable":
    default:
      return "Keep your routine. Small consistent days beat big ones.";
  }
}

// ── Plain-language forecast (anti-jargon, anti-fear) ───────────────────────

export type ForecastHorizon = "3d" | "7d" | "long";

export function plainForecastSentence(
  horizon: ForecastHorizon,
  workload: DigestProjection,
  readiness: DigestProjection,
): string {
  const w = (workload.value as number | null) ?? 0;
  const r = (readiness.value as number | null) ?? 0;
  const horizonText =
    horizon === "3d" ? "next 3 days" : horizon === "7d" ? "next week" : "weeks ahead";
  if (w === 0 && r === 0) {
    return `Not enough recent activity to describe the ${horizonText} yet.`;
  }
  if (w >= 5 && r < 3) {
    return `You may feel more tired in the ${horizonText} if recovery stays low.`;
  }
  if (r >= 3 && w <= 3) {
    return `If you keep current habits, you should feel ready through the ${horizonText}.`;
  }
  return `If your current pattern continues, expect a steady ${horizonText}.`;
}

export function plainForecastHelp(horizon: ForecastHorizon): string {
  return horizon === "3d"
    ? "Sleep on time. Hydrate. Keep effort moderate."
    : horizon === "7d"
      ? "Protect 1 full rest day. Keep your sleep window consistent."
      : "Hold your weekly rhythm. Avoid sudden jumps in training load.";
}

export function plainForecastRisk(horizon: ForecastHorizon): string {
  return horizon === "3d"
    ? "Late nights and skipped meals raise fatigue fastest."
    : horizon === "7d"
      ? "Back-to-back high-load days without recovery raise risk."
      : "Long stretches without rest days slowly drain capacity.";
}
