/**
 * Phase C — Canonical athlete/parent-facing vocabulary.
 *
 * Single source of truth for every word the user reads on a relational
 * surface. Hammer voice rules:
 *
 *   • calm, observant, accountable, never hype
 *   • short sentences; no exclamation marks
 *   • no "you got this" / no diagnosis / no certainty about the future
 *   • references observable facts only (dates, prior turns, deloads)
 *   • zero technical leakage — no "lineage", "replay", "projection",
 *     "scope", "event", "confidence score", "inference", "AI", "state
 *     machine", "authority pathway"
 *
 * Components MUST import from this file rather than inlining strings.
 */

/**
 * One phrase per concept, globally. When a new surface needs a word that's
 * already in here, reuse the existing entry — never invent a synonym.
 */
export const TERMS = {
  // Relationships
  accessRemoved: "Access removed",
  removeAccess: "Remove access",
  removingAccess: "Removing access…",
  permission: "Permission",
  person: "Person",

  // Visibility
  whatTheySee: "What they can see",
  whatStaysPrivate: "What stays private",
  youStayInControl: "You stay in control",

  // Developmental
  ageBasedProtection: "Age-based protection",
  minorParentVisible: "Parent can see this",

  // Psych / emotional
  recentPattern: "Recent pattern",
  quickCheckIn: "Quick check-in",

  // System voice
  resolving: "Looking that up…",
  saving: "Saving…",
  saved: "Saved",
  somethingOff: "Something didn't go through. Try again in a moment.",
} as const;

export const SURFACE_TITLES = {
  hammer: "Hammer",
  parentTrust: "Parent view",
  developmental: "Where you are right now",
  slumpReload: TERMS.quickCheckIn,
  recruiting: "Recruiting path",
  injury: "Recovery timeline",
  journey: "Your journey so far",
  yourCircle: "Your circle",
  parentLinkage: "Parents",
  acceptInvite: "Accept invite",
} as const;

export const HAMMER_VOICE = {
  emptyState: "No conversation yet. When you write, I will remember.",
  composerPlaceholder: "Say what's on your mind…",
  cite: (n: number) => `looking back at ${n} earlier moment${n === 1 ? "" : "s"}`,
  redacted: "You removed this from the record.",
  send: "Send",
  /** Map raw speaker role to a calm human label. */
  speakerLabel: (role: string): string => {
    if (role === "athlete") return "You";
    if (role === "hammer") return "Hammer";
    if (role === "parent") return "Parent";
    if (role === "coach") return "Coach";
    return role.replace("_", " ");
  },
} as const;

export const PARENT_VOICE = {
  protectedLead: "Protected first",
  protectedBody:
    "Recruiter outreach, performance pressure, and exposure stay behind protections. You see everything before they do.",
  trustNote:
    "Trust grows from how people show up over time. It opens what they can see — never what they decide.",
  noHistory: "No parent activity yet.",
  momentsTogether: (n: number) =>
    `${n} moment${n === 1 ? "" : "s"} together so far.`,
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
    "A growth spurt is happening. Load is held lower while bones and tendons catch up.",
  minorBadge: TERMS.minorParentVisible,
  recruitingPaused: "Recruiting paused",
  protectionLabel: TERMS.ageBasedProtection,
} as const;

export const SLUMP_VOICE = {
  title: TERMS.quickCheckIn,
  body: "Things have felt heavier lately. Your word always overrides anything the system inferred from the side.",
  buttons: { worse: "Worse", same: "Same", better: "Better", much_better: "Much better" },
} as const;

export const RECRUITING_VOICE = {
  gatedTitle: "Recruiting stays paused",
  gatedBody:
    "At this stage, recruiter outreach is held back. Parents see everything; nothing reaches you yet.",
  gatedBadge: TERMS.ageBasedProtection,
  unlockedEmpty: "No recruiter contact yet.",
  minorConsent: "Parent permission required",
} as const;

export const INJURY_VOICE = {
  empty: "Healthy — no recent injuries.",
  phaseLabels: {
    acute: "Just happened",
    subacute: "Settling",
    rehab: "Coming back",
    return_to_play: "Returning",
    cleared: "Cleared",
  } as Record<string, string>,
} as const;

export const JOURNEY_VOICE = {
  currentStage: (label: string) => `Today: ${label}`,
  empty: "Your journey starts with your first check-in.",
  topicLabels: {
    transition: "Growing up step",
    marker: "Memory",
    contact: "Outside attention",
  } as Record<string, string>,
} as const;

/**
 * Parent invite + accept-invite copy. Lead with safety, never with mechanics.
 */
