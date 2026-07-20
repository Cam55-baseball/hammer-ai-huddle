/**
 * Hammer Knowledge Gap Registry — role-aware.
 *
 * Declarative list of variables Hammer must know to coach. Each gap declares
 * (a) the context key to read from `useHammerAthleteContext` (athlete) or
 * supplemental coach/scout stores, (b) the question Hammer asks when missing,
 * (c) the canonical spine key persisted via `persistContextAnswer`, and
 * (d) the audience the gap applies to.
 *
 * Interpretive — never authors organism truth. Persistence target is the
 * canonical context store; answers are re-read through the envelope so
 * missingness/confidence stay intact. Athletes may always skip; missingness
 * is preserved, never imputed.
 */

export type GapAudience = "athlete" | "coach" | "scout";

export type GapInputKind =
  | "text"
  | "number"
  | "select"
  | "multiselect"
  | "segmented"
  | "competition_level"
  | "lifting_history"
  | "anthropometrics"
  | "injury";

export interface GapOption {
  readonly value: string;
  readonly label: string;
}

export interface KnowledgeGap {
  readonly id: string;
  readonly contextKey: string;
  readonly audience: GapAudience;
  readonly priority: number; // lower = asked first
  readonly question: string;
  readonly helper?: string;
  readonly inputKind: GapInputKind;
  readonly options?: ReadonlyArray<GapOption>;
  /** Canonical spine/store key the answer is persisted into. */
  readonly persistTo: string;
  /** Canonical ASB topic emitted on successful resolution. */
  readonly topic: "onboarding.knowledge_gap_resolved";
  /** Allow user to skip without imputing (default true). */
  readonly skippable?: boolean;
}

