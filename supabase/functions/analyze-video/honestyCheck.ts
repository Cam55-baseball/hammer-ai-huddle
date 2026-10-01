/**
 * Honesty check (owner ruling 2026-10-01: "This is lying and it needs to be fixed").
 *
 * The model is shown a handful of still frames, not the video. It must never
 * assert anything about the footage itself — edits, cuts, missing frames,
 * broadcast production, off-screen events — nor quote on-screen readouts such
 * as exit speed. Any sentence that does is removed and flagged. Pure: no
 * Deno or network imports, so it is unit-tested from vitest.
 */

const FOOTAGE_CLAIM_PATTERNS: RegExp[] = [
  /\b(camera|broadcast|video|footage|clip|feed|tv)\b[^.!?]{0,60}\b(cut|cuts|edit|edits|edited|switch(?:es|ed)?|jump(?:s|ed)?|transition(?:s|ed)?)\b/i,
  /\b(cut|cuts|edit|edits|edited)\b[^.!?]{0,40}\b(away|out|to|from|directly)\b/i,
  /\b(camera|broadcast)\s+(edit|cut|angle change|switch)/i,
  /\b(frames?|contact|swing|stride|motion|release|delivery)\b[^.!?]{0,40}\b(are|is|were|was)\s+(missing|cut out|cut off|not (?:shown|included|captured|in the (?:clip|video)))\b/i,
  /\bmissing\s+(frames?|footage|contact frame)\b/i,
  /\b(cut out|cut off) by\b/i,
  /\boff[- ]screen\b/i,
  /\breplay\b[^.!?]{0,30}\b(shows?|angle)\b/i,
  /\bbroadcast (production|graphics|overlay|video|footage|camera)\b/i,
];

const READOUT_PATTERNS: RegExp[] = [
  /\bexit (velocity|speed|velo)\b/i,
  /\b\d+(?:\.\d+)?\s*mph\b/i,
  /\b(on-screen|onscreen|scoreboard|overlay|graphic)\b/i,
];

export interface HonestyFlag { field: string; sentence: string; kind: "footage_claim" | "onscreen_readout" }

export function findFootageClaims(text: string): Array<{ sentence: string; kind: HonestyFlag["kind"] }> {
  const out: Array<{ sentence: string; kind: HonestyFlag["kind"] }> = [];
  for (const sentence of splitSentences(text)) {
    if (FOOTAGE_CLAIM_PATTERNS.some((r) => r.test(sentence))) out.push({ sentence, kind: "footage_claim" });
    else if (READOUT_PATTERNS.some((r) => r.test(sentence))) out.push({ sentence, kind: "onscreen_readout" });
  }
  return out;
}

function splitSentences(text: string): string[] {
  return String(text ?? "").split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}

function scrubText(text: string, field: string, flags: HonestyFlag[]): string {
  const kept: string[] = [];
  for (const sentence of splitSentences(text)) {
    const hit = findFootageClaims(sentence)[0];
    if (hit) flags.push({ field, sentence, kind: hit.kind });
    else kept.push(sentence);
  }
  return kept.join(" ");
}

interface Improvement { phase?: string; fault?: string; why?: string; fix?: string; fault_key?: string }

export function scrubFootageClaims(input: {
  summary: string[];
  feedback: string;
  positives: string[];
  improvements: Improvement[];
  clean_reason: string | null;
}) {
  const flags: HonestyFlag[] = [];
  const summary = (input.summary ?? []).map((s, i) => scrubText(s, `summary[${i}]`, flags)).filter(Boolean);
  const positives = (input.positives ?? []).map((s, i) => scrubText(s, `positives[${i}]`, flags)).filter(Boolean);
  const feedbackRaw = scrubText(input.feedback ?? "", "feedback", flags);
  const improvements = (input.improvements ?? [])
    .map((imp, i) => ({
      ...imp,
      fault: scrubText(imp.fault ?? "", `improvements[${i}].fault`, flags),
      why: scrubText(imp.why ?? "", `improvements[${i}].why`, flags),
      fix: scrubText(imp.fix ?? "", `improvements[${i}].fix`, flags),
    }))
    .filter((imp) => imp.fault);
  const clean_reason = input.clean_reason ? scrubText(input.clean_reason, "clean_reason", flags) || null : null;
  return {
    summary,
    positives,
    feedback: feedbackRaw || "We couldn't make a trustworthy coaching call on this from the frames we saw.",
    improvements,
    clean_reason,
    flags,
  };
}
