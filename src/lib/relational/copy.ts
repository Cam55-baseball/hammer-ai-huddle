/**
 * Presentation Finalization — single source of athlete-facing voice.
 *
 * Consumed by all surfaces under src/components/relational/* and
 * src/pages/RelationalDemo.tsx. No constitutional internals — no mention of
 * lineage, replay, engine_version, RR-* invariants, or projections in
 * athlete-facing strings.
 *
 * Voice rules (Hammer):
 *   • calm, observant, accountable, non-hype
 *   • short sentences; no exclamation marks
 *   • no "you got this" / no diagnosis / no certainty about the future
 *   • references observable facts only (dates, prior turns, deloads)
 */

export const SURFACE_TITLES = {
  hammer: "Hammer",
  parentTrust: "Parent view",
  developmental: "Where you are right now",
  slumpReload: "Quick check-in",
  recruiting: "Recruiting path",
  injury: "Recovery timeline",
  journey: "Your journey so far",
} as const;

export const HAMMER_VOICE = {
  emptyState: "No conversation yet. When you write, I will remember.",
  composerPlaceholder: "Say what's on your mind…",
  cite: (n: number) => `looking back at ${n} earlier moment${n === 1 ? "" : "s"}`,
  redacted: "You removed this from the record.",
  send: "Send",
} as const;

export const PARENT_VOICE = {
  protectedLead: "Protected by design",
  protectedBody:
    "Recruiter outreach, performance pressure, and exposure stay behind developmental safeguards until age-appropriate.",
  trustNote:
    "Trust grows from interaction history. It opens visibility — it never opens authority.",
  noHistory: "No parent activity yet.",
} as const;

export const DEVELOPMENTAL_VOICE = {
  stages: {
    youth_intro: "Youth intro",
    youth_developmental: "Youth developmental",
    adolescent_early: "Early adolescence",
    adolescent_mid: "Mid adolescence",
    adolescent_late: "Late adolescence",
    competitive_entry: "Competitive entry",
    competitive_developed: "Competitive developed",
    adult_competitive: "Adult competitive",
    unknown: "Stage pending",
  } as Record<string, string>,
  loadCeiling: (pct: number | null | undefined) =>
    pct == null ? "Load: not capped" : `Load held at ${pct}%`,
  growthSpurtNote:
    "A growth spurt was observed. Load is held lower while bones and tendons catch up.",
  minorBadge: "Minor — parent visible",
} as const;

export const SLUMP_VOICE = {
  title: "Quick check-in",
  body: "Confidence has been low. Your word always overrides what the system inferred.",
  buttons: { worse: "Worse", same: "Same", better: "Better", much_better: "Much better" },
} as const;

export const RECRUITING_VOICE = {
  gatedTitle: "Recruiting stays paused",
  gatedBody:
    "At this developmental stage, recruiter outreach is held back. Parents see everything; nothing reaches you yet.",
  unlockedEmpty: "No recruiter contact yet.",
  minorConsent: "Parent consent required",
} as const;

export const INJURY_VOICE = {
  empty: "Healthy — no recent injuries.",
  phaseLabels: {
    acute: "Acute",
    subacute: "Subacute",
    rehab: "Rehab",
    return_to_play: "Return to play",
    cleared: "Cleared",
  } as Record<string, string>,
} as const;

export const JOURNEY_VOICE = {
  currentStage: (label: string) => `Today: ${label}`,
  empty: "Your journey starts with your first event.",
} as const;

export const DEMO_CHOREO = {
  intro: {
    title: "Meet the athlete",
    body: "One athlete. Three hundred and thirty days. Everything you see is reconstructed from a single ledger.",
  },
  steps: [
    { id: "today", title: "Today", seconds: 45 },
    { id: "journey", title: "The journey", seconds: 75 },
    { id: "developmental", title: "Where they are", seconds: 90 },
    { id: "slump", title: "The slump", seconds: 120 },
    { id: "hammer", title: "Hammer remembers", seconds: 120 },
    { id: "parent", title: "Parent safety", seconds: 90 },
    { id: "recruiting", title: "Protected from pressure", seconds: 60 },
    { id: "injury", title: "Recovery, on record", seconds: 30 },
    { id: "proof", title: "Replay proof", seconds: 60 },
  ],
} as const;