export const PARENT_INVITE_VOICE = {
  athleteTitle: "Invite a parent",
  athleteIntro:
    "Add a parent to your circle. They'll see what helps them support you — nothing more. You can remove access any time.",
  createCta: "Create invite link",
  createBusy: "Creating…",
  linkReady: "Share this link with your parent.",
  copyLink: "Copy link",
  linkCopied: "Link copied",
  yourParents: "Your parents",
  noParentsYet: "No parents linked yet.",
  removeCta: TERMS.removeAccess,
  removing: TERMS.removingAccess,
  removedToast: TERMS.accessRemoved,
  control: TERMS.youStayInControl,
  controlBullets: [
    "They see your scope-appropriate signal — not raw data.",
    "Recruiter outreach and pressure stay behind protections.",
    "You can remove their access in one tap, any time.",
  ] as const,
  detailsToggle: "Details",
  acceptTitle: SURFACE_TITLES.acceptInvite,
  acceptIntro:
    "Accepting this invite links you as a parent. You'll see what helps you support them — nothing more.",
  acceptReassurance:
    "Either of you can remove this link at any time, in one tap. Nothing is ever final.",
  acceptCta: "Accept and link",
  acceptBusy: "Linking…",
  resolving: TERMS.resolving,
  signInPrompt: "Sign in as the parent to accept this invite.",
  signInCta: "Sign in",
  invalid: "This invite link is invalid or has expired.",
  fail: TERMS.somethingOff,
  successToast: "Linked",
  emailLabel: "Parent's email (optional)",
  emailPlaceholder: "parent@example.com",
  sendEmailCta: "Send invitation",
  sendingEmail: "Sending…",
  transport: {
    sent: "Invitation sent.",
    skipped_disabled: "Email isn't set up yet — copy the link instead.",
    failed: "We couldn't send the email. Copy the link instead.",
  },
} as const;

export const ONBOARDING_VOICE = {
  eyebrow: "Welcome",
  steps: [
    {
      id: "welcome",
      title: "Welcome",
      body: "This is your space. You decide what to share, and when.",
    },
    {
      id: "checkin",
      title: "First check-in",
      body: "Log how today feels — readiness, fatigue, or recovery. Any one works.",
    },
    {
      id: "scope",
      title: "Sharing",
      body: "You choose what coaches and parents can see. You can change it later.",
    },
    {
      id: "ready",
      title: "You're set",
      body: "Today's session is ready. Take it at your pace.",
    },
  ] as const,
  continue: "Continue",
  done: "All set — see you in there.",
} as const;

export const RELATIONAL_PAGE_VOICE = {
  title: SURFACE_TITLES.yourCircle,
  subtitle: "The people, signals, and steps that shape your week.",
} as const;

export const DEMO_CHOREO = {
  intro: {
    title: "Meet the athlete",
    body: "One athlete. Three hundred and thirty days. Everything you see is reconstructed from a single source of truth.",
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

// ─── Phase D — Safety Center, Relationship Settings, Transport ────────────

export const SAFETY_VOICE = {
  title: "Safety",
  subtitle: "Things flagged for a calm second look.",
  empty: "Nothing needs attention right now.",
  routes: {
    notify_parent: "A check-in may be helpful.",
    arbitration_required: "Review recommended.",
    lockdown_commercial: "External contact paused for now.",
  } as Record<string, string>,
  status: {
    pending: "Pending review",
    reviewed: "Reviewed",
    muted: "Set aside",
  } as Record<string, string>,
  markReviewed: "Mark reviewed",
  mute: "Set aside",
} as const;

export const RELATIONSHIP_SETTINGS_VOICE = {
  title: "People in your circle",
  subtitle: "Pause or remove access at any time.",
  empty: "No one is linked yet.",
  pause: "Pause access",
  restore: "Restore access",
  remove: "Remove access",
  whatTheySee: TERMS.whatTheySee,
  confirmRemoveLead: "This removes their access right away.",
  confirmRemoveBody:
    "They will not see new updates. The history of the link stays on record.",
  confirm: "Confirm",
  cancel: "Cancel",
  statusLabels: {
    active: "Linked",
    pending: "Invite pending",
    paused: "Paused",
    revoked: TERMS.accessRemoved,
  } as Record<string, string>,
  pauseReason: "Pausing for now",
} as const;

export const TRANSPORT_VOICE = {
  invitationCreated: "Invitation created",
  deliveryDelayed: "Email delivery delayed — share the link below instead.",
  deliverySent: "Invitation sent",
  sendCta: "Send invitation",
  sending: "Sending…",
  retry: "Try again",
} as const;

