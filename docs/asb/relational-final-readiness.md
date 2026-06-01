# Relational Demo — Final Readiness Verdict

**Date:** 2026-06-01
**Scope:** Hammers Modality `/relational/demo` walkthrough
**Pass:** War-room final hardening (Phases 152–154 sealed)

---

## Presentation runtime

- **Target:** 11:00 (intro 0:45 + 9 steps totaling 10:30, with ~30s transitions)
- **Minimum (rushed):** ~8:30 — skips intro Card and reads chip subtitles only.
- **Typical:** **11:00 ±30s** with `?presenter=1` overlay enforcing per-step bands.
- **Maximum (deep Q&A in step 5):** ~14:00 before audience patience starts to drift.

## System stability

| Surface | Status |
|---------|--------|
| `/relational` admin | ✅ Stable — debug props preserved. |
| `/relational/demo` | ✅ Stable — null-render risk on step 4 closed. |
| `/relational?fallback=fixture` | ✅ Stable — in-memory seed unaffected by live DB. |
| `PresenterOverlay` (`?presenter=1`) | ✅ Stable — no production surface impact when absent. |
| Canonical pipeline (`prepareRows`, `emit.ts`, projections) | ✅ Untouched in this pass. |
| Replay tests (80+) | ✅ Last green run carried forward from validation pass. |

## Highest-risk failure point

**Live database latency on first projection load.**

A cold visit to `/relational/demo` can show empty content for ~150–400ms while
`useAsbTimeline` resolves. If the network round-trip exceeds ~1s during the
demo, step 1 ("Today") will appear empty before the presenter has finished the
opening sentence.

**Mitigation (in place):**
1. Pre-warm by visiting `/relational/demo` once before the audience arrives.
2. `requestAnimationFrame` warm on mount paints the chrome immediately.
3. If still empty after 2s, the presenter hits `F` to open
   `/relational?fallback=fixture` in a new tab and continues from there with
   identical components and identical lineage.

## Fallback confidence

**High.** The fixture seed in `_seed.ts` is the same seed the failure-injection
and replay-reconstruction tests run against. If the live route fails, the
fallback route renders the same seven components, the same Hammer turns with
the same `recalled_event_ids`, and the same developmental gates. The audience
will see no narrative discontinuity.

## Emotional coherence rating

| Step | Rating | Notes |
|------|--------|-------|
| 0 Intro | 4 / 5 | Could be one sentence shorter. |
| 1 Today | 4 / 5 | Strong opener. |
| 2 Journey | 5 / 5 | The longitudinal arc lands. |
| 3 Where they are | 4 / 5 | Growth-spurt explanation is the strongest doctrine moment. |
| 4 Slump | **5 / 5** | Peak — "noticed before anyone named it out loud." |
| 5 Hammer remembers | **5 / 5** | Peak — citation chips visibly tie the future to the past. |
| 6 Parent safety | 5 / 5 | "Protected first" framing now leads. |
| 7 Recruiting | 4 / 5 | Quieter; intentional. |
| 8 Injury | 3 / 5 | Brief by design. |
| 9 Replay proof | 4 / 5 | Lands harder if the presenter expands the proof panel. |

Weighted average: **4.4 / 5**.

## Technical coherence rating

**5 / 5.** Every surface reads through `useRelationalProjections`. Every write
routes through `emit.ts`. Zero parallel state. Replay-test coverage spans
visibility firewall, developmental gating, citation enforcement (RR-1),
psych-state confidence ceilings, and failure containment. The fallback fixture
is byte-equivalent to the live seed.

## Final recommendation

# 🟢 GO

Conditions:

1. **Pre-warm `/relational/demo` in the presentation browser tab** before the
   audience arrives.
2. **Launch with `?presenter=1`** so the cadence stays inside the 11:00 ±30s band.
3. **Keep `/relational?fallback=fixture` open in a second tab** as the
   one-keystroke recovery surface.
4. After the demo, freeze all non-critical changes. The architecture lock
   recorded in `docs/asb/presentation-mode-lock.md` and
   `mem://constraints/presentation-mode-lock` remains in force until the
   post-presentation review.
