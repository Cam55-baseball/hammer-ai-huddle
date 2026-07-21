// Top-down baseball/softball diamond. Renders actors as dots with
// animated routes that ALWAYS originate from the resolved defender
// position (shift, DP depth, no-doubles, wheel, etc. all carry over).
//
// Playback: when `playing` is true, the whole scene is driven by a
// shared 0..1 timeline — defenders, the ball, and coach overlays all
// read from the same clock so movement stays in sync.

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IqActor, IqActorRole, IqAssignment, IqScenario, IqSituation } from "@/lib/iq/types";
import { ASSIGNMENT_COLOR, ROLE_LABELS } from "@/lib/iq/types";
import { IqField } from "./IqField";
import type { FieldSport } from "@/lib/iq/fieldModel";
import {
  DEFAULT_DEFENDER_POS,
  LANDMARKS,
  buildResolvedDefenderMap,
  pointsToPathD,
  resolveRolePath,
} from "@/lib/iq/pathResolver";
import { buildTimeline, sampleActor, sampleBall } from "@/lib/iq/playTimeline";
import { IqCoachOverlay, type OverlayMode } from "./IqCoachOverlay";

interface IqDiamondProps {
  actors: IqActor[];
  mode: "teach" | "quiz" | "reveal";
  highlightRole?: IqActorRole | null;
  className?: string;
  /** Per-role positional shift in percent points on the 100×100 grid. */
  roleShifts?: Record<string, { dx: number; dy: number }>;
  /** Owner-editable defender starting positions (from `iq_defensive_alignments`). */
  defensivePositions?: Partial<Record<IqActorRole, { x: number; y: number }>>;
  /** Sport for field geometry (baseball / softball). Defaults to baseball. */
  sport?: FieldSport;
  /** Batter handedness — highlights the correct batter box. */
  batterSide?: "R" | "L";
  /** Externally-controlled play clock (0..1). When set, drives the scene. */
  progress?: number;
  /** Legacy toggle — when true and `progress` unset, plays a one-shot ~1.4s route. */
  playing?: boolean;
  /** Optional scenario (used to fetch `ball_track` for the ball animation). */
  scenario?: IqScenario | null;
  /** Optional situation (used to synthesize a play if paths are missing). */
  situation?: Pick<IqSituation, "slug" | "title"> | null;
  /** Coach overlay filter. */
  overlay?: OverlayMode;
}

const OFFENSIVE_POS: Partial<Record<IqActorRole, { x: number; y: number }>> = {
  R1: { x: 76, y: 70 },
  R2: { x: 50, y: 40 },
  R3: { x: 24, y: 70 },
  BR: { x: 50, y: 96 },
  BAT: { x: 50, y: 96 },
};

