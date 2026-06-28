/**
 * scheduleContext — pure projector from `useScheduleWindow` output into a
 * lineage-visible signal the daily-plan builder can use to reshape
 * modality prescriptions around games / tournaments / camps / travel /
 * team practices.
 *
 * Missingness-permissive: `unknown` / `empty` windows yield
 * `postureToday: "normal"` and leave the plan unchanged.
 *
 * No I/O. Never authors organism truth. Reshapes prescription envelope only.
 */
import type {
  ScheduleKind,
  ScheduleWindow,
  TournamentWindow,
} from "@/hooks/command/useScheduleWindow";

export type SchedulePosture =
  | "normal"
  | "taper"
  | "game"
  | "tournament"
  | "camp"
  | "travel"
  | "team_practice";

export interface ScheduleSignal {
  todayKinds: ReadonlyArray<ScheduleKind>;
  tomorrowKinds: ReadonlyArray<ScheduleKind>;
  isGameToday: boolean;
  isTournamentToday: boolean;
  isCampToday: boolean;
  isTravelToday: boolean;
  hasTeamPracticeToday: boolean;
  isGameTomorrow: boolean;
  isTournamentTomorrow: boolean;
  tournamentWindow: TournamentWindow | null;
  tournamentDayLabel: string | null; // "Day 2 of 3"
  postureToday: SchedulePosture;
  /** Short human label for the event driving today's posture. */
  eventLabel: string | null;
  /** One-line rationale used in `roadmapReason` / `why`. */
  rationale: string;
}

export const NORMAL_SIGNAL: ScheduleSignal = {
  todayKinds: [],
  tomorrowKinds: [],
  isGameToday: false,
  isTournamentToday: false,
  isCampToday: false,
  isTravelToday: false,
  hasTeamPracticeToday: false,
  isGameTomorrow: false,
  isTournamentTomorrow: false,
  tournamentWindow: null,
  tournamentDayLabel: null,
  postureToday: "normal",
  eventLabel: null,
  rationale: "",
};

export function projectScheduleSignal(window: ScheduleWindow): ScheduleSignal {
  if (window.unknown || window.loading) return NORMAL_SIGNAL;

  const todayKinds = window.today.map((s) => s.kind);
  const tomorrowKinds = window.tomorrow.map((s) => s.kind);

  const isTournamentToday = todayKinds.includes("tournament");
  const isGameToday = todayKinds.includes("game");
  const isCampToday = todayKinds.includes("camp");
  const isTravelToday = todayKinds.includes("travel");
  const hasTeamPracticeToday = todayKinds.includes("team_practice");
  const isGameTomorrow = tomorrowKinds.includes("game");
  const isTournamentTomorrow = tomorrowKinds.includes("tournament");

  const tw = window.tournamentWindow;
  const tournamentDayLabel =
    tw && tw.dayIndex >= 1 ? `Day ${tw.dayIndex} of ${tw.totalDays}` : null;

  const todayEvent =
    window.today.find((s) => s.kind === "tournament") ??
    window.today.find((s) => s.kind === "game") ??
    window.today.find((s) => s.kind === "camp") ??
    window.today.find((s) => s.kind === "travel") ??
    window.today.find((s) => s.kind === "team_practice") ??
    null;
  const eventLabel = todayEvent?.label ?? null;

  let posture: SchedulePosture = "normal";
  let rationale = "";
  if (isTournamentToday) {
    posture = "tournament";
    rationale = tournamentDayLabel
      ? `Tournament ${tournamentDayLabel}${eventLabel ? ` (${eventLabel})` : ""} — saving legs.`
      : `Tournament today${eventLabel ? ` (${eventLabel})` : ""} — saving legs.`;
  } else if (isGameToday) {
    posture = "game";
    rationale = `Game today${eventLabel ? ` ${eventLabel}` : ""} — saving legs.`;
  } else if (isCampToday) {
    posture = "camp";
    rationale = `Camp today${eventLabel ? ` (${eventLabel})` : ""} — Hammer is staying out of the way.`;
  } else if (isTravelToday) {
    posture = "travel";
    rationale = `Travel today${eventLabel ? ` (${eventLabel})` : ""} — mobility + hydration only.`;
  } else if (hasTeamPracticeToday) {
    posture = "team_practice";
    rationale = `Team practice today${eventLabel ? ` (${eventLabel})` : ""} — supplementing, not stacking.`;
  } else if (isGameTomorrow || isTournamentTomorrow) {
    posture = "taper";
    rationale = `${isTournamentTomorrow ? "Tournament" : "Game"} tomorrow — tapering load.`;
  }

  return {
    todayKinds,
    tomorrowKinds,
    isGameToday,
    isTournamentToday,
    isCampToday,
    isTravelToday,
    hasTeamPracticeToday,
    isGameTomorrow,
    isTournamentTomorrow,
    tournamentWindow: tw,
    tournamentDayLabel,
    postureToday: posture,
    eventLabel,
    rationale,
  };
}
