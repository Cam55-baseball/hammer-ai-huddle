// Pure helper that composes elite-grade rationale for an IQ quiz attempt
// from the scenario + actors + the user's chosen role/assignment.
// No DB calls, no AI — deterministic so it's unit-testable and instant.

import type {
  IqActor,
  IqActorRole,
  IqAssignment,
  IqScenario,
} from "./types";
import { ASSIGNMENT_LABELS, ROLE_LABELS } from "./types";

export interface OtherOnField {
  role: IqActorRole;
  roleLabel: string;
  assignment: IqAssignment;
  assignmentLabel: string;
  note: string;
}

export interface ScenarioFeedback {
  correct: boolean;
  chosenAssignment: IqAssignment | null;
  correctAssignment: IqAssignment;
  chosenAssignmentLabel: string;
  correctAssignmentLabel: string;
  roleLabel: string;
  /** "Your job on this play" — one sentence from the chosen role's actor. */
  yourJob: string | null;
  /** What to read pre-pitch / post-contact. */
  read: string | null;
  /** What to communicate. */
  call: string | null;
  /** Elite cue — short, punchy. Rendered as a pull-quote. */
  eliteCue: string | null;
  /** Coach's note — common_mistake the chosen actor tends to make. */
  coachNote: string | null;
  /** When wrong: plain-English contrast between what they did vs. what was needed. */
  whyWrong: string | null;
  /** Big-picture scenario explanation (from scenario.explanation). */
  bigPicture: string | null;
  /** Everyone else on the field, so the user can learn the full play. */
  othersOnField: OtherOnField[];
}

const PAIR_RATIONALES: Record<string, string> = {
  // chosen → correct
  "bag>ball":
    "You covered a base, but no one else can get to this ball in time — your glove is the play.",
  "bag>backup":
    "You went to a base, but the ball is heading somewhere a teammate has to field. Your job is to back them up so a misplay doesn't compound.",
  "bag>read":
    "You committed to a bag before reading the play. Slow down — read the ball off the bat first, then react.",
  "bag>execute":
    "You stopped at the bag, but this play needs you to execute a specific action (tag, throw, or relay), not just stand on it.",

  "ball>bag":
    "You broke for the ball, but a teammate has the better angle. Your job is to get to the base and receive the throw.",
  "ball>backup":
    "You went after the ball, but another fielder owns it. You're the safety net — get behind them so a missed ball doesn't turn into extra bases.",
  "ball>read":
    "You attacked the ball before reading the play. On this one, the right move is to pause, read where it's going, then react.",
  "ball>execute":
    "You went for the ball, but the play here is to execute a specific role (cutoff, relay, tag) — not field it.",

  "backup>ball":
    "You set up to back up, but you're actually the primary on this ball. Trust your range and go get it.",
  "backup>bag":
    "You set up to back up, but with this runner advancing you're needed at the base to receive the throw.",
  "backup>read":
    "You shifted to backup before the play developed. Read first, then commit to where you're needed.",
  "backup>execute":
    "You positioned to back up, but this scenario asks you to actively execute (tag, cut, throw), not stand behind it.",

  "read>ball":
    "You sat in read mode, but the ball is yours — attack it instead of waiting.",
  "read>bag":
    "You stayed in read mode, but the runner forces you to the bag. Move now.",
  "read>backup":
    "You read the play but didn't get behind your teammate. Always finish your read by getting in backup position.",
  "read>execute":
    "Reading is the right start, but this play requires you to execute — commit to the tag, throw, or relay.",

  "execute>ball":
    "You jumped to execute, but you need to be the one fielding this ball first.",
  "execute>bag":
    "You went to execute, but covering the bag is the priority on this play.",
  "execute>backup":
    "You committed to executing, but no throw is coming to you here — get behind the play and back it up.",
  "execute>read":
    "You executed before reading. Slow it down: read the ball, then commit. Acting blind here gives up a base.",

  "idle>ball":
    "You held your spot, but you have the best angle on this ball — go get it.",
  "idle>bag":
    "You held your spot, but the runner is advancing and the bag is unmanned. Move.",
  "idle>backup":
    "You stayed put, but every play needs a backup. Get behind your teammate.",
  "idle>read":
    "You stayed flat-footed. Even when you're not the primary, you need to be reading the play.",
  "idle>execute":
    "You held your spot, but this play has you executing something — tag, throw, or cut.",
};

function pairKey(chosen: IqAssignment, correct: IqAssignment): string {
  return `${chosen}>${correct}`;
}

function buildWhyWrong(
  chosen: IqAssignment,
  correct: IqAssignment,
  roleLabel: string,
): string {
  const key = pairKey(chosen, correct);
  if (PAIR_RATIONALES[key]) return PAIR_RATIONALES[key];
  return `As the ${roleLabel}, your job on this play is "${ASSIGNMENT_LABELS[correct]}", not "${ASSIGNMENT_LABELS[chosen]}". Reset and read the situation again — the ball, the runners, the count all point to the right answer.`;
}

export function buildScenarioFeedback(input: {
  scenario: IqScenario;
  actors: IqActor[];
  chosenRole: IqActorRole;
  chosenAnswer: IqAssignment;
}): ScenarioFeedback {
  const { scenario, actors, chosenRole, chosenAnswer } = input;
  const correctAssignment =
    (scenario.correct_actor_assignments[chosenRole] as IqAssignment) ?? "idle";
  const correct = correctAssignment === chosenAnswer;

  const myActor = actors.find((a) => a.role === chosenRole) ?? null;
  const roleLabel = ROLE_LABELS[chosenRole];

  const others: OtherOnField[] = actors
    .filter((a) => a.role !== chosenRole && a.assignment !== "idle")
    .map((a) => ({
      role: a.role,
      roleLabel: ROLE_LABELS[a.role],
      assignment: a.assignment,
      assignmentLabel: ASSIGNMENT_LABELS[a.assignment],
      note: (a.coaching_note || a.secondary_read || "").trim(),
    }))
    .filter((o) => o.note.length > 0 || o.assignment !== "idle");

  return {
    correct,
    chosenAssignment: chosenAnswer,
    correctAssignment,
    chosenAssignmentLabel: ASSIGNMENT_LABELS[chosenAnswer],
    correctAssignmentLabel: ASSIGNMENT_LABELS[correctAssignment],
    roleLabel,
    yourJob: myActor?.coaching_note?.trim() || null,
    read: myActor?.secondary_read?.trim() || null,
    call: myActor?.communication_call?.trim() || null,
    eliteCue: myActor?.elite_cue?.trim() || null,
    coachNote: myActor?.common_mistake?.trim() || null,
    whyWrong: correct ? null : buildWhyWrong(chosenAnswer, correctAssignment, roleLabel),
    bigPicture: scenario.explanation?.trim() || null,
    othersOnField: others,
  };
}
