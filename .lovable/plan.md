# Activity pop-up pages: logs first

## Replacement layout
This replaces Round 2 C and the earlier collapsed-log layout without changing prescribed work or saved data.

1. Make every activity, including cross-sport and remaining inline cards, a clean tile with full title, dose summary and status.
2. Keep the full-title, Start and X header visible before and after Start, with phone safe-area spacing.
3. Put an always-open **Log this work** section first, containing every exercise’s named entry grid. Match today’s prescription exactly; do not inherit a different row count from an old log. Keep current per-exercise saving and drafts.
4. Keep only timers, exact-dose entry boxes and the information note in the top log. Put Done / Skipped / Cut short and existing per-exercise effort/survey fields inside each closed exercise drop-down. Existing session-level effort/survey fields appear once in a closed “Finish this workout” drop-down. Preserve automatic Done for all logged sets and Cut short for some sets, without changing saved-data rules. Keep extra exercise-specific logging below.
5. Put sprint/conditioning stopwatches and lift/hold rest timers beside their entries. Sprint rest is one minute per ten yards. Use prescribed lift/hold rest when available; otherwise offer a manual timer without inventing a dose.
6. Follow the log with “More information for each exercise is below ↓”, then an EXERCISES list. Each name starts closed and opens independently to show dose, one-rep basics and details, with cue/why/changes once.

## Proof and readiness
- Add exact-value tests for 3 × 5 lifts, 4 × 90 ft repeats, holds, jumps, throws, recovery minutes and sprint rest conversion.
- Extend the double-check with rendered-entry comparisons against prescribed sets/reps/distance/time and units. Run eight-week matrices across roles, sports, age bands and seasons; report actual coverage and mismatches.
- Capture all nine requested pop-up types closed/open at 360/390/393 px; tap every available exercise disclosure and applicable Finish this workout disclosure, checking the corrected field placement.
- Run the full suite and affected-player page audit. Real-plan proof still requires affected-player access; physical native proof requires the installed build. Emulation will be labeled honestly.
- Record results, uncertain how-to owner checks and **Ready to publish: yes/no** at the top of roadmap.md.
- No publishing, cron, iOS, migrations or saved-data changes; clean up only task-created test data.

## Technical approach
Separate log and information rendering through the shared pop-up presentation layer. Reuse current saving handlers, surveys, timers, prescription checker and activity guides rather than mount duplicate logs. Keep generator authority unchanged. Record the shared presentation structure in AGENTS.md.
