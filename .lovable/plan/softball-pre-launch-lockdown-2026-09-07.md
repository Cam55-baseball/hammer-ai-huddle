# Softball Pre-Launch Lockdown

Goal: ship with a softball experience that is small but honest. Anything unfinished, thin, or scored against baseball numbers gets locked to owner/admin only. Softball stays selectable and the polished core stays open.

Decisions taken: lock only the weak pieces; locked features show a coming-soon screen; softball grades that use baseball benchmarks hide the grade and keep the raw number.

---

## Findings (verified, with counts)

### A. Content that is far thinner than baseball
| Area | Baseball | Softball | Verdict |
| --- | --- | --- | --- |
| Drill library (`drills`) | 168 | 14 | Lock — a 14-drill library reads as broken |
| Scouting/grading anchors (`scale_reference`) | 14 rows | 0 rows | Hide grades, keep raw numbers |
| Org standards (`org_standards`) | 1 | 0 | Lock softball standards surfaces |
| Pitch types | 22 lines | 15 lines | Acceptable — keep open |
| Competition levels / summer leagues | fuller | thinner | Acceptable — keep open |

Healthy, keep open: base-running lessons (7/7 + 27 shared), base-running scenarios (56/56 + 120), IQ scenarios (35 softball + 104 shared), defensive alignments (19/19), Mind Fuel (251 shared), nutrition tips (559 shared), video tagging (34 softball + 153 shared), roadmap milestones (7/7), grade benchmarks and performance-test registry (parity in code).

### B. Baseball-only engines that silently run for softball athletes
1. **PIE v2 pitching engine** — its drill and video catalogs exist only under `data/baseball/`. Softball pitchers get baseball recommendations for a windmill delivery.
2. **Tex Vision** — every hook defaults to `sport = 'baseball'`; no softball drill selection or adaptive difficulty path.
3. **Throwing velocity grade**, **catcher exchange grade**, **home-to-first grade**, **beaten-runner defense grade**, **base-running split grades** — all anchored to baseball-only rows. A softball athlete is graded against the wrong sport.
4. **Pickoff Trainer** and **Base Stealing Trainer** — baseball lead/pickoff rules; softball has its own `/softball-stealing` trainer, so the baseball pair should not show for softball users.

### C. Softball-specific surfaces that are partial
5. **Softball Stealing Trainer** — functional; keep open.
6. **Pitcher style tag** (riseball/dropball/speed/spin) — only appears at elite data density; leave as is.
7. **Softball pitching arm care** — windmill handling exists in the arm-care library; keep open.

---

## What gets built

### 1. One lock, one list
- `src/lib/softball/lockedFeatures.ts` — single registry of locked feature keys and their labels. Every gate reads from it, so unlocking later is a one-line change per feature.
- `src/pages/SoftballComingSoon.tsx` — same look and tone as the existing Game IQ coming-soon screen, naming the feature.
- `src/components/softball/SoftballLock.tsx` — wraps a route: owner/admin pass through; softball users get the coming-soon screen; baseball users pass through untouched. Waits for the role checks so nothing flashes.

### 2. Routes wrapped (softball users only)
Drill library / player drill library, PIE v2 pitching surfaces, Tex Vision, Pickoff Trainer, Base Stealing Trainer, recruiting standards and org-standards surfaces.

### 3. Menu
`AppSidebar` hides locked entries when the selected sport is softball and the user is not owner/admin. Direct links still land on the coming-soon screen.

### 4. Grades without softball anchors
In the five grading modules, when sport is softball: return the measurement with no letter grade, no tier, no elite badge, and a short line — "Softball benchmarks are still being built; your raw time is saved." Cards render the number and skip the grade block. Logging, history, and progress are unaffected.

### 5. Report
`docs/softball/prelaunch-lock-report.md` — the findings table above, every locked feature with its reason, and what has to exist before each one unlocks.

---

## Technical notes
- Gating reuses `useOwnerAccess` + `useAdminAccess` (the `StaffOnlyRoute` / `GameIqLock` pattern already in the codebase); no new role plumbing, no database changes.
- Sport comes from `SportThemeContext`, the same source the sidebar already uses.
- No engine, dose, or prescription logic is touched. Grade suppression is a display-level early return keyed on sport.
- Baseball behaviour is unchanged everywhere; a baseball user should see zero difference.

## Verification
- As a softball non-staff user: each locked route shows the coming-soon screen and is absent from the menu.
- As owner: every locked route opens normally.
- As a baseball user: nothing changed — spot-check drill library, Tex Vision, Pickoff Trainer, and one graded entry surface.
- A softball throwing-velocity and home-to-first entry shows the raw number and no grade.
