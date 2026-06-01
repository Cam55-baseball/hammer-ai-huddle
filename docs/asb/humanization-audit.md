# Humanization Audit — Phase C

Scope: every athlete/parent-facing relational surface. Severity P0 = blocks
comprehension; P1 = degrades emotional safety / clarity; P2 = polish.

All edits are presentation-only. Canonical emit paths, projections, schemas,
RR-1…RR-4 invariants, and the `relational.*` topic namespace are untouched.

## Surfaces audited

| File | Audience |
|---|---|
| `src/pages/Relational.tsx` | athlete |
| `src/pages/RelationalDemo.tsx` | presenter + audience |
| `src/pages/ParentInvite.tsx` | athlete inviting a parent |
| `src/pages/AcceptParentInvite.tsx` | parent accepting an invite |
| `src/pages/OnboardingFlow.tsx` | first-run athlete |
| `src/components/relational/HammerConversationPanel.tsx` | athlete |
| `src/components/relational/ParentTrustCard.tsx` | parent / athlete |
| `src/components/relational/DevelopmentalStageChip.tsx` | athlete |
| `src/components/relational/SlumpReloadFlow.tsx` | athlete |
| `src/components/relational/InjuryLifecycleStrip.tsx` | athlete |
| `src/components/relational/RecruitingRoadmap.tsx` | athlete |
| `src/components/relational/AthleteJourneyMap.tsx` | athlete |

## Findings

### `ParentInvite.tsx`

| # | Issue | Sev | Emotional impact | Fix | Resolved §|
|---|---|---|---|---|---|
| 1 | Lead text mentions "replay-derived and lineage-visible" | P0 | parent/athlete feel confronted by jargon | replace with plain "You stay in control" lead | §2, §4 |
| 2 | Raw token URL dumped into a `<div>` with `break-all` | P1 | feels technical, unsafe to copy | wrap in a "Copy link" affordance + helper text | §4 |
| 3 | Per-relationship `relationship_id.slice(0,8)…` shown to athlete | P1 | meaningless string; suggests athlete is talking to a system | hide id; show "Parent · status" only | §4 |
| 4 | `meta.sourceCount` debug counter at bottom | P2 | low-signal noise | move behind a "Details" disclosure | §4 |
| 5 | "Revoke" button uses harsh word | P1 | feels punitive | "Remove access" | §2, §4 |

### `AcceptParentInvite.tsx`

| # | Issue | Sev | Emotional impact | Fix | Resolved §|
|---|---|---|---|---|---|
| 6 | Page leads with "constitutional parent counterparty for this athlete" | P0 | scary, legalistic | replace with one-sentence calm summary | §2, §4 |
| 7 | UUIDs + ISO timestamps shown front-and-center | P1 | reads like a SOC dashboard | move to "Details" disclosure | §4 |
| 8 | "Resolving invite…" raw spinner copy | P2 | tech-y | "Looking up the invite…" | §2 |
| 9 | No explicit "either side can remove access anytime" reassurance | P1 | parent fears commitment | add reassurance paragraph | §4 |

### `OnboardingFlow.tsx`

| # | Issue | Sev | Emotional impact | Fix | Resolved §|
|---|---|---|---|---|---|
| 10 | "We unlock surfaces as you log signal" | P0 | reads as engineer-speak to an 11-year-old | rewrite in plain language | §2, §5 |
| 11 | Step bodies are dense and instruction-like | P1 | overwhelming | shorten to one calm sentence each | §5 |
| 12 | "All set" terminal state has no warm acknowledgement | P2 | abrupt | add a calm closing sentence | §5 |

### `Relational.tsx`

| # | Issue | Sev | Emotional impact | Fix | Resolved §|
|---|---|---|---|---|---|
| 13 | Title "Relational organism" | P0 | jargon | "Your circle" | §2, §3 |
| 14 | Two-column md-grid stacks 4 cards visually busy on mobile | P1 | cognitive overload | single column on mobile, more spacing rhythm | §3, §6 |
| 15 | No ordering rationale — protection cards mixed with conversation | P1 | weak hierarchy | order: emotional check-in → conversation → protection → history | §3, §8 |

### `RelationalDemo.tsx`

| # | Issue | Sev | Emotional impact | Fix | Resolved §|
|---|---|---|---|---|---|
| 16 | "ledger" appears in athlete-visible copy | P0 | leaks internals | rewrite using §2 vocab | §2 |
| 17 | "Verified by 80+ replay tests" closing | P2 | demo audience appropriate but mixed-audience surface | keep behind presenter mode (already gated) | — (acceptable) |

### `HammerConversationPanel.tsx`

