# Hammers Today cards

- Today card grouping is a presentation-only partition preserving original drill objects and completion keys; popup details use a shared context. Why: grouping must not author training or duplicate logging.
- Hammers Today 'Next up', day ring and stage story come only from `todayRhythm.tsx`, fed by progress the cards already compute. Why: the visual rhythm must never author, reorder or change training.
- Release presentation uses local midnight only; pre-build state never supplies athlete-facing times. Why: preparation time is not delivery time.
- Activity pop-ups host each exercise’s entry grid and its timers via one shared log portal; exercise disclosures retain outcomes, surveys and specialized extra logging without duplicating entry state or timers in parent panels. Why: logs remain visible while information stays closed and per-exercise saving stays canonical.
