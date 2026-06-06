/**
 * Hammer Knowledge Gap Registry.
 *
 * Declarative list of variables Hammer must know to coach an athlete. Each
 * gap declares (a) the context key to read from `useHammerAthleteContext`,
 * (b) the question Hammer asks when missing, (c) the canonical spine key
 * persisted via `persistContextAnswer`.
 *
 * Sprint: Athlete Context Spine Implementation (P0-1).
 *
 * Interpretive — never authors organism truth. Persistence target is the
 * canonical Athlete Context Spine (`athlete_context` table); answers are
 * re-read through the envelope so missingness/confidence stay intact.
 */
export interface KnowledgeGap {
  readonly id: string;
  readonly contextKey: string;
  readonly priority: number; // lower = asked first
  readonly question: string;
  readonly helper?: string;
  readonly inputKind: "text" | "select" | "number";
  readonly options?: ReadonlyArray<{ value: string; label: string }>;
  /** Canonical spine key the answer is persisted into via persistContextAnswer. */
  readonly persistTo: string;
  /** Canonical ASB topic emitted on successful resolution. */
  readonly topic: "onboarding.knowledge_gap_resolved";
}

export const HAMMER_KNOWLEDGE_GAPS: ReadonlyArray<KnowledgeGap> = [
  {
    id: "sport_primary",
    contextKey: "sport_primary",
    priority: 5,
    question: "What's your primary sport?",
    inputKind: "select",
    options: [
      { value: "baseball", label: "Baseball" },
      { value: "softball", label: "Softball" },
      { value: "football", label: "Football" },
      { value: "other", label: "Other" },
    ],
    persistTo: "sport_primary",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "goal_summary",
    contextKey: "goal_summary",
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
    priority: 20,
    question: "Where are you in your season right now?",
    inputKind: "select",
    options: [
      { value: "off", label: "Offseason" },
      { value: "pre", label: "Preseason" },
      { value: "in", label: "In season" },
      { value: "post", label: "Postseason" },
    ],
    persistTo: "season_phase",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "school_grade",
    contextKey: "school_grade",
    priority: 35,
    question: "What grade or class are you in?",
    inputKind: "text",
    persistTo: "school_grade",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "lifting_age_years",
    contextKey: "lifting_age_years",
    priority: 60,
    question: "How many years have you been lifting weights consistently?",
    inputKind: "number",
    persistTo: "lifting_age_years",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "weekly_availability_days",
    contextKey: "weekly_availability_days",
    priority: 70,
    question: "How many days per week can you train with me?",
    inputKind: "number",
    persistTo: "weekly_availability_days",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "weekly_availability_hours",
    contextKey: "weekly_availability_hours",
    priority: 71,
    question: "Roughly how many total hours per week?",
    inputKind: "number",
    persistTo: "weekly_availability_hours",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "training_focus",
    contextKey: "training_focus",
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
    priority: 90,
    question: "Of these — power, contact, speed, defense, arm — which two matter most to you right now?",
    inputKind: "text",
    persistTo: "development_priorities",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "injury_history",
    contextKey: "injury_history",
    priority: 100,
    question: "Any current injuries or pain I should plan around?",
    helper: "Say 'none' if you're fully healthy. Your answer always outranks anything I infer.",
    inputKind: "text",
    persistTo: "injury_history",
    topic: "onboarding.knowledge_gap_resolved",
  },
];
