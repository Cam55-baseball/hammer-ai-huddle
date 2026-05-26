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
