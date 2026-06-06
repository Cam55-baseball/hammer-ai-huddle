/**
 * Post-Launch Observability — Intelligence Utilization Reducer
 *
 * Per-surface view counters derived from existing view/open ASB topics.
 * Surfaces with no canonical view topic are reported as `unobservable: true`.
 * Measurement only — never feeds ranking, never authors organism truth.
 */

import type { AsbEventRow } from "@/hooks/useAsbTimeline";

export type IntelligenceSurface =
  | "uhrc"
  | "detailed_analysis"
  | "hammer"
  | "roadmap"
  | "recruiting"
  | "coach_intelligence"
  | "trends";

export interface SurfaceDef {
  surface: IntelligenceSurface;
  topic: string | null; // null = instrumentation gap
}

export const SURFACE_DEFS: SurfaceDef[] = [
  { surface: "uhrc", topic: null },
  { surface: "detailed_analysis", topic: null },
  { surface: "hammer", topic: null },
  { surface: "roadmap", topic: null }, // partial via athlete_roadmap_progress
  { surface: "recruiting", topic: "relational.exposure" },
  { surface: "coach_intelligence", topic: null },
  { surface: "trends", topic: null },
];

export interface SurfaceUtilization {
  surface: IntelligenceSurface;
  eligible_users: number;
  unique_viewers: number;
  total_views: number;
  view_rate: number;
  median_views_per_viewer: number | null;
  zero_consumption_users: number;
  unobservable: boolean;
  flags: string[];
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function topicMatches(row: AsbEventRow, topic: string): boolean {
  return row.topic_id === topic || row.topic_id.startsWith(topic + ".");
}

export function computeIntelligenceUtilization(
  rows: AsbEventRow[],
  eligibleUserIds: string[],
): SurfaceUtilization[] {
  const eligible = new Set(eligibleUserIds);
  const eligible_users = eligible.size;

  return SURFACE_DEFS.map((def) => {
    if (def.topic === null) {
      return {
        surface: def.surface,
        eligible_users,
        unique_viewers: 0,
        total_views: 0,
        view_rate: 0,
        median_views_per_viewer: null,
        zero_consumption_users: eligible_users,
        unobservable: true,
        flags: ["surface_dark"],
      };
    }

    const viewsByUser = new Map<string, number>();
    let total_views = 0;
    for (const row of rows) {
      if (!topicMatches(row, def.topic)) continue;
      const uid = row.actor_id ?? row.athlete_id;
      if (!uid || !eligible.has(uid)) continue;
      viewsByUser.set(uid, (viewsByUser.get(uid) ?? 0) + 1);
      total_views += 1;
    }

    const unique_viewers = viewsByUser.size;
    const view_rate = eligible_users ? unique_viewers / eligible_users : 0;
    const median_views_per_viewer = median([...viewsByUser.values()]);
    const zero_consumption_users = eligible_users - unique_viewers;

    const flags: string[] = [];
    if (view_rate < 0.05 && eligible_users >= 20) flags.push("surface_unused");
    if (view_rate >= 0.5) flags.push("surface_dominant");

    return {
      surface: def.surface,
      eligible_users,
      unique_viewers,
      total_views,
      view_rate: +view_rate.toFixed(3),
      median_views_per_viewer,
      zero_consumption_users,
      unobservable: false,
      flags,
    };
  });
}
