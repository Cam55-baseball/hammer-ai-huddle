# Hammer — Guidance Orchestration Audit (Phase 1)

**Status:** Audit only. No code, schema, projection, emitter, replay-engine, or
UI changes. No RR-7 / RR-9 / RR-10 activation. No new primitives.

**Question under audit:**

> "Can a new athlete navigate Hammers Modality through guided interaction
> rather than needing to understand platform architecture?"

---

## §0 — Scope, method, and a naming collision

This audit walks the code as it ships today and asks, surface by surface,
where Hammer is present, where Hammer is silent, and where the athlete (or
parent) is left to discover the platform on their own.

A precondition finding before anything else: **the word "Hammer" refers to
three different things in this codebase**, none of which advertise their
relationship to the others. This is itself the largest source of guidance
confusion the audit found.

1. **Conversational Hammer.** `src/components/relational/HammerConversationPanel.tsx`,
   wired to RR-5 / RR-6 / RR-8 projections, governed by
   `src/lib/runtime/relational/hammerMemory.ts`. Lives on `/relational`. This
   is the "guide / companion" surface — the one this audit is about.

2. **Hammer State.** A biomarker projection — `overall_state ∈ {prime, ready,
   caution, recover}` — rendered as `HammerStateBadge`, `ReadinessChip`,
   `EliteModePanel` on `/today`. Sourced from `src/hooks/useHammerState.ts`
   and routed into `useNextAction`. It is a chip, not a conversation. It
   never speaks in Hammer's voice; the panel is `EliteModePanel`.

3. **"Hammer" as marketing label.** `src/pages/Index.tsx` advertises "Hammer
   Motion Capture" and "Hammer Powered Results" as the product proposition.
   There is no in-product surface, route, or component that matches that
   promise. A user landing here and signing up will not find anything called
   "Hammer Motion Capture" anywhere in the app.

A first-time athlete therefore encounters three Hammers without
disambiguation: a marketing word, a status chip, and (only if they find
`/relational`) a conversational guide. None of the three explains the
others.

Method: code walk over `src/components/relational/*`, `src/components/hammer/*`,
`src/components/onboarding/*`, page routes named in §1 below, plus
`src/lib/relational/copy.ts` (the canonical Hammer voice file), Hammer
memory legality (`src/lib/runtime/relational/hammerMemory.ts`), and the
edge-function-backed `useCoachHammerNextStep` hook.

---

## §1 — Surface inventory

Per surface: *knows / displays / can explain / cannot explain / decision
supported*. "Knows" means projection wiring; "can explain" means templated
copy / arbitration callbacks that are constitutionally allowed; "cannot
explain" cites the denylists, citation requirements, and the absence of any
narrator that translates platform mechanics into plain language.

### 1.1 `HammerConversationPanel` — /relational

- **Knows.** `useConversationMemory`, `useDevelopmentalState`,
  `useNarrativeState`, `useLifeContextState`, `useInjuryRecoveryState`. All
  read-only projections over the canonical ASB ledger.
- **Displays.** Thread list, turn list, composer, single arbitrated memory
  chip (`NARRATIVE_VOICE.resurfacingChip` / `LIFE_CONTEXT_VOICE.ackChip` /
  `INJURY_RECOVERY_VOICE.ackChip`). Minor badge when developmental stage
  flags `is_minor`.
- **Can explain.** Calm acknowledgement of a prior moment, a noticed life
  pressure, an in-progress recovery — each strictly templated and citation-
  bound via `arbitrateMemoryCallback` (one chip max per turn,
  safeguarding suppresses all).
- **Cannot explain.** Anything not represented as a prior canonical event.
  `assertHammerTurnLegality` rejects `FABRICATED_RECALL`. The denylists
  forbid diagnosis, destiny, identity labelling, prescription, recovery
  prognosis. There is no "how do I use this app" capability and no
  navigation handoff — Hammer cannot say "open Safety" or "go to Today".
- **Decision supported.** Continuity of self-narration. The athlete sees
  that the system remembers in a non-manipulative way. No workflow
  decision is supported here.

### 1.2 Onboarding — `AthleteOnboarding`, `OnboardingFlow`, `AthleteOnboardingShell`, `ProgressiveDisclosureStepper`, `LIFE_CONTEXT_CHECKIN`

