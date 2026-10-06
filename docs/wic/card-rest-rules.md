# Hammers Today — card types and their rest / frequency rules

Owner ruling 2026-10-06: every rule holds, every day, for every player, on the plan itself.
"Suggested" rules are NOT applied. They wait for the owner's approval.

| Card | Rule today (in the code) | Suggested rule (owner to approve) |
|---|---|---|
| **Lift** | In-season and post-season: 2 full rest days between lift days. Off-season: 3 full rest days after a heavy lift (or moderate followed by heavy), 2 otherwise. In-season: at most 2 lift days per Monday–Sunday week. No lift on doubleheader or tournament days. Game day: lift only after the game. Starting pitchers: no lift on their start day, primer only the day before. After 14+ days off, lifts are capped at moderate for 14–28 days. Missed or skipped lifts keep their place (never made up). Recovery-only days (arm care / mobility) are not lift days. | — |
| **Throwing / pitching** | Pitch Smart rest days by pitch count (baseball youth and HS+ tables; softball bands), plus a weekly pitch cap. A required rest day blocks prescribed pitching and high-intent throwing. | — |
| **Conditioning** | Nothing hard within 48 hours of a game. At most 2 movements, at most 1 sprint. Pitcher day after a start gets recovery-type work. Rest or a dialed-down check-in makes it lighter. **In force (owner approved 2026-10-06):** at least 1 full day between hard running days — hard base-running conditioning (e.g. Repeat 90 ft, 1st → 3rd; everything except the easy recovery flush) and max-speed sprints count together. No hard running the day before a game. | — |
| **Speed / sprints (runs)** | **In force (owner approved 2026-10-06):** max-speed sprints (acceleration, top speed, resisted, change of direction; not sub-max drills) share the hard-running rule above: at least 1 full day between hard running days, none the day before a game. | — |
| **Plyometrics / jumps (power)** | Eccentric-overload jumps never in-season or post-season, never on game days. Upper-body plyo progresses only after pain-free weeks. **In force (owner approved 2026-10-06):** at least 1 full day between high-intensity jump days (lower-body jumps at plyo tier 2+ or high/maximal intensity). | — |
| **Bat speed** | **In force (owner approved 2026-10-06):** no overload or underload bat work on back-to-back days. | — |
| **Warm-up** | Daily by design; no rule. | None needed. |
| **Arm care** | Daily by design; no rule. | None needed. |
| **Mobility / recovery** | Daily by design; no rule. | None needed. |
| **Athletic movement (cross-sport)** | No rule. | **Declined by the owner 2026-10-06:** "Not on a lift day's lower-body work" — not applied. |
| **Nutrition, Mental** | Daily; no rule. | None needed. |

**Age rules (all cards):** app minimum age 13. Each movement's minimum age is enforced. Under 18 uses growth mode. Eccentric-overload movements are lifted to 16+/advanced.

**Final check before saving and whenever a saved plan is shown:** lift spacing, weekly limit, rest-day removal, minimum age, eccentric overload in season, season legality, hard-running spacing and day-before-game, jump spacing, and bat over/underload on back-to-back days. Planned days count whether done or not; nothing is ever made up. Any failing card is removed (the day's recovery cards remain) and logged in `wk_final_check_swaps`. Spacing and weekly limits follow the `rest_day_calculator` switch. Age and season rules always apply.
