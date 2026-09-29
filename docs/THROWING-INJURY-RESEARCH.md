# Throwing card — injury-prevention markers (research basis)

as_of: 2026-09-29 · code: `src/lib/biomech/metrics/throwingInjuryTiles.ts` · status: **UNVALIDATED — no throwing clip yet**

Superseded 2026-09-29 by `docs/THROWING-DOCTRINE.md` (flags reworked to the owner's eight-marker spec). Kept for history.

Owner reframe: the throwing card is an arm-care card. Every marker is shown as "mechanics research links to higher arm load", never as a diagnosis or prediction.

**Caveat on transfer:** almost all of this research is on *pitchers* on a mound. Fleisig et al. 2011 (JOSPT 41(5)) found flat-ground max-distance throws produce arm torques at least as high as pitching, so field throws are not low-load by default — but the specific markers have not been studied in fielders. No pitching number is carried across as a threshold.

| Marker | Finding | Source | Evidence | Camera | Built |
|---|---|---|---|---|---|
| Arm late at foot strike | "Arm in throwing position at foot contact" is one of 5 parameters; youth doing ≥3 correctly had lower elbow valgus load and shoulder IR torque (n=169, ages 9–18) | Davis et al. 2009, AJSM 37(8) | moderate (one large study, youth; parameters judged as a set) | side-on (throwing arm must be on the camera side) | graded: hand above elbow at plant; within floor → no call |
| Early trunk rotation | Trunk rotation before front-foot contact → higher elbow valgus torque (n=69 adults) | Aguinaldo & Chambers 2009, AJSM | moderate | on-line | existing `shoulder_opening` (reframed) |
| Elbow height vs shoulder | Shoulder abduction away from ~90–100° increases elbow varus torque | Matsuo et al. 2002 (simulation); ASMI review (Fleisig) | limited | either (vertical) | ungraded observation — no published video threshold |
| Throwing across the body | Stride foot pointing at target is one of Davis's 5 parameters | Davis 2009; ASMI review | limited | two views (ground-plane angle) | refuses (needs paired clips) |
| Front knee keeps bending | Lead-knee extension relates to velocity; injury link indirect | ASMI review | weak | side-on | ungraded observation |
| Trunk lateral tilt at release | Excessive contralateral tilt (throwing-side head > 1 head width past stride-ankle vertical, frontal video) → greater elbow proximal force; also more speed (n=72 HS). Lateral lean ↑ elbow varus and shoulder moments | Oyama et al. 2014, AJSM; Solomito et al. 2015, AJSM 43(5) | moderate | on-line/frontal | graded with Oyama's video criterion (at release, not max external rotation — flagged); on-line branch unvalidated |
| Arm outside body frame | Horizontal abduction as anterior-shoulder load — expert commentary | ASMI review; Calabrese 2013 (level 5) | weak | on-line/overhead | refuses (not built) |
| Deceleration | Large shoulder distraction forces during deceleration | Fleisig et al. 1995, AJSM | weak as a video marker | side-on | ungraded observation + "see a qualified professional" note |

Also relevant: McCutcheon, Slowik & Fleisig 2025 (OJSM, elite adults) and Tanaka et al. 2020 (OJSM, stride-phase predictors of varus torque) — both pitching, lab-measured; no phone-video thresholds.

## Noise floors (still clip 15d75bc9, p2–p98)
- hand-over-elbow: R arm 0.13, **L arm 0.54 forearm lengths** — the far arm side-on is noisy; only clear cases get a call.
- elbow vs shoulder: 0.02 / 0.04 torso lengths
- front knee angle: 5.4°
- head offset: **0.43 head widths against Oyama's 1-head-width criterion** — clear cases only.

## Tempo and stride (owner rulings)
- Tempo: peak leg lift → front-foot strike, unchanged. Throwing uses a lower lift floor (0.07 body heights = 1.5× the still-clip ankle range; hitting/pitching keep 0.10). Not yet seen on a real field-throw lift.
- Stride: starts at the final step (rear foot planted at peak lift), same % of height target as pitching. Note: ASMI's adult pitcher mean is ~83% of height; the owner's ≥90% sits above it.

## Presentation rules
No diagnosis, no prediction, sources named in the athlete text, evidence strength stated, no numbers.