- **Knows.** Step index, completed steps, optional life-context selection.
- **Displays.** Eyebrow "Welcome to your organism", stepper, per-step copy
  from `ONBOARDING_VOICE.steps[]` (welcome / first check-in / life-context
  / sharing / ready).
- **Can explain.** That the athlete decides what to share, that the first
  check-in unlocks today's session, that life-context is optional.
- **Cannot explain.** Who Hammer is. That a conversational Hammer exists
  at all. What `/relational`, `/safety`, `/relationships`, `/today`,
  `/practice`, `/digest`, `/forecast` are for. How parents get added (the
  copy says "you choose what coaches and parents can see" but never points
  the athlete at `/parent-invite`). What "Hammer State" on `/today` will
  mean tomorrow.
- **Decision supported.** Whether to do the first check-in. Nothing else.
- **Hammer presence here: zero.** Onboarding is shell + stepper. The
  conversational Hammer never speaks in the onboarding flow. There is no
  narrator voice, no Hammer avatar, no "hi, I'm Hammer" moment.

### 1.3 Relational hub — `Relational.tsx`, `RelationalDemo.tsx`

- **Knows.** Demo vs. self scope via `DemoModeContext`.
- **Displays.** `SlumpReloadFlow`, `HammerConversationPanel`,
  `ParentTrustCard`, `RecruitingRoadmap`, `InjuryLifecycleStrip`,
  `AthleteJourneyMap`, ordered by emotional weight (check-in → conversation
  → protection → history).
- **Can explain.** Title "Your circle", subtitle "The people, signals, and
  steps that shape your week."
- **Cannot explain.** Why an athlete would come here. There is no entry
  point from `/today`, no Hammer prompt anywhere else in the app that
  says "come to your circle". The athlete must already know `/relational`
  exists.
- **Decision supported.** None directly — this is a hub, not a flow.

### 1.4 Parent-facing — `ParentTrustCard`, `ParentInvite`, `AcceptParentInvite`, `RelationshipSettings`

- **Knows.** Relationship + trust state, invite token state, transport
  delivery status.
