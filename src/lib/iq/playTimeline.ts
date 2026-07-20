/**
 * Play Timeline
 * =============
 * Normalizes a Game IQ scenario into a single 0..1 clock that drives
 * defender routes, runner advances, and the ball track in lock step
 * during "Watch the play" playback.
 *
 * Back-compat: authors that never set explicit `start_at`/`end_at` on an
 * actor or per-waypoint `t` still animate — we auto-space defenders across
 * 0.15..0.95 and interpolate their waypoints evenly along that window.
 */
import type { IqActor, IqActorRole, IqScenario } from "./types";
import { resolveRolePath, type TargetWaypoint } from "./pathResolver";
import type { AlignmentPositions } from "@/hooks/useDefensiveAlignment";

export interface BallTrackPoint {
  x: number;
  y: number;
  t: number;                  // 0..1
  kind?: "pitch" | "batted" | "thrown";
}

export interface TimelineActorTrack {
  role: IqActorRole;
  /** Interpolated screen points sampled densely on 0..1. */
  samples: { x: number; y: number; t: number }[];
  startAt: number;
  endAt: number;
}

export interface ResolvedTimeline {
  duration: number;                          // seconds at 1× speed
  actors: TimelineActorTrack[];
  ball: BallTrackPoint[];                    // sorted by t
}

/** Sample count per actor path — dense enough for smooth motion, cheap. */
const SAMPLES_PER_ROLE = 24;

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

function interpolatePath(
  pts: { x: number; y: number }[],
  n: number,
): { x: number; y: number; t: number }[] {
  if (pts.length === 0) return [];
  if (pts.length === 1) {
    return Array.from({ length: n }, (_, i) => ({
      x: pts[0].x, y: pts[0].y, t: i / (n - 1),
    }));
  }
  // Cumulative length param
  const seg: number[] = [0];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    total += Math.hypot(dx, dy);
    seg.push(total);
  }
  const out: { x: number; y: number; t: number }[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const target = u * total;
    // Find segment
    let j = 1;
    while (j < seg.length && seg[j] < target) j++;
    const a = pts[j - 1]; const b = pts[Math.min(j, pts.length - 1)];
    const span = Math.max(1e-6, seg[Math.min(j, seg.length - 1)] - seg[j - 1]);
    const localT = (target - seg[j - 1]) / span;
    out.push({
      x: a.x + (b.x - a.x) * localT,
      y: a.y + (b.y - a.y) * localT,
      t: u,
    });
  }
  return out;
}

interface BuildArgs {
  actors: IqActor[];
  scenario?: IqScenario | null;
  positions: AlignmentPositions;
  posFor: (role: IqActorRole) => { x: number; y: number };
  /** Total playback duration at 1× (seconds). */
  duration?: number;
}

export function buildTimeline({
  actors, scenario, positions, posFor, duration = 3.2,
}: BuildArgs): ResolvedTimeline {
  const resolvedMap: Partial<Record<IqActorRole, { x: number; y: number }>> = {};
  actors.forEach((a) => { resolvedMap[a.role] = posFor(a.role); });

  const defenderActors = actors.filter((a) => !["R1","R2","R3","BR","BAT"].includes(a.role));
  const N = Math.max(1, defenderActors.length);

  const tracks: TimelineActorTrack[] = actors.map((a, idx) => {
    const start = posFor(a.role);
    const path = a.primary_path?.length
      ? resolveRolePath(a.role, start, a.primary_path as TargetWaypoint[], { positions: resolvedMap })
      : [start];
    // Default staggered window per role, unless explicit start_at / end_at set on actor.
    const anyA = a as unknown as { start_at?: number; end_at?: number };
    const defStart = 0.15 + (idx / N) * 0.05;
    const defEnd = 0.95;
    const startAt = clamp01(anyA.start_at ?? defStart);
    const endAt = clamp01(anyA.end_at ?? defEnd);
    const samples = interpolatePath(path, SAMPLES_PER_ROLE).map((s) => ({
      ...s,
      t: startAt + s.t * Math.max(0, endAt - startAt),
    }));
    return { role: a.role, samples, startAt, endAt };
  });

  const ball: BallTrackPoint[] = (() => {
    const raw = (scenario as unknown as { ball_track?: BallTrackPoint[] } | null)?.ball_track;
    if (!raw || !Array.isArray(raw) || raw.length === 0) return [];
    return [...raw]
      .filter((p) => typeof p?.x === "number" && typeof p?.y === "number" && typeof p?.t === "number")
      .sort((a, b) => a.t - b.t);
  })();

  return { duration, actors: tracks, ball };
}

/** Sample an actor's position at time t (0..1). Returns undefined before startAt. */
export function sampleActor(track: TimelineActorTrack, t: number): { x: number; y: number } | undefined {
  if (t <= track.startAt) return track.samples[0];
  if (t >= track.endAt) return track.samples[track.samples.length - 1];
  const local = (t - track.startAt) / Math.max(1e-6, track.endAt - track.startAt);
  const idxF = local * (track.samples.length - 1);
  const i = Math.floor(idxF);
  const f = idxF - i;
  const a = track.samples[i];
  const b = track.samples[Math.min(i + 1, track.samples.length - 1)];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

/** Sample the ball at time t (0..1). Returns undefined before first ball point or if none. */
export function sampleBall(track: BallTrackPoint[], t: number): { x: number; y: number; kind?: BallTrackPoint["kind"] } | undefined {
  if (track.length === 0) return undefined;
  if (t <= track[0].t) return undefined;
  if (t >= track[track.length - 1].t) return track[track.length - 1];
  for (let i = 1; i < track.length; i++) {
    if (track[i].t >= t) {
      const a = track[i - 1]; const b = track[i];
      const f = (t - a.t) / Math.max(1e-6, b.t - a.t);
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, kind: b.kind };
    }
  }
  return track[track.length - 1];
}