export function IqDiamond({
  actors, mode, highlightRole, className, roleShifts, defensivePositions,
  sport = "baseball", batterSide = "R", playing = false, progress, scenario, situation,
  overlay = "off",
}: IqDiamondProps) {
  const posFor = (role: IqActorRole) => {
    const base =
      defensivePositions?.[role] ??
      DEFAULT_DEFENDER_POS[role] ??
      OFFENSIVE_POS[role] ??
      { x: 50, y: 50 };
    const s = roleShifts?.[role];
    if (!s) return base;
    return {
      x: Math.max(2, Math.min(98, base.x + s.dx)),
      y: Math.max(2, Math.min(98, base.y + s.dy)),
    };
  };

  const resolvedMap = useMemo(() => {
    const m = defensivePositions ? buildResolvedDefenderMap(defensivePositions) : {};
    actors.forEach((a) => { if (!m[a.role]) m[a.role] = posFor(a.role); });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defensivePositions, actors]);

  const timeline = useMemo(
    () => buildTimeline({
      actors,
      scenario: scenario ?? null,
      situation: situation ?? null,
      positions: (defensivePositions ?? {}) as never,
      posFor,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actors, scenario, situation, defensivePositions, roleShifts],
  );

  // Internal 1.4s auto-play when `playing` toggles true without external progress.
  const [autoT, setAutoT] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (progress !== undefined) return;
    if (!playing) { setAutoT(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 1400);
      setAutoT(t);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, progress]);

  const clock = progress ?? autoT;
  const isPlaying = progress !== undefined ? progress > 0 : playing;

  const showPaths = mode === "teach" || mode === "reveal" || isPlaying;

  // Live sample for overlays / dot positions when playing.
  const livePosOf = (role: IqActorRole) => {
    if (!isPlaying) return posFor(role);
    const track = timeline.actors.find((t) => t.role === role);
    if (!track) return posFor(role);
    return sampleActor(track, clock) ?? posFor(role);
  };

  const ballPos = isPlaying ? sampleBall(timeline.ball, clock) : undefined;

  const landmarkOf = (target: string) => {
    if (target === "ball") return ballPos ? { x: ballPos.x, y: ballPos.y } : undefined;
    if (target in LANDMARKS) return LANDMARKS[target as keyof typeof LANDMARKS];
    if (resolvedMap[target as IqActorRole]) return resolvedMap[target as IqActorRole];
    return undefined;
  };

  return (
    <div className={"relative w-full aspect-square overflow-hidden rounded-2xl border " + (className ?? "")}
         style={{ background: "hsl(var(--iq-field))" }}>
      <IqField sport={sport} batterSide={batterSide} />

      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        {/* Route lines — always anchored to resolved set positions. */}
        {showPaths && actors.flatMap((a) => {
          const start = posFor(a.role);
          let pts: { x: number; y: number }[] | null = null;
          if (a.primary_path?.length) {
            pts = resolveRolePath(a.role, start, a.primary_path, { positions: resolvedMap });
          } else {
            // Fall back to the synthesized timeline samples for this role.
            const track = timeline.actors.find((t) => t.role === a.role);
            if (track && track.samples.length > 1) {
              const first = track.samples[0];
              const last = track.samples[track.samples.length - 1];
              if (Math.hypot(last.x - first.x, last.y - first.y) > 1.5) {
                pts = track.samples.map((s) => ({ x: s.x, y: s.y }));
              }
            }
          }
          if (!pts || pts.length < 2) return [];
          const d = pointsToPathD(pts);
          const dimmed = highlightRole && highlightRole !== a.role;
          return [(
            <motion.path key={`path-${a.role}`} d={d}
              fill="none" stroke={ASSIGNMENT_COLOR[a.assignment]}
              strokeWidth={highlightRole === a.role ? 0.95 : 0.55}
              strokeDasharray="1.2 1.2" strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: dimmed ? 0.25 : 0.9 }}
              transition={{ duration: isPlaying ? 1.4 : 1.1, ease: "easeOut" }} />
          )];
        })}

        {/* Ball trail + puck (only when a ball_track exists). */}
        {isPlaying && timeline.ball.length > 1 && (
          <path
            d={pointsToPathD(timeline.ball.map((p) => ({ x: p.x, y: p.y })))}
            fill="none" stroke="hsl(48 95% 60%)" strokeWidth={0.5}
            strokeDasharray="0.4 0.8" opacity={0.55}
          />
        )}
        {ballPos && (
          <circle cx={ballPos.x} cy={ballPos.y} r={1.4}
                  fill="hsl(48 95% 60%)" stroke="hsl(24 20% 15%)" strokeWidth={0.25} />
        )}
      </svg>

      {/* Coach overlay chips + sight lines. */}
      <IqCoachOverlay
        actors={actors}
        mode={mode === "quiz" && !isPlaying ? "off" : overlay}
        positionOf={livePosOf}
        landmarkOf={landmarkOf}
        highlightRole={highlightRole ?? undefined}
      />

      {/* Actor dots — during playback they follow their sampled position. */}
      {actors.map((a) => {
        const p = livePosOf(a.role);
        const showColor = mode !== "quiz";
        const isHi = highlightRole === a.role;
        return (
          <motion.button
            key={a.role}
            type="button"
            initial={{ scale: 0.5, opacity: 0, left: `${p.x}%`, top: `${p.y}%` }}
            animate={{ left: `${p.x}%`, top: `${p.y}%`, scale: isHi ? 1.15 : 1, opacity: 1 }}
            transition={{ delay: 0.05, type: "spring", stiffness: 220, damping: 22 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
          >
            <div className="rounded-full border-2 shadow-lg flex items-center justify-center font-bold text-[10px] sm:text-xs"
                 style={{
                   width: "clamp(22px, 4.5vw, 32px)",
                   height: "clamp(22px, 4.5vw, 32px)",
                   background: showColor ? ASSIGNMENT_COLOR[a.assignment] : "hsl(var(--muted))",
                   borderColor: "hsl(var(--iq-chalk) / 0.9)",
                   color: "hsl(var(--iq-field))",
                 }}>
              {a.role}
            </div>
            {isHi && (
              <span className="mt-1 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-background/90 border whitespace-nowrap">
                {ROLE_LABELS[a.role]}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export function legendForAssignments(): { key: IqAssignment; label: string }[] {
  return [
    { key: "ball", label: "Ball" },
    { key: "bag", label: "Bag" },
    { key: "backup", label: "Backup" },
    { key: "read", label: "Read" },
    { key: "execute", label: "Execute" },
  ];
}
