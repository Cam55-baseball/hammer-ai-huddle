# AR7 — goal confirmation and owner answer readback

**Ready to publish: NO. Preview-only; no live changes.**

## Done

- **Goal confirmations now reach canonical planning for legacy records.** Previously a V1 goal payload retained old `goals[].rank` while a new top-level categoryOrder was saved; canonical V1 normalization ignored that top-level order. Confirmation now preserves entered intents/notes and both sport panes while rewriting existing legacy ranks to match the chosen order. V2 rankings retain their existing sport choices. No goals, faults, dose or minute shares are invented.
- **Goal save no longer requests a plan rebuild.** The card awaits self-keyed goal/context invalidation, reads the saved order back, handles thrown and returned write failures, retains the old confirmation on failure and allows retry. Only the canonical provider owns generation; unchanged practice/lifting/safety prescriptions remain intact.
- **Owner list, question readback and edit now agree on the declared current version.** The general console previously selected the highest version in history while question readback correctly used current_version. A shared declared-version resolver now serves both; ambiguous current versions disable editing. Stray higher history remains history, not active advice. Saved answers expose their actual timestamp and link to existing version history. No new question store, permission logic or executable prose rule.
- **Owner failed save keeps the answer draft.** Thrown failures now end the busy state and permit retry; successful writes refresh the existing versioned read before clearing the form. Tests verify exact sport/area/question identity, append-only editing and unchanged previous version.

## Parallel execution investigation

The investigation proposed sorting at the display edge. Source review confirms hitting, defense and running already pass through `structureSkillSession` in the actual builder (dailyPlan.ts lines 870, 1129, 1218), which sorts existing stages. No redundant UI reorder or invented execution work was added. Full position/pitching/live-execution acceptance remains open; this run does not claim completion of that stream.

## Proof

- Focused actual component save/readback plus goal calendar, principles, question identity and six-cohort simulations: **6 files / 36 tests PASS**, `/tmp/ar7-focused.log`.
- Final save/readback component rerun after correcting a test selector type: **2 files / 7 tests PASS**, `/tmp/ar7-readback-final.log`.
- Final fresh complete suite on corrected files: **443 files / 3,588 tests PASS**, `/tmp/ar7-final-full-suite.log`.
- Automatic preview build **OK 17:21:27 UTC**. Earlier test-only `ByRoleOptions.exact` error was removed and the same tests rerun; no unexplained preview error remains.
- Real injected player at 390×844: existing `/__evidence/roadmap-closeout` renders the production goal card with real saved-history read. Five draft selections in Fielding/Hitting/Throwing/Power/Speed order; Save enabled; zero page errors or horizontal overflow. Element screenshot `/tmp/browser/ar7/goal-order-draft-phone.png` inspected. **No Save clicked.** This is draft-layout proof on the existing evidence page, not dashboard acceptance, day-84 acceptance or durable hosted save/readback. The actual dashboard remains blocked by unfinished assessment; no account state was bypassed. The production-component test flows use in-memory reads/writes, not a hosted account.

## Open acceptance and blockers

- Coach/org plan section: authorized canonical final skill-plan read and verified training-sharing consent still missing; health consent, owner access and recruiting access are not substitutes.
- Practice dose reduction/goal minute-share: explicit actual skill-row floors/envelopes missing. No invented reductions.
- Mixed signals/learning: comparable canonical sport/category evidence and server comparative outcomes remain missing; usage never supplies effectiveness.
- Owner executable question answers: persisted responses are prose, not typed training rules. Live owner save/readback requires affected owner session; injected account is a player.
- Full position/pitching execution, explicit severe/mechanics goal sources, positive athlete/coach/org phone acceptance, testing-day/day-84 hosted save-readback and hosted six-cohort acceptance remain pending.

No publish/deploy/migration/switch/cron/iOS changes. No explicit TEST/backend writes, ranking timestamp aging, assessment changes, consent changes or password resets. No TEST data to clean up; TEST Coach subscription untouched. Amounts remain in cents.