- **Displays.** `PARENT_VOICE` ("Protected first / Trust grows from how
  people show up over time"), `PARENT_INVITE_VOICE` link-create flow,
  `ACCEPT_INVITE` flow, relationship list with pause / restore / remove.
- **Can explain.** That recruiter pressure stays behind protections. That
  trust opens visibility, never decisions. That access can be removed in
  one tap.
- **Cannot explain.** Anything in Hammer's voice. There is no Hammer
  narrator anywhere on the parent surfaces. The Accept-Invite flow does
  not greet the parent, does not orient them, does not say what they will
  and will not see in the days after accepting.
- **Decision supported.** Invite send / accept / remove. No ongoing
  guidance.
- **Hammer presence: zero on every parent surface.**

### 1.5 Safety — `SafetyCenter.tsx`

- **Knows.** Safeguarding notification list, classifier routes
  (`notify_parent`, `arbitration_required`, `lockdown_commercial`),
  status (`pending` / `reviewed` / `muted`).
- **Displays.** Calm list of items with one action per row
  (`SAFETY_VOICE`). "Mark reviewed" / "Set aside".
- **Can explain.** That something was flagged for a calm second look.
  Per-route copy ("A check-in may be helpful", "Review recommended",
  "External contact paused for now").
- **Cannot explain.** What triggered the flag, what happens if the
  athlete ignores it, what a parent will see, whether the athlete is in
  trouble. Hammer does not speak here. There is no narrator framing.
- **Decision supported.** Mark / mute. No "what should I do next".

### 1.6 Athlete dashboard — `Today`, `Dashboard`, `TodayCommandBar`, `EliteModePanel`

- **Knows.** Athlete command rows, daily prescription, latest "rendered"
  prescription event, `HammerState` (biomarker), readiness, elite layer +
  prediction.
- **Displays.** `PulseStrip`, `CommunicationAI`, `CommandCenterSection`,
  `PrescriptionCard`, link tiles to `/digest` / `/forecast` / quick-log,
  recent activity list. `TodayCommandBar` (where used) shows
  `HammerStateBadge`, `ReadinessChip`, a next-up action, and an
  `EliteModePanel` headline (`elite_message` + `micro_directive` + a
  constraint chip).
- **Can explain.** Today's plan. Biomarker state in four words. An "elite
  message" headline. A trajectory line ("trending toward ready in next
  24h") when confidence ≥ 70 and state mismatches.
- **Cannot explain.** What "prime / ready / caution / recover" mean in
  athlete language. What relationship the biomarker has to the
  conversational Hammer on `/relational`. Why a recommendation was made
  (no "why this" affordance). What to do if the elite message conflicts
  with how the athlete actually feels.
- **Decision supported.** Click next-up action, log check-in, override
  prescription.
- **Conversational Hammer presence on /today: zero.** Hammer State is a
  status chip; it has no voice and no memory.

### 1.7 Training guidance — `PracticeHub`, `TrainingBlock`, `PrescriptionCard`

- **Knows.** Prescription, block plan, intensity / volume.
- **Displays.** Modules, targets, change-request affordance.
- **Can explain.** What today's plan contains.
- **Cannot explain.** Why this plan, in plain language. How it relates to
  yesterday's signal. How it relates to a tracked injury. How it relates
  to a logged life-context pressure. Hammer is absent.

### 1.8 Roadmap — `AthleteJourneyMap`

- **Knows.** Developmental stage, narrative markers, parent linkage,
  recruiter contact (gated).
- **Displays.** Stage label + markers list.
- **Cannot explain.** What the markers mean for the next month. There is
  no Hammer-voiced summary.

### 1.9 Recruiting — `RecruitingRoadmap`

- **Knows.** Gating state, minor flag, parent consent state.
- **Displays.** `RECRUITING_VOICE.gatedTitle` / `gatedBody` when paused.
- **Cannot explain.** What "unlocking" looks like, what the parent's role
  is in unlocking, what protections persist after unlock. Hammer is
  absent.

### 1.10 Slump recovery — `SlumpReloadFlow`

- **Knows.** Recent narrative slump markers, life-context pressure.
- **Displays.** A quick check-in (`SLUMP_VOICE`) with four buttons:
  worse / same / better / much better.
- **Can explain.** "Things have felt heavier lately. Your word always
  overrides anything the system inferred from the side."
- **Cannot explain.** What happens after the athlete answers. There is
  no follow-up Hammer turn that says "thanks for telling me — here's
  what changes."

### 1.11 Injury continuity — `InjuryLifecycleStrip`, `RTP`, `BounceBackBay`

- **Knows.** RR-6 projection: visible recovery timeline, current phase,
  per-region participation status, RTP authorization status, missingness,
  safeguarding lockdown.
- **Displays.** Phase strip, participation labels, revoked / safeguarded
  affordance copy from `INJURY_RECOVERY_VOICE`.
- **Can explain (templated, denylist-bounded).** "Recovery has been part
  of your recent routine." "Training load has been adjusted recently."
  "Return-to-play guidance was updated." "Held back for now."
- **Cannot explain.** Diagnosis, prognosis, prescriptions, "fully healed",
  "safe to return", "high-risk athlete" — all in
  `INJURY_RECOVERY_VOICE.denylist` and rejected by
  `assertInjuryReferenceLegality`. The conversational Hammer is not
  present in the injury flow itself; the chip surfaces only inside
  `HammerConversationPanel`. RTP itself remains an explicit human
  authorization gate.
- **Decision supported.** None directly — the surface is observational.

### 1.12 Life-context — chip only inside `HammerConversationPanel`

No standalone surface. The only way the athlete sees life-context
acknowledgement is the small `LIFE_CONTEXT_VOICE.ackChip` callback in the
Hammer panel. Logging happens only during onboarding (optional,
skippable). There is no "life context today" surface.

### 1.13 Narrative continuity — chip only inside `HammerConversationPanel`

No standalone surface. Same shape as life-context: arbitrated chip
("Remembering — you mentioned X on Y date") visible only to athletes who
land on `/relational`.

---

## §2 — Athlete journey (Day 0 → first milestone)

| Step | What Hammer says | What Hammer knows | What Hammer recommends | Residual confusion |
|---|---|---|---|---|
| Day 0 — landing (`/index`) | Marketing copy ("Hammer Powered Results", "Hammer Motion Capture"). Not Hammer's voice. | Nothing about this user. | Sign in. | The "Hammer" promised here is not the in-product Hammer. |
| Sign-up (`/auth`) | Nothing. | Nothing. | Nothing. | The athlete has no idea what they just signed up for. |
| Onboarding (`/onboarding`) | `ONBOARDING_VOICE` steps — welcome, first check-in, optional life-context, sharing, ready. Voice is "system", not Hammer. | Step completion. | Continue / log first check-in. | "Who is Hammer? Where is Hammer? Why is there a Hammer on /today and a different Hammer on /relational?" — never answered. |
| First /today render | `HammerStateBadge` ("ready"), `EliteModePanel` headline + micro-directive, recent activity is empty. | Biomarker projection only. | Click next-up tile (e.g. Tex Vision in the morning, Practice mid-day, Vault evening). | The athlete has not met Hammer-the-companion yet and likely never will unless they discover `/relational`. |
| First training week | `PrescriptionCard` shows today's plan; `EliteModePanel` may show a 24h trajectory line if confidence ≥ 70. | Daily prescription, biomarker. | Open practice / log check-in. | No "why this plan" explanation. No translation between biomarker words and felt experience. |
| First setback (slump / heavier stretch) | If the athlete lands on `/relational`, `SlumpReloadFlow` invites a quick check-in; `HammerConversationPanel` may render a narrative chip. | Narrative markers if the athlete has been writing. | "Tell us if it's worse / same / better / much better." | Nothing surfaces on `/today` — the place the athlete actually spends time. No proactive nudge to `/relational`. |
| First parent interaction (invite send / accept) | `PARENT_INVITE_VOICE` / `PARENT_VOICE`. No Hammer narrator. | Invite token, transport state. | Copy / send link; parent clicks accept. | Parent lands without any Hammer voice and without a guided first session. Athlete has no Hammer-led "this is what just changed" moment. |
| First recovery event (injury logged / RTP) | `InjuryLifecycleStrip` shows phase + participation; on `/relational`, the injury chip may appear inside Hammer's panel. | RR-6 projection. | None — observational only, by design. | RTP requires explicit human authorization, and there is no Hammer-voiced explainer telling the athlete what authorization means or who gives it. |
| First improvement milestone | `AthleteJourneyMap` may add a marker; `EliteModePanel` may show a "Window Opening" chip. | Markers + biomarker. | None. | No Hammer-voiced "look back" moment. Continuity exists in the ledger but is never narrated to the athlete on `/today`. |

**Silent moments — where Hammer is absent but should be guiding:**
landing, sign-up, the entire onboarding voice, every /today render, the
training surfaces, the parent invite flow, parent invite acceptance, the
safety center, the recruiting roadmap, the injury / RTP flows, the
improvement-milestone moment. Hammer is *only* present when the athlete
manually visits `/relational`.

---

## §3 — Parent trust journey

| Step | Where trust is created | Where trust is unclear | Hammer present | Hammer absent |
|---|---|---|---|---|
| Discovery (athlete sends invite) | Athlete-side copy: "They see what helps them support you — nothing more. You can remove access any time." | Parent has no preview of what they will see before clicking. | No. | All of it. |
| Accept-invite landing (`/accept-parent-invite/:token`) | "Either of you can remove this link at any time, in one tap. Nothing is ever final." | The parent is not greeted, not oriented, not introduced to Hammer. They click "Accept and link" and land cold. | No. | All of it. |
| First parent visit to `/relational` (rare — they have to be sent there) | `ParentTrustCard` ("Protected first / Trust grows from how people show up over time"). | Parent is reading the athlete's hub through a scope-firewalled lens. There is no parent-specific narrator. | The `HammerConversationPanel` is rendered, but turns are scope-filtered and the parent will mostly see "No conversation yet". | All proactive guidance. |
| Safety Center (if surfaced to the parent) | Calm list, one action per row. | Parent does not know what the routes mean in practice or what the implications of "Mark reviewed" are downstream. | No. | All of it. |
| Athlete progress visibility | Scope-firewalled projections render only what the athlete has consented to share. | Parent has no summarized "this week, here's what mattered" voice — they get the same surfaces an athlete sees, with less context. | No. | All of it. |
| Recovery visibility | `InjuryLifecycleStrip` is observational and denylist-bounded. | Parent gets phase strings without any narrator translating them ("Settling", "Returning") into "what this means for the next two weeks". | No. | All of it. |

**Parent finding:** trust is *defended* by the architecture (scope
firewall, one-tap removal, denylists, safeguarding lockdown) but never
*built* by a voice. There is no Hammer for parents. `ParentTrustCard`
and `SafetyCenter` read as data lists.

---

## §4 — Navigation dependency audit

Workflows that today require platform knowledge — i.e., the user must
already know the surface exists, what it is for, and where it lives.
"Coverage today" reflects what is shipped in code right now.

| Workflow | Severity | Athlete confusion risk | Parent confusion risk | Hammer coverage today | Missing |
|---|---|---|---|---|---|
| Find `/relational` (the only place Hammer-the-companion lives) | Critical | High | High | None. No link from `/today`, no onboarding mention. | An entry point and a name the user has heard before. |
| Find `/safety` | Critical | Medium | High | None. No mention in onboarding or relational copy. | A Hammer-voiced "here's what just got flagged" handoff. |
| Find `/relationships` | High | Medium | High | None. Not referenced in any narrator copy. | A "manage who can see what" handoff. |
| Find `/rtp` and `/bounce-back-bay` | Critical (injury context) | High | High | `InjuryLifecycleStrip` is observational but does not point users at these pages. | A "your recovery lives here" handoff when an injury is logged. |
| Find `/practice` | High | High | n/a | `useNextAction` may route here mid-day, but only when `TodayCommandBar` is rendered. | A consistent "open practice" affordance in Hammer's voice. |
| Find `/digest` and `/forecast` | Medium | Medium | n/a | Two link tiles on `/today`. No narrator framing. | A weekly Hammer-voiced summary. |
| Parent invite acceptance flow | Critical | n/a | High | `PARENT_INVITE_VOICE` is calm but mechanical. | A Hammer-voiced "welcome — here's what you will and won't see" first session. |
| Disambiguate "Hammer State" (biomarker) from "Hammer" (companion) | Critical | High | Medium | None — neither surface acknowledges the other. | A naming decision plus a one-line in-product explainer. |
| Disambiguate demo vs production scope | Medium | Medium | Medium | `DemoModeContext` + a debug chip when `debug={true}`. | A user-visible "you are in demo" framing wherever demo data is mixed in. |
| Switch between `/today` and `/relational` mid-week | High | High | n/a | None. The two pages do not link to each other. | A persistent Hammer presence on both, with handoffs in either direction. |
| Translate a `PrescriptionCard` plan into "why this for me, today" | High | High | n/a | None. The card shows the plan; the elite panel shows a headline. There is no causal explanation. | A "why this" affordance pointing at the underlying signal. |
| Understand what a Safety Center route ("notify_parent", "arbitration_required", "lockdown_commercial") actually means | Critical | Medium | High | `SAFETY_VOICE.routes` provides one calm sentence per route. | A Hammer-voiced second sentence: what will / will not happen next. |

---

## §5 — Hammer readiness scores

Each score is 0–10. Justifications cite §1–§4.

### Guidance Readiness — **3 / 10**

Hammer-the-companion exists, has a constitutionally sound voice, and is
correctly bounded (citation, denylists, single-callback arbitration,
safeguarding precedence). But it lives on exactly one route (`/relational`)
that the new athlete has no reason to discover. On every other surface,
the user is on their own.

### Parent Simplicity — **3 / 10**

The invite + accept + relationship-settings copy is calm and the scope
firewall is real. There is, however, no Hammer voice for parents
anywhere. A parent who accepts an invite has no narrated first session,
no orientation, and no ongoing summary in plain language.

### Athlete Simplicity — **4 / 10**

`/today` is reasonable as a status surface: pulse strip, prescription
card, recent activity, an elite headline. Onboarding has the right
sequence (welcome → check-in → optional life-context → sharing → ready).
But the names are still platform names ("prime", "ready", "caution",
"recover"; "elite layer"; "prescription"; "pulse"; "vault"; "Tex
Vision") and Hammer is not there to translate them.

### Navigation Independence — **2 / 10**

Twelve of the workflows above require the user to already know the
surface exists. The two most consequential ones — finding Hammer-the-
companion and finding `/safety` — have zero in-product discovery
pathway.

### Trust Formation — **5 / 10**

Architecturally strong: scope firewall, parent supremacy for minors,
one-tap removal, denylists on every interpretive surface, safeguarding
suppresses memory chips. The voice that would *build* that trust on top
of the architecture is missing from every parent-facing surface and from
every non-relational athlete surface.

### Retention Support — **3 / 10**

There is no Hammer-voiced "look back" moment, no proactive nudge into
`/relational` after a setback or improvement, no weekly summary in
Hammer's voice. Without a narrator that the user feels they are
returning to, the daily loop is a status check rather than a
relationship.

---

## §6 — Missing Hammer capabilities (capability-level, no implementation)

### Critical (block public release)

- **Naming disambiguation.** A single, decided answer to "what is
  Hammer?" with one surface name per concept, applied across `/index`,
  `/today`, `/relational`, marketing copy, and onboarding.
- **Cross-surface Hammer presence.** A Hammer voice on `/today`,
  somewhere in onboarding, on the parent invite-accept landing, and on
  the safety center — not just on `/relational`.
- **Hammer-led navigation handoffs.** Hammer must be able to say "open
  Safety", "open your recovery timeline", "open practice", "open your
  circle" — and those handoffs must work from `/today`.
- **Parent-facing Hammer voice.** A narrator for the parent's first
  session and ongoing visibility, distinct from the athlete-facing voice
  but using the same constitutional bounds.
- **Onboarding narrator.** A Hammer character introduced during
  onboarding so that the word "Hammer" the user encounters again on
  `/today` and `/relational` has a referent.
- **First-setback explainer.** When the athlete logs "worse" in
  `SlumpReloadFlow`, a Hammer-voiced acknowledgement that states what,
  if anything, changes today.
- **Why-this-plan affordance.** A one-tap "why this" on
  `PrescriptionCard` and `EliteModePanel` that surfaces the underlying
  signal in Hammer's voice (constitutionally: cited lineage, no
  fabrication, no diagnosis).

### Important (block "perceived value" but not legality)

- **In-context "what is this surface" tooltips** for at least
  `/relational`, `/safety`, `/relationships`, `/rtp`, `/bounce-back-bay`,
  in Hammer's voice.
- **Hammer summary on /today** — a single line that ties the biomarker
  chip to recent narrative or life-context signals.
- **Injury check-in coach.** A Hammer-led optional check-in when an
  injury is currently active, respecting RR-6 denylists and the RTP
  authorization gate.
- **Parent digest in Hammer's voice.** A weekly summary parents receive,
  scope-firewalled, that is not a data dump.
- **Standalone life-context surface.** Today the only place a
  life-context acknowledgement appears is a small chip inside
  `HammerConversationPanel`.

### Future (post-launch)

- **Cross-device continuity** for Hammer (so the conversation feels
  continuous between phone and desktop sessions).
- **Multi-language Hammer voice** (currently English copy only, via a
  single canonical copy file).
- **Voice / audio modality** for athletes who prefer it, especially
  during practice contexts.

---

## §7 — Final verdict

> **Hammer Not Ready.**

The conversational Hammer is implemented correctly *as a primitive*: it
is replay-derived, citation-bound, denylist-protected, safeguarding-
suppressed, and arbitrated to one chip per turn across RR-5 / RR-6 /
RR-8. As a *product*, however, it does not yet fulfill the original
objective. A brand-new athlete who signs up today will never meet
Hammer-the-companion unless they manually navigate to `/relational`, and
the parent they invite will never hear from Hammer at all.

The constitutional substrate is there. The guidance product is not.

### Biggest adoption blocker

Hammer-the-companion is reachable from exactly one URL (`/relational`)
that the new athlete has no reason to discover. There is no link, no
nudge, no mention in onboarding, and no presence on `/today`.

### Biggest parent blocker

There is no Hammer voice on any parent-facing surface. `ParentTrustCard`
and `SafetyCenter` are calm and architecturally strong, but they read as
data lists. A parent's first session is uneased.

### Biggest athlete blocker

"Hammer" refers to three different things in this codebase (marketing
label, biomarker chip on `/today`, companion on `/relational`) with no
in-product disambiguation. A new athlete cannot form a coherent mental
model of who or what Hammer is.

### Fastest path to perceived product value

A small set of changes, none of which require new primitives, replay-
engine changes, or RR-7 / RR-9 / RR-10 activation:

1. Decide and apply a single in-product name per concept ("Hammer" for
   the companion; rename the biomarker chip).
2. Place Hammer in onboarding as a named character whose voice the user
   then re-encounters later.
3. Render a Hammer presence on `/today` that can hand the user off to
   `/relational`, `/safety`, `/rtp`, and `/practice` with one tap.
4. Add a parent-facing Hammer voice to the accept-invite landing.

These four changes alone would move *Guidance Readiness* and
*Navigation Independence* past the threshold where the original
objective can be answered "yes".

---

**Audit complete. No code changes were made in producing this document.**
