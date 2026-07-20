// Top-down baseball/softball diamond. Renders actors as dots with
// animated routes. Teach mode shows all paths; quiz mode hides them
// until the answer is revealed. Uses the elite IqField renderer.

import { motion } from "framer-motion";
import { useMemo } from "react";
import type { IqActor, IqActorRole, IqAssignment } from "@/lib/iq/types";
import { ASSIGNMENT_COLOR, ROLE_LABELS } from "@/lib/iq/types";
import { IqField } from "./IqField";
import type { FieldSport } from "@/lib/iq/fieldModel";

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
}


// Offensive roles keep built-in coords — bases/batter box are fixed by rules.
const OFFENSIVE_POS: Partial<Record<IqActorRole, { x: number; y: number }>> = {
  R1: { x: 76, y: 70 },
  R2: { x: 50, y: 40 },
  R3: { x: 24, y: 70 },
  BR: { x: 50, y: 96 },
  BAT: { x: 50, y: 96 },
};

// Ultimate fallback for defenders if no alignment prop was passed.
const DEFENSIVE_FALLBACK: Partial<Record<IqActorRole, { x: number; y: number }>> = {
  P:  { x: 50, y: 68 },
  C:  { x: 50, y: 94 },
  "1B": { x: 72, y: 66 },
  "2B": { x: 60, y: 52 },
  SS:   { x: 40, y: 52 },
  "3B": { x: 28, y: 66 },
  LF:   { x: 22, y: 22 },
  CF:   { x: 50, y: 10 },
  RF:   { x: 78, y: 22 },
};

export function IqDiamond({
  actors, mode, highlightRole, className, roleShifts, defensivePositions, sport = "baseball",
}: IqDiamondProps) {
  const byRole = useMemo(() => new Map(actors.map((a) => [a.role, a])), [actors]);
  const posFor = (role: IqActorRole) => {
    const base =
      defensivePositions?.[role] ??
      DEFENSIVE_FALLBACK[role] ??
      OFFENSIVE_POS[role] ??
      { x: 50, y: 50 };
    const s = roleShifts?.[role];
    if (!s) return base;
    return {
      x: Math.max(2, Math.min(98, base.x + s.dx)),
      y: Math.max(2, Math.min(98, base.y + s.dy)),
    };
  };

  return (
    <div className={"relative w-full aspect-square overflow-hidden rounded-2xl border " + (className ?? "")}
         style={{ background: "hsl(var(--iq-field))" }}>
      <IqField sport={sport} />

      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        {/* Actor routes (only in teach/reveal modes) */}
        {(mode === "teach" || mode === "reveal") && actors.flatMap((a) => {
          const start = posFor(a.role);
          if (!a.primary_path?.length) return [];
          const pts = [start, ...a.primary_path];
          const d = pts.map((p,i)=> `${i===0?"M":"L"} ${p.x} ${p.y}`).join(" ");
          return [(
            <motion.path key={`path-${a.role}`} d={d}
              fill="none" stroke={ASSIGNMENT_COLOR[a.assignment]}
              strokeWidth={highlightRole === a.role ? 0.9 : 0.5}
              strokeDasharray="1.2 1.2" strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: highlightRole && highlightRole !== a.role ? 0.25 : 0.9 }}
              transition={{ duration: 1.1, ease: "easeOut" }} />
          )];
        })}
      </svg>

      {/* Actor dots */}
      {actors.map((a) => {
        const pos = posFor(a.role);
        const showColor = mode !== "quiz";
        const isHi = highlightRole === a.role;
        return (
          <motion.button
            key={a.role}
            type="button"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: isHi ? 1.15 : 1, opacity: 1 }}
            transition={{ delay: 0.05, type: "spring", stiffness: 220, damping: 18 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
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
