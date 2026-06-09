
# Phase 1.0A — First Athlete Value Audit

**Scope lock.** Ratified v0.13 doctrine only. Critical path: account → video → BP **or** BH analysis → §17-conformant Report Card → Roadmap step → Coach Hammer delivery. Throwing / Catching / Defense / Baserunning / Softball excluded per CDR-15. No future doctrine, no future architecture.

---

## A. Already-completed implementation components

Inventory pulled from the live codebase (`src/`, `supabase/functions/`).

### A1. Athlete account creation — ESSENTIALLY DONE
- `src/pages/Auth.tsx`, `ResetPassword.tsx` — email/password auth, password reset wired to Supabase.
- `AthleteOnboarding.tsx`, `OnboardingFlow.tsx`, `SelectSport.tsx`, `SelectRole.tsx`, `SelectUserRole.tsx`, `ProfileSetup.tsx`, `components/onboarding/*` — full onboarding shell.
- `profiles` table (58 cols, 10 policies), `user_roles` (6 policies), `parent_athlete_links`, RLS in place.
- `Pricing.tsx`, `Checkout.tsx`, `stripe-webhook` edge function, `subscriptions`, `purchases`, `checkout_attempts`, `useSubscription` hook — paid-tier gating already in production.

### A2. Video submission — DONE
- `AnalyzeVideo.tsx` (1003 lines) — upload, thumbnail, key-frame extraction, save-to-library.
- `videos` table (24 cols, 8 policies), `session_videos`, `video_versions`, `video_annotations`.
- Supabase Storage path is wired through `videoHelpers.ts` / `frameExtraction.ts`.

### A3. BP / BH analysis engine — DONE (engine), PARTIAL (V1 surface mapping)
- `supabase/functions/analyze-video/index.ts` (2232 lines) — full module-dispatch analyzer.
- `src/lib/hittingPhases.ts` — **canonical BH binding** (P1/P2/P3/P4) per §5 / §17 §5.1.
- `src/lib/hittingCausalChains.ts`, `src/data/baseball/drillDefinitions.ts`, `pieV2Signals.ts` (referenced by §17).
- `src/lib/formulaPhases.ts` — **constitutionally invalid** per RFL-074 (still present; migration deferred, non-blocking for V1).
- BP signals/registry: present implicitly inside `analyze-video` but **no enumerated `baseball/pitchingV1Signals.ts`** matching the 11 §4.1 categories (Separation, Energy Angle, Tempo, Stride Length, Stride Direction, Posture, Front Side, Head Direction, Shoulder Plane, Rear Foot Drag, Eyes-on-Target).

### A4. Report Card surface — PARTIAL
- `src/components/report-card/UhrcReportCard.tsx`, `UhrcAthleteSection.tsx`, `UhrcDetailedAnalysis.tsx` — composite + pillar drill-down + LineageDrilldownButton.
- `src/lib/uhrc/types.ts` (UhrcReport type), `TheScorecard.tsx`.
- Hitting-specific: `HittingDoctrineBlock.tsx`, `HittingCausalChainCard.tsx`, `HittingRoadmapLadder.tsx`.

### A5. Roadmap surface — PARTIAL
- `components/causal/RoadmapLadder.tsx`, `components/hitting/HittingRoadmapLadder.tsx`.
- `athlete_roadmap_progress`, `roadmap_milestones` tables exist.

### A6. Coach Hammer delivery — DONE
- `components/hammer/HammerChat.tsx`, `HammerDailyPlan.tsx`, `HammerStateBadge.tsx`, `ReadinessChip.tsx`.
- `supabase/functions/hammer-chat`, `compute-hammer-state`, `coach-hammer-next-step`.
- `useHammerChat` hook, `hammer_state_snapshots`, `hammer_state_explanations_v2` tables.
- `AnalysisCoachChat.tsx` already mounts in `AnalyzeVideo.tsx` (line 29).

---

