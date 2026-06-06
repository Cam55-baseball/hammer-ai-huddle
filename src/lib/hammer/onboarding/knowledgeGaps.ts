/**
 * Hammer Knowledge Gap Registry.
 *
 * Declarative list of variables Hammer must know to coach an athlete. Each
 * gap declares (a) the context key to read from `useHammerAthleteContext`,
 * (b) the question Hammer asks when missing, (c) the persistence target.
 *
 * Sprint: Coach Hammer Authority Consolidation (Section B).
 *
 * Interpretive — never authors organism truth. Persistence target is always
 * `profiles.<col>`; the answer is then re-read through the canonical context
 * inventory so confidence/missingness invariants stay intact.
 */
export interface KnowledgeGap {
  readonly id: string;
  readonly contextKey: string;
  readonly priority: number; // lower = asked first
  readonly question: string;
  readonly helper?: string;
  readonly inputKind: "text" | "select" | "number";
  readonly options?: ReadonlyArray<{ value: string; label: string }>;
  /** Profile column the answer is persisted into. */
  readonly persistTo: string;
  /** Canonical ASB topic emitted on successful resolution. */
  readonly topic: "onboarding.knowledge_gap_resolved";
}

export const HAMMER_KNOWLEDGE_GAPS: ReadonlyArray<KnowledgeGap> = [
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
      { value: "offseason", label: "Offseason" },
      { value: "preseason", label: "Preseason" },
      { value: "inseason", label: "In season" },
      { value: "postseason", label: "Postseason" },
    ],
    persistTo: "training_focus",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "position",
    contextKey: "position",
    priority: 30,
    question: "What's your primary position?",
    inputKind: "text",
    persistTo: "position",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "experience_level",
    contextKey: "experience_level",
    priority: 40,
    question: "How would you describe your experience level?",
    inputKind: "select",
    options: [
      { value: "youth", label: "Youth" },
      { value: "high_school", label: "High school" },
      { value: "college", label: "College" },
      { value: "pro", label: "Pro / aspiring pro" },
    ],
    persistTo: "experience_level",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "equipment_access",
    contextKey: "equipment_access",
    priority: 50,
    question: "What equipment do you have regular access to?",
    helper: "Bat, tee, net, weights, turf, gym, field — list what you have.",
    inputKind: "text",
    persistTo: "equipment_access",
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
    id: "weekly_availability",
    contextKey: "weekly_availability",
    priority: 70,
    question: "Roughly how many hours per week can you train with me?",
    inputKind: "number",
    persistTo: "weekly_availability",
    topic: "onboarding.knowledge_gap_resolved",
  },
  {
    id: "injury_history",
    contextKey: "injury_history",
    priority: 80,
    question: "Any current injuries or pain I should plan around?",
    helper: "Say 'none' if you're fully healthy. Your answer always outranks anything I infer.",
    inputKind: "text",
    persistTo: "injury_history",
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
];
