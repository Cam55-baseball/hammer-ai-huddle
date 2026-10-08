# Hammers Today cards

- Today card grouping is a presentation-only partition preserving original drill objects and completion keys; popup details use a shared context. Why: grouping must not author training or duplicate logging.
- Hammers Today 'Next up', day ring and stage story come only from `todayRhythm.tsx`, fed by progress the cards already compute. Why: the visual rhythm must never author, reorder or change training.
- The 'Tomorrow's plan opens in' countdown shows only when tomorrow's wk_prescriptions row exists; otherwise it shows the being-built estimate (`releaseState`). Why: never count down to a moment with no plan behind it.
