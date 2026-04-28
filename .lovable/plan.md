## Goal

Three changes to the dashboard:
1. Remove the "Quick Add" button from the **top of the Game Plan card** (header). The original "Quick Add" button at the **bottom action row** stays — that becomes the only one again.
2. Move the **Quick Actions** section (currently the last section inside the Identity Command Card) out of the Identity card and render it as its own block **between the Identity card and the Game Plan card** on the Dashboard.
3. Audit the **Readiness** number that appears inside Quick Actions and document/fix what's wrong.

---

## 1. Remove Quick Add from Game Plan header

**File:** `src/components/GamePlanCard.tsx`

- In `StandardAwarenessHeader` (around lines 3209–3304), remove the `showQuickAdd` / `onQuickAdd` props, the `QuickAddBtn` element (lines 3232–3242), and the two render slots (lines 3266 and 3300). Replace each `<div className="flex items-start justify-between gap-3">…{QuickAddBtn}</div>` with the inner content directly (no flex row, no right-side button).
- At the call site (lines 1581–1594), drop `showQuickAdd` and `onQuickAdd` props.
- Leave the bottom-row Quick Add button (lines 2061–2071 and 2177–2185) untouched — that's the canonical location.

Result: header is purely informational again ("Standard Met" / "No Non-Negotiables set" primer / etc.); Quick Add lives only in the bottom action row of the Game Plan.

---

## 2. Extract Quick Actions into its own card between Identity and Game Plan

**Files:** `src/components/identity/IdentityCommandCard.tsx`, `src/pages/Dashboard.tsx`, plus a new component `src/components/identity/QuickActionsCard.tsx`.

### 2a. New component `QuickActionsCard.tsx`

Move the JSX currently at `IdentityCommandCard.tsx` lines 509–552 (the entire `{/* ── 4. Quick Actions ── */}` section) into a standalone component that:
- Owns its own state (`logOpen`) and renders `<QuickLogSheet>` at the bottom.
- Calls `useNextAction()` for `next.route`, `next.label`, `next.ctaLabel`, `next.moduleHint`.
- Renders the same content: `SectionHeader`, `HammerStateBadge`, `ReadinessChip`, "Next up" label/CTA, and the `Log` button.
- Is wrapped in a styled card container (rounded border, padding) consistent with sibling cards on the dashboard, so it reads as a peer block instead of an embedded section.
- Re-exports a small inlined `SectionHeader` (or move `SectionHeader` to a shared file under `src/components/identity/SectionHeader.tsx` and import it from both files).

### 2b. Remove the section from `IdentityCommandCard.tsx`

Delete lines 509–552 plus the now-unused state/handlers if applicable:
- Remove the `Quick Actions` `<section>` block.
- Remove `QuickLogSheet` render (line 559) and its `logOpen` state if nothing else uses them inside this component (verify with a quick search; only the Quick Actions section uses `setLogOpen`).
- Remove now-unused imports (`HammerStateBadge`, `ReadinessChip`, `QuickLogSheet`, `Plus`, `useNextAction`, `useNavigate` if not used elsewhere).

### 2c. Wire it into the Dashboard

**File:** `src/pages/Dashboard.tsx` (around lines 586–594)

```
{(isOwner || isAdmin || (!isScout && !isCoach)) && <IdentityCommandCard />}
{(isOwner || isAdmin || (!isScout && !isCoach)) && <QuickActionsCard />}
{(isScout || isCoach) && <CoachScoutGamePlanCard … />}
{(isOwner || isAdmin || (!isScout && !isCoach)) && <GamePlanCard … />}
```

So order becomes: **Identity → Quick Actions → Game Plan**.

---

## 3. Readiness score audit

The number shown next to the Hammer state in Quick Actions comes from `<ReadinessChip />` (`src/components/hammer/ReadinessChip.tsx`), backed by `useReadinessState()` (`src/hooks/useReadinessState.ts`).

### How it's computed today

Composite of up to three weighted sources:
- **HIE Readiness** (`hie_snapshots.readiness_score`) — weight 0.5
- **Regulation Index** (`physio_daily_reports.regulation_score`) — weight 0.3
- **Focus Quiz** (`vault_focus_quizzes.focus_score`, last 36 h) — weight 0.2

Weights are renormalized over whichever sources actually returned data. If none exist, score falls back to a hardcoded **60** with confidence 0.

Color/state thresholds: `>=70` green, `>=50` yellow, `<50` red.

### Bugs / issues to fix

1. **Silent fallback of 60 with no signal.** When a user has no HIE snapshot, no physio report, and no recent focus quiz, the chip shows "Readiness 60" in yellow as if it were a real measurement. Users see a number that never moves and can't tell why. Fix: when `sources.length === 0`, render the chip as "Readiness — / Set up" (or hide the score and show a "Tap to seed" affordance), and treat confidence 0 as an explicit empty state inside `SourceSheet` (already handled there, but the pill itself lies).
2. **Stale HIE / Regulation never expire.** The query pulls the most recent row regardless of age. A snapshot from two weeks ago is treated identically to one from this morning. Fix: apply a freshness window (e.g. HIE within 48 h, Regulation within 36 h, matching the focus-quiz window). Sources older than the window should be dropped from the composite, which will naturally drop confidence and trigger the empty-state pill.
3. **Reweighting hides missing high-weight sources.** If only the Focus Quiz exists (weight 0.2), it gets renormalized to 1.0, so a single self-reported focus answer becomes the whole readiness score with no visual indication of low confidence. Fix: keep the renormalization but require `confidence >= 0.3` (i.e. at least the HIE 0.5 weight or HIE + Regulation) before showing a numeric score; otherwise show the "needs more data" state from #1.
4. **No realtime channel for `vault_focus_quizzes`.** The hook subscribes to `hie_snapshots` and `physio_daily_reports` but not to the focus-quiz table, so a freshly submitted quiz doesn't update the chip until the 60 s `staleTime` expires or the user navigates. Fix: add a third `.on('postgres_changes', …)` for `vault_focus_quizzes` filtered by `user_id`.
5. **`stateFor` thresholds disagree with the empty fallback.** Default 60 → yellow ("Caution"). With no data we should not be telling the user to be cautious. Resolved by #1 (no number when there are no sources).

### Plan for the readiness fixes

In `src/hooks/useReadinessState.ts`:
- Add freshness gates per source (drop rows older than the window).
- Compute and return `hasSignal` (= `sources.length > 0 && confidence >= 0.3`).
- Subscribe to `vault_focus_quizzes` realtime channel.

In `src/components/hammer/ReadinessChip.tsx`:
- When `!hasSignal`, render a neutral pill: gray dot + "Readiness — Set up" that opens the existing `SourceSheet` so the user can see which signals are missing.
- When `hasSignal`, keep current behavior.

No DB migration required.

---

## Out of scope

- No changes to `useIdentityState`, `IdentityBanner`, the consistency formula, or any non-negotiable logic.
- No layout changes inside the Game Plan body other than removing the header pill.
- No new tables or RLS work.
