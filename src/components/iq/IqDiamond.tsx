// Top-down baseball/softball diamond. Renders actors as dots with
// animated routes that ALWAYS originate from the resolved defender
// position (shift, DP depth, no-doubles, wheel, etc. all carry over).
//
// Teach/reveal modes show all paths; quiz mode hides them until the
// answer is revealed. `playing` triggers a play-the-routes animation
// used by the "Watch the play" flow.

import { motion } from "framer-motion";
import { useMemo } from "react";
import type { IqActor, IqActorRole, IqAssignment } from "@/lib/iq/types";
import { ASSIGNMENT_COLOR, ROLE_LABELS } from "@/lib/iq/types";
import { IqField } from "./IqField";
import type { FieldSport } from "@/lib/iq/fieldModel";
import {
  DEFAULT_DEFENDER_POS,
  buildResolvedDefenderMap,
  pointsToPathD,
  resolveRolePath,
} from "@/lib/iq/pathResolver";

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
  /** When true, plays defender routes as an animation (used in "Watch play"). */
  playing?: boolean;
}

// Offensive roles keep built-in coords — bases/batter box are fixed by rules.
const OFFENSIVE_POS: Partial<Record<IqActorRole, { x: number; y: number }>> = {
  R1: { x: 76, y: 70 },
  R2: { x: 50, y: 40 },
  R3: { x: 24, y: 70 },
  BR: { x: 50, y: 96 },
  BAT: { x: 50, y: 96 },
};

export function IqDiamond({
  actors, mode, highlightRole, className, roleShifts, defensivePositions,
  sport = "baseball", batterSide = "R", playing = false,
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

  // Resolved defender map lets target-role waypoints point at teammates.
  const resolvedMap = useMemo(() => {
    const m = defensivePositions ? buildResolvedDefenderMap(defensivePositions) : {};
    // Ensure all defenders are represented so `targetRole` never falls back to the old default.
    actors.forEach((a) => {
      if (!m[a.role]) m[a.role] = posFor(a.role);
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defensivePositions, actors]);

  const showPaths = mode === "teach" || mode === "reveal" || playing;

  return (
    <div className={"relative w-full aspect-square overflow-hidden rounded-2xl border " + (className ?? "")}
         style={{ background: "hsl(var(--iq-field))" }}>
      <IqField sport={sport} batterSide={batterSide} />

      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        {/* Actor routes — always anchored to the resolved set position. */}
        {showPaths && actors.flatMap((a) => {
          const start = posFor(a.role);
          if (!a.primary_path?.length) return [];
          const pts = resolveRolePath(a.role, start, a.primary_path, { positions: resolvedMap });
          const d = pointsToPathD(pts);
          const dimmed = highlightRole && highlightRole !== a.role;
          return [(
            <motion.path key={`path-${a.role}`} d={d}
              fill="none" stroke={ASSIGNMENT_COLOR[a.assignment]}
              strokeWidth={highlightRole === a.role ? 0.95 : 0.55}
              strokeDasharray="1.2 1.2" strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: dimmed ? 0.25 : 0.9 }}
              transition={{ duration: playing ? 1.4 : 1.1, ease: "easeOut" }} />
          )];
        })}
      </svg>

      {/* Actor dots — defenders animate along their resolved routes when `playing`. */}
      {actors.map((a) => {
        const start = posFor(a.role);
        const isDefender = !["R1","R2","R3","BR","BAT"].includes(a.role);
        const shouldPlay = playing && isDefender && a.primary_path?.length > 0;
        const resolvedPts = shouldPlay
          ? resolveRolePath(a.role, start, a.primary_path, { positions: resolvedMap })
          : [start];
        const showColor = mode !== "quiz";
        const isHi = highlightRole === a.role;
        const animate = shouldPlay
          ? {
              left: resolvedPts.map((p) => `${p.x}%`),
              top: resolvedPts.map((p) => `${p.y}%`),
              scale: isHi ? 1.15 : 1,
              opacity: 1,
            }
          : { left: `${start.x}%`, top: `${start.y}%`, scale: isHi ? 1.15 : 1, opacity: 1 };
        return (
          <motion.button
            key={a.role}
            type="button"
            initial={{ scale: 0.5, opacity: 0, left: `${start.x}%`, top: `${start.y}%` }}
            animate={animate}
            transition={shouldPlay
              ? { duration: 1.4, ease: "easeInOut", times: resolvedPts.map((_, i) => i / Math.max(1, resolvedPts.length - 1)) }
              : { delay: 0.05, type: "spring", stiffness: 220, damping: 18 }}
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
