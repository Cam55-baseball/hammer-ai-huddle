# Phase C — Humanization & Productization Layer

Strict scope reminder: no new primitives, no new doctrine, no RR-5…RR-10 sealing, no recruiter/injury/narrative/career/exposure work, no schema rewrites, no new event families. Edits live in presentation + copy + a11y + polish only. Canonical `emitAsbEvent` paths and existing projections are untouched.

## What gets built

### 1. Humanization audit doc
- New: `docs/asb/humanization-audit.md`
- One table per surface (`Relational.tsx`, `RelationalDemo.tsx`, `HammerConversationPanel`, `ParentTrustCard`, `DevelopmentalStageChip`, `SlumpReloadFlow`, `InjuryLifecycleStrip`, `RecruitingRoadmap`, `AthleteJourneyMap`, `ParentInvite.tsx`, `AcceptParentInvite.tsx`, `OnboardingFlow.tsx`).
- Columns: issue · severity (P0/P1/P2) · emotional impact · fix recommendation · resolved-in-section.
- Captured from a live mobile walkthrough at 390px + 440px (browser tool).

### 2. Canonical language system — `src/lib/relational/copy.ts`
- Add a `TERMS` map (one phrase per concept globally) + helper `humanize(key)`.
- Replacements applied across all relational surfaces (sweep, not just additions):
  - "relationship revoked" → "access removed"
  - "developmental gating" / "gated" → "age-based protection"
  - "scope" → "what they can see"
  - "lineage" / "replay-derived" → removed from athlete/parent-facing strings (kept only in `debug` blocks)
  - "confidence" / "inference" → "recent pattern"
  - "event" / "projection" / "state" → human equivalents per context
  - "consent" → "permission"
  - "counterparty" → "person"
- Voice: calm, observant, no exclamation marks, no hype, no startup language, no sports clichés.
- Existing keys (`HAMMER_VOICE`, `PARENT_VOICE`, etc.) are expanded — not renamed — so no consumer breaks.

### 3. Interface simplification pass
For each relational screen, enforce: **one primary action**, **one emotional focus per section**, progressive disclosure for secondary info.
- `Relational.tsx`: collapse the 2-column grid on mobile, give each card breathing room, hide debug data behind a "Details" disclosure.
- `HammerConversationPanel`: shorter responses, tighter line-height, no paragraph walls, single composer focus.
- `ParentTrustCard`: protection lead first, trust note second, counts moved to muted footer.
- `DevelopmentalStageChip`, `SlumpReloadFlow`, `InjuryLifecycleStrip`, `RecruitingRoadmap`, `AthleteJourneyMap`: remove redundant labels, soften radii/shadows, unify spacing rhythm using existing tokens.
- No new components; no logic changes; no new state.

### 4. Parent experience optimization
- `ParentInvite.tsx`: lead with "You stay in control." Three plain-language bullets: what they'll see, what's protected, how to remove access. Single primary CTA. Existing parent list collapses behind a disclosure once >0 items exist.
- `AcceptParentInvite.tsx`: replace IDs / "Issued at" timestamps with a calm one-sentence summary; keep technical details only inside a "Details" disclosure. Add reassurance paragraph: revocation is one tap, either side, anytime.
- `ParentTrustCard`: tighten copy via §2 vocab.

### 5. Athlete experience optimization
- `OnboardingFlow.tsx`: reduce step body text, single CTA, calmer eyebrow copy, no "unlock surfaces" jargon.
- `HammerConversationPanel`: max 2 short sentences per response, more whitespace, memory callbacks use observable references only ("you mentioned X on Tuesday"), no piled questions.

### 6. Visual polish
- Spacing: unify to `space-y-4` rhythm on stacked cards, `p-5` on primary cards.
- Radius/shadow: standardize on `rounded-xl` + `shadow-sm` for relational cards.
- Empty states: every relational surface gets a calm one-line empty state via §2 copy.
- Loading: replace any raw "Loading…" with skeleton or muted placeholder.
- No new animations; soften any existing harsh transitions.

### 7. Accessibility & resilience
- Audit per `skill/accessibility`: icon-only buttons get `aria-label`, tap targets ≥ 44×44 on mobile, single `<main>` per page (verify `Relational.tsx`, `ParentInvite.tsx`, `AcceptParentInvite.tsx`), `h-dvh` over `h-screen`, contrast via tokens.
- Refresh survivability: verify all surfaces re-render purely from projections (already true — spot-check, no code change unless drift found).

### 8. Cohesion pass
- Single sweep ensuring every surface uses §2 vocab, §6 spacing rhythm, §3 single-primary-action rule. Cross-link in audit doc.

### 9. Final humanization verification
- Mobile walkthroughs at 390 + 440 via browser tool: athlete onboarding · parent invite create · parent invite accept · revoke · relational demo page.
- Captured screenshots referenced in audit doc.
- Closing section in `humanization-audit.md`: issues fixed (with line refs), remaining friction, highest-risk confusion area, recommended next phase.

### 10. Stop gate
- No recruiter / exposure / narrative / career / injury / RR-5…RR-10 work. Phase ends after §9 report is written.

## Files expected to change

**New**
- `docs/asb/humanization-audit.md`

**Edited (copy / layout / a11y only)**
- `src/lib/relational/copy.ts` (expanded)
- `src/components/relational/HammerConversationPanel.tsx`
- `src/components/relational/ParentTrustCard.tsx`
- `src/components/relational/DevelopmentalStageChip.tsx`
- `src/components/relational/SlumpReloadFlow.tsx`
- `src/components/relational/InjuryLifecycleStrip.tsx`
- `src/components/relational/RecruitingRoadmap.tsx`
- `src/components/relational/AthleteJourneyMap.tsx`
- `src/pages/Relational.tsx`
- `src/pages/RelationalDemo.tsx`
- `src/pages/ParentInvite.tsx`
- `src/pages/AcceptParentInvite.tsx`
- `src/pages/OnboardingFlow.tsx`
- `src/components/onboarding/AthleteOnboardingShell.tsx` (spacing only, if needed)

## Verification

- `bunx tsc --noEmit`
- Existing relational vitest suite (must remain 103 passing — no logic changes expected).
- Browser walkthroughs at 390 + 440px, screenshots in audit doc.

## Out of scope (hard stop)

Recruiter workflow, injury lifecycle expansion, `narrative_event`, `career_arc`, `exposure_event`, `recruiter_contact_event`, RR-5…RR-10 sealing, new event families, schema rewrites, new architecture, notification transports, safeguarding delivery.