## B. Missing components for first-athlete-value (V1 BP + BH only)

These are the **only** items blocking a real athlete from completing the loop. All sized against ratified §0–§17 doctrine; no new doctrine added.

### B1. §17 V1 surface conformance (HIGHEST LEVERAGE)
The §17 nine-block schema (§0.6 Universal Category Explanation Law) is **doctrinally ratified** but **not yet rendered**:
1. What is it · 2. Why it matters · 3. If poor → performance/durability/efficiency/consistency · 4. How to improve · 5. Drill · 6. Video · 7. Roadmap step · 8. Coach Hammer voice · 9. Confidence + missingness.

Current `UhrcReportCard` shows pillar score + drill-down + biggest-leak banner only. It does **not** yet render the nine blocks per category.

**Missing artifact:** a category panel component (one for BP, one for BH) that consumes §4.1 / §5.1 schema content and renders the nine blocks with `<pending tagging>` slots displayed as §3 Law 7 visible missingness chips.

### B2. BP V1 signal registry — MISSING
- No `src/data/baseball/pitchingV1Signals.ts` (or equivalent) enumerating the 11 §4.1 categories with their `engine_binding`, `display_format` (Pass/Fail vs band per CDR-1=D), `hierarchy_rank` (Non-Negotiable vs ranked), and §0.27 C1 weights (14/12/10/5/5/17/9/7/7/7).
- `analyze-video` currently returns a generic shape; needs a deterministic mapping into the 11 §4.1 categories.

### B3. BH V1 schema content store — MISSING
- §5.1 P1–P4 doctrinal copy (What/Why/If poor/How) lives in markdown only. Needs to be lifted into a typed module (e.g. `src/data/baseball/hittingV1Schema.ts`) the report-card component can import. No new copy authored — verbatim transfer of ratified §5.1 text.

### B4. §17 schema content store for BP — MISSING
- Same as B3 but for §4.1's 11 categories. Verbatim transfer only.

### B5. Deterministic deficiency → drill mapper — PARTIAL
- `drillDefinitions.ts` exists; per §7, V1 requires a **deterministic** deficiency-keyed ordered drill list per discipline. Operational tagging backlog is allowed (visible missingness), but the **resolver function** (deficiency_id → ordered drill_id[]) does not exist yet.

### B6. Deterministic deficiency → roadmap step mapper — PARTIAL
- `roadmap_milestones` table exists; per §9, V1 requires a deterministic deficiency → next roadmap step resolver. Visible-missingness fallback per §3 Law 7 when unmapped.

### B7. Video pairing resolver — PARTIAL
- Per §8, each category needs ≥1 `reference_good` + ≥1 `corrective` or visible missingness. `video_tag_taxonomy`/`video_tag_assignments` tables exist; resolver and the five §8 tag values (`reference_good`, `reference_bad`, `corrective`, `teaching`, `roadmap_step`) need to be wired. Untagged videos render as visible missingness — non-blocking.

### B8. Coach Hammer per-category voice rewrite call site — PARTIAL
- `hammer-chat` exists, but the **report-card-embedded** rewrite (block 9 of §0.6, per-category) needs a dedicated invocation that passes the category schema and athlete/parent/coach voice flag (§16 I).

### B9. Trend / first-measurement chip per §11 — MISSING
- §11 trend chip ("first measurement" / "improved" / "regressed" / "stable") needs a per-category compute pass from `mpi_scores` / `hie_snapshots` history. Confidence-bound delta required.

### B10. Non-Negotiable Pass/Fail gate rendering — MISSING
- §0.7 P1 + P4 (BH) and §4.1 Eyes-on-Target / Hip Alignment / Front Side / Separation gates (BP) render as Pass/Fail chip + band-on-click per CDR-1=D. Component does not yet enforce this two-mode rendering.

### B11. "Encouraged" tone palette enforcement — MOSTLY DONE, AUDIT NEEDED
- Existing surfaces use design-system tokens. Per §0.3, a quick palette audit of the new category panel against the §0.10 Z6 ratification (red/destructive allowed only where doctrine permits) is needed before V1 ship.