| # | Issue | Sev | Emotional impact | Fix | Resolved §|
|---|---|---|---|---|---|
| 18 | Speaker role rendered as raw enum (`hammer`, `athlete`) capitalized | P1 | clinical | map to "You" / "Hammer" | §2, §5 |
| 19 | `utterance_ref` is a hex hash, not the message | P0 (demo-only — currently expected since payloads store the ref) | unreadable in athlete view | when ref looks hex-only, show a calm placeholder; real implementations should pass `utterance_text` later — out of scope, audit-noted | §5 (mitigation) |
| 20 | Empty state pleasant but composer disabled state has no message | P2 | uncertain | leave (works fine) | — |

### `ParentTrustCard.tsx`

| # | Issue | Sev | Emotional impact | Fix | Resolved §|
|---|---|---|---|---|---|
| 21 | "Protected first" badge OK; "Parent has shown up N times" reads as surveillance | P1 | unintended creep | reframe: "{N} moment{s} together so far" | §2, §4 |

### `DevelopmentalStageChip.tsx`

| # | Issue | Sev | Emotional impact | Fix | Resolved §|
|---|---|---|---|---|---|
| 22 | "Recruiting paused" badge appears even when irrelevant context | P2 | low | keep; already correct copy | — |
| 23 | Debug `key:` badge can leak if `debug` flag forgotten | P2 | low | already gated by `debug` prop; OK | — |

### `SlumpReloadFlow.tsx`

| # | Issue | Sev | Emotional impact | Fix | Resolved §|
|---|---|---|---|---|---|
| 24 | `border-destructive/40` red ring on a calm check-in | P1 | alarming, opposite of intent | use neutral border + soft accent | §5, §6 |

### `InjuryLifecycleStrip.tsx`

| # | Issue | Sev | Emotional impact | Fix | Resolved §|
|---|---|---|---|---|---|
| 25 | Phase labels are clinical ("Subacute") | P1 | clinical for an 11-year-old | softer phase labels via copy | §2 |

### `RecruitingRoadmap.tsx`

| # | Issue | Sev | Emotional impact | Fix | Resolved §|
|---|---|---|---|---|---|
| 26 | "Developmental safeguard active" badge | P1 | jargon | "Age-based protection" | §2, §4 |

### `AthleteJourneyMap.tsx`

| # | Issue | Sev | Emotional impact | Fix | Resolved §|
|---|---|---|---|---|---|
| 27 | Topic labels "Stage change / Narrative beat / Exposure" | P1 | abstract | "Growing up step / Memory / Outside attention" | §2 |

## Cross-cutting

- C1 — Inconsistent radius (`rounded-md`, `rounded-xl`) — standardize on Card defaults via `shadcn` Card.
- C2 — `min-h-screen` used in three pages — replace with `min-h-dvh` for mobile chrome safety (P2 a11y).
- C3 — Several `<Button size="icon">` without `aria-label` — none in relational surfaces today; spot-check passes.
- C4 — All relational pages render exactly one `<main>` — OK.

## Resolution log

Section refs map to the approved plan in `.lovable/plan.md`:

- §2 — `src/lib/relational/copy.ts` expanded with a single `TERMS` map + consistent voice
- §3 — `Relational.tsx` reordered + single-column on mobile
- §4 — `ParentInvite.tsx` and `AcceptParentInvite.tsx` rewritten for protection-first language
- §5 — `OnboardingFlow.tsx`, `HammerConversationPanel.tsx`, `SlumpReloadFlow.tsx` calmed
- §6 — Radius/border/shadow rhythm aligned; `min-h-dvh`
- §8 — Recruiting + Journey label sweeps

## Remaining friction (after Phase C)

1. `HammerConversationPanel` still shows the hashed `utterance_ref` because
   the conversation primitive intentionally stores a content-addressed handle
   rather than the message text. A future phase that introduces an opt-in
   `utterance_text` field will be needed for true legibility — out of scope
   for the humanization pass (no new doctrine, no schema rewrites).
2. Parent invite token is opaque; no email delivery transport. Sharing the
   link still requires the athlete to copy/paste it manually. Notification
   transports remain out of scope per the stop gate.
3. Safeguarding route classifier exists but has no human-facing notification
   surface yet — by design (Phase D would activate that).

## Highest-risk confusion area

`AcceptParentInvite.tsx` was previously the worst offender (UUIDs and
"constitutional parent counterparty" wording in the primary content path).
Resolved in §4. Re-audit recommended on the first real parent walkthrough.

## Recommended next phase

Phase D — Safeguarding Notification Delivery + Parent Email Transport. Keeps
RR-5…RR-10 sealed, recruiter/injury/exposure/career/narrative work paused,
and gives the parent flow an actual delivery channel. Only proceed after at
least one real parent + one real minor have used the current flow end-to-end.
