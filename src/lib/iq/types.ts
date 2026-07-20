// Baseball & Softball IQ — domain types

export type IqSport = "baseball" | "softball" | "both";
export type IqLens = "defense" | "offense" | "pitching" | "baserunning";
export type IqDifficulty = "intro" | "core" | "advanced" | "elite";
export type IqStatus = "draft" | "published" | "archived";

export type IqActorRole =
  | "P" | "C" | "1B" | "2B" | "3B" | "SS"
  | "LF" | "CF" | "RF"
  | "R1" | "R2" | "R3" | "BR" | "BAT";

export type IqAssignment = "ball" | "bag" | "backup" | "read" | "execute" | "idle";

export interface IqPathPoint {
  x: number; // 0..100 across the field (1B side = 100)
  y: number; // 0..100 (home plate = 100, CF wall = 0)
  label?: string;
}

export interface IqActor {
  id: string;
  situation_id: string;
  role: IqActorRole;
  assignment: IqAssignment;
  primary_path: IqPathPoint[];
  secondary_read: string;
  communication_call: string;
  coaching_note: string;
  common_mistake: string;
  elite_cue: string;
}

export interface IqSituation {
  id: string;
  sport: IqSport;
  slug: string;
  title: string;
  summary: string;
  lens_tags: IqLens[];
  difficulty: IqDifficulty;
  canonical_order: number;
  status: IqStatus;
  triple_check_count: number;
  sources: { label: string; ref?: string }[];
  updated_at: string;
  alignment_preset?: string | null;
  alignment_selector?: import("./alignmentResolver").AlignmentSelector | null;
}


export interface IqScenario {
  id: string;
  situation_id: string;
  variant_id: string | null;
  sport: IqSport;
  prompt: string;
  position_focus: string;
  correct_actor_assignments: Record<string, IqAssignment>;
  distractors: { label: string; assignments: Record<string, IqAssignment> }[];
  explanation: string;
  alignment_preset?: string | null;
}


export interface IqUserProgress {
  user_id: string;
  situation_id: string;
  mastery_score: number;
  last_seen_at: string | null;
  next_due_at: string | null;
  streak: number;
  lifetime_attempts: number;
  lifetime_correct: number;
  ef_factor: number;
  interval_days: number;
}

export const DEFENSIVE_ROLES: IqActorRole[] = [
  "P","C","1B","2B","3B","SS","LF","CF","RF",
];

export const OFFENSIVE_ROLES: IqActorRole[] = ["BAT","BR","R1","R2","R3"];

export const ROLE_LABELS: Record<IqActorRole, string> = {
  P: "Pitcher", C: "Catcher",
  "1B": "First Base", "2B": "Second Base", "3B": "Third Base", SS: "Shortstop",
  LF: "Left Field", CF: "Center Field", RF: "Right Field",
  R1: "Runner on 1st", R2: "Runner on 2nd", R3: "Runner on 3rd",
  BR: "Batter–Runner", BAT: "Batter",
};

export const ASSIGNMENT_LABELS: Record<IqAssignment, string> = {
  ball: "Ball",
  bag: "Bag",
  backup: "Backup",
  read: "Read",
  execute: "Execute",
  idle: "Hold",
};

export const ASSIGNMENT_COLOR: Record<IqAssignment, string> = {
  ball: "hsl(var(--iq-ball))",
  bag: "hsl(var(--iq-bag))",
  backup: "hsl(var(--iq-backup))",
  read: "hsl(var(--iq-read))",
  execute: "hsl(var(--iq-execute))",
  idle: "hsl(var(--muted-foreground))",
};

export const LENS_LABELS: Record<IqLens, string> = {
  defense: "Defense",
  offense: "Offense",
  pitching: "Pitching",
  baserunning: "Baserunning",
};

export const LENS_ACCENT: Record<IqLens, string> = {
  defense: "hsl(var(--iq-defense))",
  offense: "hsl(var(--iq-offense))",
  pitching: "hsl(var(--iq-pitching))",
  baserunning: "hsl(var(--iq-baserunning))",
};
