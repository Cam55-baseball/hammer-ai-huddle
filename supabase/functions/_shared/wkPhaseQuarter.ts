// Server mirror of src/lib/hammer/workout/phaseQuarter.ts — keep in sync.
import { resolveSeasonPhase, type SeasonSettingsLike } from "./seasonPhase.ts";

export type WkPhase =
  | "os_q1"
  | "os_q2"
  | "os_q3"
  | "os_q4"
  | "in_season"
  | "post_season";

const QUARTER_LABEL: Record<WkPhase, string> = {
  os_q1: "Offseason Q1 — Strength & Capacity",
  os_q2: "Offseason Q2 — Power Build",
  os_q3: "Offseason Q3 — Elastic Transfer",
  os_q4: "Offseason Q4 — Sport Sharpen",
  in_season: "In-Season — Strength Primer",
  post_season: "Post-Season — Decompress",
};

export interface WkPhaseResolution {
  phase: WkPhase;
  displayName: string;
  source: "date_window" | "stored" | "default";
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return Number.isFinite(d.getTime()) ? d : null;
}

export function resolveWkPhase(
  settings: SeasonSettingsLike | null | undefined,
  now: Date = new Date(),
): WkPhaseResolution {
  const seasonRes = resolveSeasonPhase(settings);
  if (seasonRes.phase === "in_season") {
    return { phase: "in_season", displayName: QUARTER_LABEL.in_season, source: seasonRes.source };
  }
  if (seasonRes.phase === "post_season") {
    return { phase: "post_season", displayName: QUARTER_LABEL.post_season, source: seasonRes.source };
  }
  if (seasonRes.phase === "preseason") {
    return { phase: "os_q4", displayName: QUARTER_LABEL.os_q4, source: seasonRes.source };
  }
  // seasonRes.phase === "off_season"
  // Guard: if the resolver had to default (no signal AND no explicit off-season
  // window) but the athlete stored a non-off_season status, honor the stored
  // status instead of showing "Offseason Q1". Only true default users see os_q1.
  if (seasonRes.source === "default") {
    const stored = (settings?.season_status ?? "").toString();
    if (stored === "in_season") {
      return { phase: "in_season", displayName: QUARTER_LABEL.in_season, source: "stored" };
    }
    if (stored === "post_season") {
      return { phase: "post_season", displayName: QUARTER_LABEL.post_season, source: "stored" };
    }
    if (stored === "preseason") {
      return { phase: "os_q4", displayName: QUARTER_LABEL.os_q4, source: "stored" };
    }
  }
  const postEnd = parseDate(settings?.post_season_end_date);
  const preStart = parseDate(settings?.preseason_start_date);
  if (postEnd && preStart && preStart > postEnd) {
    const totalMs = preStart.getTime() - postEnd.getTime();
    const frac = Math.min(1, Math.max(0, now.getTime() - postEnd.getTime()) / totalMs);
    const q: WkPhase = frac < 0.25 ? "os_q1" : frac < 0.5 ? "os_q2" : frac < 0.75 ? "os_q3" : "os_q4";
    return { phase: q, displayName: QUARTER_LABEL[q], source: "date_window" };
  }
  return { phase: "os_q1", displayName: QUARTER_LABEL.os_q1, source: "default" };
}

export function isOffseasonPhase(p: WkPhase): boolean {
  return p === "os_q1" || p === "os_q2" || p === "os_q3" || p === "os_q4";
}
