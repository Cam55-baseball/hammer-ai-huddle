## Phase 10.4 — Live Standard Awareness Layer (Final Pre-Launch Pass)

Pure awareness/integration pass on top of `useDailyOutcome` (already the single source of truth from Phase 10.3). No new systems, no DB or evaluator changes.

---

### Part 1 — Game Plan Standard Header (`src/components/GamePlanCard.tsx`)

Insert a new top-level header **inside `<CardContent>` (line 1376), as the first child above the existing "Bold Header" block (line 1377)**. Sourced from `useDailyOutcome()`.

- Map status → tone + icon:
  - `STANDARD MET` → emerald, `CheckCircle2`
  - `STANDARD NOT MET` → red, `AlertTriangle`
  - `RECOVERY DAY` → sky, `Moon`
  - `SKIP REGISTERED` → muted/zinc, `SkipForward`
- Style: `text-sm font-bold uppercase tracking-wide`, `border-l-4` accent matching the NN styling system (mirrors `DailyOutcomeInlineBanner` tones), background tint `bg-{color}/10`, padding `px-3 py-2`, rounded.
- Hidden while `loading === true` (avoids flash).
- Reactivity is automatic — `useDailyOutcome` already subscribes to `custom_activity_logs` + `custom_activity_templates`.

### Part 2 — Remaining Required Indicator

Directly under the header, conditional render:
```
nnTotal > 0 && nnCompleted < nnTotal
  → <p className="text-xs text-muted-foreground mt-1">
      {nnTotal - nnCompleted} required actions remaining
    </p>
```
When standard is met (or `nnTotal === 0`, or rest/skip), render nothing.

### Part 3 — Smart Scroll Anchor

- Add `id="nn-section"` to the existing NON-NEGOTIABLES wrapper at line 1995 (`<div className={cn("space-y-1 rounded-xl", ...)}>`).
- Add a one-shot `useEffect` in `GamePlanCard` keyed off the **first non-loading render**:
  - Guard with a `useRef(false)` so it fires once per mount.
  - Condition: `!loading && !outcome.loading && nnTotal > 0 && nnCompleted < nnTotal && !hideNN`
  - Action: `document.getElementById('nn-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })`
  - Wrapped in `requestAnimationFrame` to let layout settle.
- Never re-fires after mount → cannot interfere with manual scroll.

### Part 4 — Completion Reinforcement Pulse

- Track `prevNnCompleted` via `useRef`.
- In an effect on `[nnCompleted, nnTotal]`:
  - If `prevNnCompleted < nnTotal` AND `nnCompleted === nnTotal` AND `nnTotal > 0` AND `dayType !== 'rest' && dayType !== 'skip'`:
    - Set local state `pulseStandard = true` for 1000ms (then clear).
    - Fire `toast.success('Standard met.')` once (deduped via the same transition guard).
- Apply the pulse to the outer `<Card>` (line 1371) via conditional class:
  - `pulseStandard && 'ring-2 ring-emerald-500/60 transition-shadow duration-700'`
- No confetti, no looping animations.

### Part 5 — Language Lock (Global Consistency)

Audit and normalize the four surfaces to the **exact strings**: `Standard met`, `Standard not met`, `Recovery day`, `Skip registered`.

- `GamePlanCard` header (new): "STANDARD MET" / "STANDARD NOT MET" / "RECOVERY DAY" / "SKIP REGISTERED" (uppercase per styling).
- `src/components/identity/DailyOutcomeInlineBanner.tsx` — already conformant (uses same status strings). No change.
- `src/components/vault/quiz/NightCheckInSuccess.tsx` — verify Daily Outcome section uses exact phrasing; adjust any drift.
- `src/components/game-plan/NonNegotiableProgressStrip.tsx` — already uses "Standard met"/"Standard not met". No change.

### Part 6 — Suggestion Panel Awareness Sync (`src/components/identity/NNSuggestionPanel.tsx`)

- Import `useDailyOutcome`.
- Replace the static subline (line 28) with a status-aware line:
  - `STANDARD NOT MET` → "Locking these in reduces missed days."
  - `STANDARD MET` → "These are already part of your standard."
  - Otherwise (rest/skip/loading) → keep existing default: "Based on your recent behavior, these are already part of your identity."
- No other changes to this component.

---

### Files

**Edit:**
- `src/components/GamePlanCard.tsx` — Parts 1–4 (header, remaining indicator, scroll anchor + `id`, pulse on completion).
- `src/components/identity/NNSuggestionPanel.tsx` — Part 6 awareness subline.
- `src/components/vault/quiz/NightCheckInSuccess.tsx` — verify/normalize Part 5 phrasing only if drift found.

**No new files. No DB changes. No evaluator changes.**

---

### Invariants

- All state derives from `useDailyOutcome` — no parallel logic.
- No new components beyond edits to existing ones.
- Scroll fires at most once per mount.
- Pulse fires only on the `< nnTotal → === nnTotal` transition; never on initial mount when already complete.
- No scoring, evaluator, NN enforcement, or DB changes.

---

### Acceptance

- Opening Game Plan shows the live standard header at the top, color-coded.
- If NNs are incomplete, page auto-scrolls to NN section once and shows "{N} required actions remaining".
- Completing the final NN updates header to STANDARD MET within <1s, fires a one-time emerald ring pulse + single toast.
- All four surfaces (Game Plan header, ProgressDashboard banner, NightCheckInSuccess, NN strip) use identical status phrasing.
- Suggestion panel subline reflects current day status.