---

## C. Critical-path dependency order

```text
B3 + B4 (V1 schema content stores: BH §5.1, BP §4.1)
        │
        ├─► B2 (BP signal registry — needed only for BP)
        │       │
        │       └─► analyze-video output mapper → §4.1 categories
        │
        ├─► B1 (§17 nine-block category panel component)
        │       │
        │       ├─► B10 (Non-Negotiable Pass/Fail gate render)
        │       ├─► B5 (deficiency → drill resolver)
        │       ├─► B6 (deficiency → roadmap resolver)
        │       ├─► B7 (video pairing resolver)
        │       ├─► B8 (per-category Coach Hammer rewrite hook)
        │       └─► B9 (trend / first-measurement chip)
        │
        └─► B11 (tone/palette audit — final gate before ship)
```

BH path is shorter (skips B2). BH can ship first; BP follows once B2 lands.

---

## D. Earliest "first athlete receives value" milestone

**Minimum viable loop = A1 + A2 + A3 (engine) + B3 + B1 + B8.**

- Athlete signs up (A1), uploads a hitting video (A2), `analyze-video` returns hitting phase scores (A3), `UhrcReportCard` + new §17 category panel renders §5.1 nine-block content (B1 + B3), Coach Hammer rewrites the per-category paragraph in the athlete's voice (B8).
- Drill / video / roadmap slots render as §3 Law 7 visible-missingness chips — **constitutionally legal** per §17 V1 ratification (RFL-092).
- **BH-only first-value is achievable without B2, B5, B6, B7, B9, B10** by accepting visible missingness everywhere doctrine permits.

**Earliest milestone: BH-only loop with B3 + B1 + B8 done.** Single discipline (Baseball Hitting), one real athlete, end-to-end.

---

## E. Earliest "first paying athlete" milestone

**Adds to D:** Stripe is already wired (`stripe-webhook`, `Checkout.tsx`, `useSubscription`, gating in `AnalyzeVideo.tsx`). The only additions on top of D are:

- B10 (Non-Negotiable Pass/Fail gate render) — required so P1 + P4 do not render as plain bands and violate §0.7.
- B11 (tone/palette audit) — required so a paying athlete cannot encounter a §0.3 violation.
- BP path live → requires B2 + B4 in addition to D, so the paying athlete can pick either discipline.

**Earliest milestone: D + B10 + B11 + (B2 + B4) for BP parity.** Same engine, same surfaces, only Stripe gate enforced — which it already is.

---

## F. Earliest "public beta" milestone

**Adds to E:**

- B5 (drill resolver) — public beta athletes expect a drill on at least the highest-leverage deficiency, even if other categories show visible missingness.
- B6 (roadmap resolver) — same rationale, at least for the biggest-leak category.
- B7 (video pairing resolver) — at least one `reference_good` + one `corrective` per discipline's biggest-leverage category.
- B9 (trend chip) — public beta athletes return for a second session; trend is the retention surface.
- Operational tagging backlog partially burned down for the **top 3 deficiencies per discipline** (not constitutional, but required for the beta to feel alive — remaining slots stay as visible missingness, legal under §3 Law 7).

**Earliest milestone: E + B5 + B6 + B7 + B9 + minimum operational tagging for top-3 deficiencies × {BP, BH}.**

---

## Out of scope (per CDR-15 and §18 prohibitions)

Throwing, Catching, Defense, Baserunning, Softball Pitching, Softball Hitting. No work, no surfaces, no migrations. `formulaPhases.ts` cleanup deferred per RFL-074. Full operational tagging completion deferred to backlog.

## Closing

This audit produces no edits. It identifies the **smallest deterministic path** from ratified v0.13 doctrine to a real BP/BH athlete receiving value. Phase 1.0 implementation tickets can now be scoped against B1–B11.
