

# Mental Practice Session Category — Full System Audit

## 1. Definition & Current Architecture

**"Mental" exists as a module tab in the Practice Hub** — one of seven categories: Hitting, Pitching, Throwing, Fielding, Catching, Baserunning, Mental.

### What exists:
- A tab entry in `PracticeHub.tsx` (line 39): `{ id: 'mental', icon: Brain, label: 'Mental' }`
- A scheduling option in `SchedulePracticeDialog.tsx` (line 24): `{ value: 'mental', label: 'Mental' }`
- A handedness gate entry in `HandednessGate.tsx` (line 18): `mental: { prompt: 'Handedness', left: 'Left', right: 'Right' }`

### What does NOT exist:
- **No rep-level fields** — `RepScorer.tsx` has zero references to "mental". No `ScoredRep` fields, no UI sections, no conditional rendering.
- **No rep source definitions** — `RepSourceSelector.tsx` has no `mental` entry in any source map.
- **No context engine integration** — `contextAppropriatenessEngine.ts` does not reference `mental` at all.
- **No analytics references** — No competition weighting, no MPI contribution, no trend tracking, no performance scoring.
- **No dedicated component** — No `MentalRepFields.tsx` or equivalent exists.
- **No database schema support** — No mental-specific columns in `performance_sessions`.

### Result: Mental is a **dead tab**. Selecting it enters the Practice Hub flow but hits the RepScorer with no matching module logic — the user gets an empty or broken rep logging experience.

---

## 2. Analytics Integration: None

- Does not influence performance scoring — **No**
- Does not adjust weighting — **No**
- Does not impact trend analysis — **No**
- Does not integrate into player development reports — **No**
- Does not affect readiness indicators — **No**
- Not tied to HRV, confidence, or skill modules — **No**

---

## 3. Overlap Audit

| Existing System | Covers Mental Ground? |
|---|---|
| Pre-Session Readiness (FeelingsPrompt) | Mind rating 1-5, mental state capture |
| Mental Energy Rating (Vault quiz) | 5-level mental energy scale |
| Mental Wellness Trend Card (Vault) | Mood + stress trend tracking over time |
| Mind Fuel module | Education content: focus, visualization, discipline, psychology |
| Goal of Rep / Actual Outcome | Per-rep intent and reflection |
| Daily Focus Quizzes (Vault) | Morning/pre-workout/night mental check-ins |
| Confidence scoring (S2 cognitive tests) | Processing speed, impulse control, fatigue index |

**Conclusion**: Mental readiness and wellness are already captured across 6+ existing systems. The "Mental" practice tab duplicates intent without adding any unique data capture.

---

## 4. Practical Use Cases — Assessment

A "Mental Practice" session in baseball/softball could theoretically cover:
- Visualization reps (pitch sequencing, at-bat scenarios)
- Breathing/meditation sessions
- Film study with mental tagging
- Pressure simulation exercises

**Problem**: None of these produce rep-level quantitative data that fits the RepScorer architecture. They are inherently qualitative — better suited to the Vault journal system, Mind Fuel education module, or a dedicated visualization tool rather than forced into the practice logging pipeline.

---

## 5. UX Impact

- **Creates confusion** — Users select "Mental" and get an empty/broken rep flow
- **Breaks architectural consistency** — Every other module has rep fields, sources, and analytics. Mental has none.
- **Handedness gate is nonsensical** — Asking for "Handedness: Left/Right" before a mental session has no purpose
- **Adds clutter** — Takes horizontal tab space from functional modules

---

## 6. Recommendation: **REMOVE**

### Reasoning:
1. It is a dead module with zero implementation
2. Mental wellness is already covered by 6+ existing systems
3. It cannot produce quantifiable rep-level data compatible with the RepScorer architecture
4. It creates UX confusion and tab clutter
5. It has no analytics integration and never will in its current form

### What to remove:
| File | Change |
|---|---|
| `src/pages/PracticeHub.tsx` | Remove `mental` from `modules` array (line 39) |
| `src/components/practice/SchedulePracticeDialog.tsx` | Remove `mental` from categories (line 24) |
| `src/components/practice/HandednessGate.tsx` | Remove `mental` entry from `MODULE_CONFIG` (line 18) |

### What stays (already handling mental performance):
- **Pre-Session Readiness** — body + mind ratings before every session
- **Vault Mental Wellness Trend** — mood + stress tracking over time
- **Daily Focus Quizzes** — morning/pre-workout/night mental check-ins
- **Mind Fuel** — education content on focus, visualization, discipline
- **Goal of Rep / Actual Outcome** — per-rep intent and reflection
- **S2 Cognitive Tests** — processing speed, impulse control, fatigue index

These systems collectively provide stronger mental performance tracking than a hollow practice module ever could — and they do it with real data integration into the analytics pipeline.

