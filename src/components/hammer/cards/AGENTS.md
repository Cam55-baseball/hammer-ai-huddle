# Hammers Today cards
- Run rest uses `_shared/wic/runRest.ts`; PAP keeps lift-to-action rest separate from after-sprint rest, and conditioning counters accept declared base-route reps only, sharing session state through `ConditioningRestProvider` across log portals. Why: changing exercise pop-ups must not reset bases or rest, change lifting or grant new running work.

- Today card grouping is a presentation-only partition preserving original drill objects and completion keys; popup details use a shared context. Why: grouping must not author training or duplicate logging.
- Hammers Today 'Next up', day ring and stage story come only from `todayRhythm.tsx`, fed by progress the cards already compute. Why: the visual rhythm must never author, reorder or change training.
- Release presentation supplies no athlete-facing availability countdown or midnight promise. Why: the owner removed release-time wording; preparation time is not delivery time.
- Activity pop-ups host each exercise’s entry grid and its timers via one shared log portal; exercise disclosures retain outcomes, surveys and specialized extra logging without duplicating entry state or timers in parent panels. Why: logs remain visible while information stays closed and per-exercise saving stays canonical.
- Power-primer round recording and rest timers use the same pop-up log host, while its warm-up lock and safety controls remain in its disclosure. Why: relocating controls must not create new lift sets, bypass safety or change record-only saving.
- Input-confirmation plan cards remain visible separately from prescribedToday; reminders, counts and completion still require ready drill work. Why: an equipment gate must be actionable without becoming a training prescription.