// ───────────────────────────────────────────────────────────────────────────
// Athlete gap set
// ───────────────────────────────────────────────────────────────────────────
const ATHLETE_GAPS: ReadonlyArray<KnowledgeGap> = [
  {
    id: "goal_summary",
    contextKey: "goal_summary",
    audience: "athlete",
    priority: 10,
    question: "What's the single biggest goal you want me to help you reach this season?",
    helper: "One sentence is enough — we can refine it together.",
    inputKind: "text",
    persistTo: "goal_summary",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "season_phase",
    contextKey: "season_phase",
    audience: "athlete",
    priority: 20,
    question: "Where are you in your season right now?",
    inputKind: "segmented",
    options: [
      { value: "off", label: "Off" },
      { value: "pre", label: "Pre" },
      { value: "in", label: "In" },
      { value: "post", label: "Post" },
    ],
    persistTo: "season_phase",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "competition_level",
    contextKey: "competition_level",
    audience: "athlete",
    priority: 25,
    question: "What level do you compete at right now?",
    helper: "Pick your playing tier — from Rec/Little League all the way to MLB / AUSL. If you're on a travel team, we'll ask your age bracket next. Showcases and Olympic events go in the optional list at the bottom.",
    inputKind: "competition_level",
    persistTo: "competition_level",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "education_stage",
    contextKey: "education_stage",
    audience: "athlete",
    priority: 30,
    question: "Where are you in school?",
    inputKind: "select",
    options: [
      { value: "elementary", label: "Elementary (K–5)" },
      { value: "middle", label: "Middle school (6–8)" },
      { value: "hs_9", label: "High school — 9th" },
      { value: "hs_10", label: "High school — 10th" },
      { value: "hs_11", label: "High school — 11th" },
      { value: "hs_12", label: "High school — 12th" },
      { value: "college_fr", label: "College — freshman" },
      { value: "college_so", label: "College — sophomore" },
      { value: "college_jr", label: "College — junior" },
      { value: "college_sr", label: "College — senior" },
      { value: "college_5", label: "College — 5th year" },
      { value: "grad", label: "Graduate school" },
      { value: "post_college", label: "Post-college" },
      { value: "professional", label: "Professional athlete" },
      { value: "out_of_school", label: "Out of school" },
    ],
    persistTo: "education_stage",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "position_primary",
    contextKey: "position_primary",
    audience: "athlete",
    priority: 35,
    question: "What's your primary position?",
    inputKind: "select",
    options: [
      { value: "P", label: "Pitcher" },
      { value: "C", label: "Catcher" },
      { value: "1B", label: "1st base" },
      { value: "2B", label: "2nd base" },
      { value: "3B", label: "3rd base" },
      { value: "SS", label: "Shortstop" },
      { value: "LF", label: "Left field" },
      { value: "CF", label: "Center field" },
      { value: "RF", label: "Right field" },
      { value: "DH", label: "DH" },
      { value: "UTIL", label: "Utility" },
    ],
    persistTo: "position_primary",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "position_secondary",
    contextKey: "position_secondary",
    audience: "athlete",
    priority: 36,
    question: "Any positions you also play?",
    helper: "Pick all that apply.",
    inputKind: "multiselect",
    options: [
      { value: "P", label: "Pitcher" },
      { value: "C", label: "Catcher" },
      { value: "1B", label: "1B" },
      { value: "2B", label: "2B" },
      { value: "3B", label: "3B" },
      { value: "SS", label: "SS" },
      { value: "LF", label: "LF" },
      { value: "CF", label: "CF" },
      { value: "RF", label: "RF" },
      { value: "DH", label: "DH" },
    ],
    persistTo: "position_secondary",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "throws_hand",
    contextKey: "throws_hand",
    audience: "athlete",
    priority: 40,
    question: "Which hand do you throw with?",
    inputKind: "segmented",
    options: [
      { value: "R", label: "Right" },
      { value: "L", label: "Left" },
      { value: "S", label: "Both" },
    ],
    persistTo: "throws_hand",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "bats_hand",
    contextKey: "bats_hand",
    audience: "athlete",
    priority: 41,
    question: "Which side do you hit from?",
    inputKind: "segmented",
    options: [
      { value: "R", label: "Right" },
      { value: "L", label: "Left" },
      { value: "S", label: "Switch" },
    ],
    persistTo: "bats_hand",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "other_sports",
    contextKey: "other_sports",
    audience: "athlete",
    priority: 45,
    question: "Any other sports you play?",
    helper: "Background only — your primary sport is set by your subscription.",
    inputKind: "text",
    persistTo: "other_sports",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "anthropometrics",
    contextKey: "anthropometrics",
    audience: "athlete",
    priority: 50,
    question: "Quick measurements — these let me program for your limb lengths.",
    helper: "Estimates are fine. Skip any you don't know.",
    inputKind: "anthropometrics",
    persistTo: "anthropometrics",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "lifting_history",
    contextKey: "lifting_history",
    audience: "athlete",
    priority: 60,
    question: "Tell me about your lifting history — and if you've had a long layoff, walk me through the most recent one.",
    helper: "Total years and current consistency. If you had a break, I need the most recent long one: when it ended, whether it was injury-related, what you've done since (rehab / PT), and whether you've returned to lifting yet.",
    inputKind: "lifting_history",
    persistTo: "lifting_history",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "weekly_availability_days",
    contextKey: "weekly_availability_days",
    audience: "athlete",
    priority: 70,
    question: "How many days per week can you train with me?",
    inputKind: "number",
    persistTo: "weekly_availability_days",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "weekly_availability_hours",
    contextKey: "weekly_availability_hours",
    audience: "athlete",
    priority: 71,
    question: "Roughly how many total hours per week?",
    inputKind: "number",
    persistTo: "weekly_availability_hours",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "training_focus",
    contextKey: "training_focus",
    audience: "athlete",
    priority: 80,
    question: "What should we focus on first — strength, speed, hitting, throwing, defense?",
    helper: "Pick one or two; we can add more later.",
    inputKind: "text",
    persistTo: "training_focus",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "development_priorities",
    contextKey: "development_priorities",
    audience: "athlete",
    priority: 90,
    question: "Of these — power, contact, speed, defense, arm — which two matter most right now?",
    inputKind: "text",
    persistTo: "development_priorities",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "injury_history",
    contextKey: "injury_history",
    audience: "athlete",
    priority: 100,
    question: "Any current injuries or pain I should plan around?",
    helper: "Pick \"100% healthy\" if you're fully good. Your answer always outranks anything I infer.",
    inputKind: "injury",
    persistTo: "injury_history",
    topic: "onboarding.knowledge_gap_resolved",
  },
  // ── Fuel & recovery ────────────────────────────────────────────────
  {
    id: "sleep_target_hrs",
    contextKey: "sleep_target_hrs",
    audience: "athlete",
    priority: 110,
    question: "How many hours of sleep are you aiming for each night?",
    helper: "Most high-performance athletes target 8–10.",
    inputKind: "number",
    persistTo: "sleep_target_hrs",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "water_goal_oz",
    contextKey: "water_goal_oz",
    audience: "athlete",
    priority: 111,
    question: "What's your daily water goal (in ounces)?",
    helper: "A common baseline: half your body weight in oz.",
    inputKind: "number",
    persistTo: "water_goal_oz",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "diet_style",
    contextKey: "diet_style",
    audience: "athlete",
    priority: 112,
    question: "How would you describe your diet style?",
    inputKind: "select",
    options: [
      { value: "Omnivore", label: "Omnivore" },
      { value: "Vegetarian", label: "Vegetarian" },
      { value: "Vegan", label: "Vegan" },
      { value: "Pescatarian", label: "Pescatarian" },
      { value: "Keto", label: "Keto" },
      { value: "Other", label: "Other" },
    ],
    persistTo: "diet_style",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "allergies",
    contextKey: "allergies",
    audience: "athlete",
    priority: 113,
    question: "Any allergies or foods you avoid?",
    helper: "Comma-separated is fine — e.g. peanuts, shellfish, dairy.",
    inputKind: "text",
    persistTo: "allergies",
    topic: "onboarding.knowledge_gap_resolved",
  },
  // ── Mental & career ────────────────────────────────────────────────
  {
    id: "level_target",
    contextKey: "level_target",
    audience: "athlete",
    priority: 120,
    question: "What level are you aiming to play at?",
    inputKind: "select",
    options: [
      { value: "Rec / HS", label: "Rec / HS" },
      { value: "JUCO", label: "JUCO" },
      { value: "D3", label: "D3" },
      { value: "D2", label: "D2" },
      { value: "D1", label: "D1" },
      { value: "NAIA", label: "NAIA" },
      { value: "Pro / MLB", label: "Pro / MLB" },
    ],
    persistTo: "level_target",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "focus_area",
    contextKey: "focus_area",
    audience: "athlete",
    priority: 121,
    question: "What's your primary mental focus this season?",
    helper: "e.g. Stay calm with runners on, trust my swing with 2 strikes.",
    inputKind: "text",
    persistTo: "focus_area",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "pregame_routine",
    contextKey: "pregame_routine",
    audience: "athlete",
    priority: 122,
    question: "What's your pre-game or pre-at-bat routine?",
    helper: "e.g. 4 breaths, visualize first pitch, tap helmet.",
    inputKind: "text",
    persistTo: "pregame_routine",
    topic: "onboarding.knowledge_gap_resolved",
  },
  // ── Connections ────────────────────────────────────────────────────
  {
    id: "coach_code",
    contextKey: "coach_code",
    audience: "athlete",
    priority: 130,
    question: "Have a coach or team code? (optional)",
    helper: "If your coach shared a code, drop it here so I can link you up.",
    inputKind: "text",
    persistTo: "coach_code",
    topic: "onboarding.knowledge_gap_resolved",
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Coach gap set (persists to coach_context)
// ───────────────────────────────────────────────────────────────────────────
const COACH_GAPS: ReadonlyArray<KnowledgeGap> = [
  {
    id: "coach_org_name",
    contextKey: "org_name",
    audience: "coach",
    priority: 10,
    question: "What organization or program do you coach for?",
    inputKind: "text",
    persistTo: "org_name",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "coach_program_name",
    contextKey: "program_name",
    audience: "coach",
    priority: 15,
    question: "What's the name of your team or program?",
    inputKind: "text",
    persistTo: "program_name",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "coach_age_groups",
    contextKey: "age_groups",
    audience: "coach",
    priority: 20,
    question: "Which age groups do you coach?",
    helper: "Pick all that apply.",
    inputKind: "multiselect",
    options: [
      { value: "8u", label: "8U" },
      { value: "10u", label: "10U" },
      { value: "12u", label: "12U" },
      { value: "14u", label: "14U" },
      { value: "hs", label: "High school" },
      { value: "college", label: "College" },
      { value: "pro", label: "Pro" },
      { value: "adult", label: "Adult amateur" },
    ],
    persistTo: "age_groups",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "coach_primary_disciplines",
    contextKey: "primary_disciplines",
    audience: "coach",
    priority: 30,
    question: "What disciplines do you focus on most?",
    inputKind: "multiselect",
    options: [
      { value: "hitting", label: "Hitting" },
      { value: "pitching", label: "Pitching" },
      { value: "catching", label: "Catching" },
      { value: "defense", label: "Defense" },
      { value: "base_running", label: "Base running" },
      { value: "strength", label: "Strength" },
      { value: "speed", label: "Speed" },
      { value: "mental", label: "Mental" },
    ],
    persistTo: "primary_disciplines",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "coach_athlete_count",
    contextKey: "athlete_count",
    audience: "coach",
    priority: 40,
    question: "Roughly how many athletes are you working with?",
    inputKind: "number",
    persistTo: "athlete_count",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "coach_philosophy",
    contextKey: "coaching_philosophy",
    audience: "coach",
    priority: 50,
    question: "In a sentence or two — what's your coaching philosophy?",
    inputKind: "text",
    persistTo: "coaching_philosophy",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "coach_seasons_run",
    contextKey: "seasons_run",
    audience: "coach",
    priority: 60,
    question: "How many seasons have you coached?",
    inputKind: "number",
    persistTo: "seasons_run",
    topic: "onboarding.knowledge_gap_resolved",
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Scout gap set (persists to scout_context)
// ───────────────────────────────────────────────────────────────────────────
const SCOUT_GAPS: ReadonlyArray<KnowledgeGap> = [
  {
    id: "scout_org_name",
    contextKey: "org_name",
    audience: "scout",
    priority: 10,
    question: "Which organization do you scout for?",
    inputKind: "text",
    persistTo: "org_name",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "scout_regions",
    contextKey: "regions",
    audience: "scout",
    priority: 20,
    question: "What regions do you cover?",
    helper: "Comma-separated — e.g. SoCal, AZ, NV.",
    inputKind: "text",
    persistTo: "regions",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "scout_sports",
    contextKey: "sports",
    audience: "scout",
    priority: 30,
    question: "Which sports do you scout?",
    inputKind: "multiselect",
    options: [
      { value: "baseball", label: "Baseball" },
      { value: "softball", label: "Softball" },
    ],
    persistTo: "sports",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "scout_level_focus",
    contextKey: "level_focus",
    audience: "scout",
    priority: 40,
    question: "Which levels do you focus on?",
    inputKind: "multiselect",
    options: [
      { value: "youth", label: "Youth" },
      { value: "hs", label: "High school" },
      { value: "juco", label: "JUCO" },
      { value: "college", label: "4-year college" },
      { value: "indy", label: "Independent" },
      { value: "milb", label: "Affiliated MiLB" },
      { value: "intl", label: "International" },
    ],
    persistTo: "level_focus",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "scout_evaluation_focus",
    contextKey: "evaluation_focus",
    audience: "scout",
    priority: 50,
    question: "What do you weight most in evaluations?",
    inputKind: "multiselect",
    options: [
      { value: "mechanics", label: "Mechanics" },
      { value: "tools", label: "Tools" },
      { value: "makeup", label: "Makeup" },
      { value: "production", label: "Production" },
      { value: "projection", label: "Projection" },
    ],
    persistTo: "evaluation_focus",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "scout_pool_size",
    contextKey: "athlete_pool_size",
    audience: "scout",
    priority: 60,
    question: "Roughly how many athletes do you actively track?",
    inputKind: "number",
    persistTo: "athlete_pool_size",
    topic: "onboarding.knowledge_gap_resolved",
  },
];

export function getKnowledgeGapsForAudience(
  audience: GapAudience,
): ReadonlyArray<KnowledgeGap> {
  switch (audience) {
    case "coach":
      return COACH_GAPS;
    case "scout":
      return SCOUT_GAPS;
    case "athlete":
    default:
      return ATHLETE_GAPS;
  }
}

/**
 * Legacy export retained for backwards compatibility — defaults to athlete.
 * New code should call `getKnowledgeGapsForAudience(audience)`.
 */
export const HAMMER_KNOWLEDGE_GAPS: ReadonlyArray<KnowledgeGap> = ATHLETE_GAPS;
