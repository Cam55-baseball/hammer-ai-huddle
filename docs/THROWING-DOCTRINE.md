# Throwing card doctrine (baseball + softball)

as_of: 2026-09-29 · code: `src/lib/biomech/metrics/throwingTiles.ts`, `throwingInjuryTiles.ts` · card: `src/lib/reportCard/disciplines/throwing.ts` · status: **UNVALIDATED — no throwing clip yet**

Supersedes the earlier throwing spec. Earlier research notes: `docs/THROWING-INJURY-RESEARCH.md`.

## Owner rulings

1. "A fielder always has a slight leg lift before throwing whether they shuffle and throw or are crow hopping and throwing or walking through the throw. The top of the leg lift is everything." `[owner-supplied 2026-09-29]`
   → Tempo = peak leg lift → front-foot strike, for shuffle, crow hop and walk-through alike. Throwing lift floor 0.07 body heights (1.5× still-clip ankle range); not yet seen on a real field-throw lift.
2. "You can tell the final step of a throw is the starting point and we still want to aim for the same stride length." `[owner-supplied 2026-09-29]`
   → Stride starts at the final step = last frame at/before peak lift where the rear foot is planted (moved < 2.0 % stature over three frames). Target ≥ 90 % of height, same as pitching. Noise floor 2.8 %.
3. "All in all we want a mechanically sound throw to prevent injury more than anything. We need the injury prevention mechanics to show up and be measured for throwing." `[owner-supplied 2026-09-29]`
   → Injury prevention is the card's primary purpose. Arm-care flags come first, in their own group.

## Presentation (non-negotiable)
- Flags, not diagnoses. Never predict or diagnose an injury; no risk figures.
- Wording: "research on throwing mechanics links … to more stress on the shoulder/elbow".
- Every flag ends: "Worth showing this to your coach or a qualified throwing or medical professional."
- Flags carry **zero grading weight** (`grading_weight: 0`, `verdict: null`); a flag is `raised`, `clear`, or no call inside the noise floor.
- Coach language, no numbers, no citations in athlete text (citations live here).

## Arm-care flags

All angles are 2-D image projections, not true joint angles. Floors: still clip 15d75bc9, p2–p98, worst side (near arm in brackets), measured before any rule.

| # | Flag | Research | Camera | Floor | Rule | Status |
|---|---|---|---|---|---|---|
| 1 | Trunk rotation before foot contact | Aguinaldo & Chambers 2009, AJSM: torso rotation before stride-foot contact → greater elbow valgus torque (p = .02). Fleisig et al. (ASMI): early pelvis/trunk rotation raises shoulder and elbow load | side-on | shoulder fusion (existing) | reuses `premature_shoulder_open_deg` five-signal fusion; fail → raised | built |
| 2 | Shoulder abduction at foot contact | Near 90° at end of stride (Biomechanical Analysis of the Throwing Athlete, Physiopedia); markedly above/below raises elbow stress (Matsuo 2002) | side-on | 6.2° (3.4°) | raised outside 70–110° by more than the floor. **Band is ours — owner to confirm** | built |
| 3 | Elbow flexion at foot contact | Aguinaldo & Chambers 2009: less elbow flexion → more valgus torque (p < .01); > 90° target | side-on, throwing arm on camera side | **26° far arm** (5.1° near) | raised below 90° by more than the floor | built; far arm only calls extreme cases |
| 4 | Horizontal abduction / open shoulder at foot contact | Takagi et al.; open shoulder at foot contact → greater elbow valgus and shoulder IR moments | **not side-on** — arm behind trunk plane lies along camera depth | — | — | refuses side-on; behind/overhead view not built |
| 5 | Stride foot direction + landing offset | PMC8720247 (movement system dysfunction): in line with pivot leg, slightly in; over-rotated foot / across-body landing stresses anterior shoulder and medial elbow | **not side-on** — yaw and lateral offset lie along depth | — | — | refuses side-on; needs behind view |
| 6 | Lead knee flexion (contact + release) | ~45–55° at contact, extending through release; altered knee flexion at release among the most significant injury factors (Chalmers et al.) | side-on | **5.4° — exceeds half the 10° band** | raised outside 45–55° by more than the floor, or still bending by release | built; band edges unresolvable, clear cases only |
| 7 | Contralateral trunk tilt | Systematic review PMC10043103; Oyama 2014 video criterion (> 1 head width); Solomito 2015 | **not side-on** — frontal plane at release | 0.43 head widths | Oyama criterion | built for behind/in-front view only, geometry unvalidated |
| 8 | Arm slot — sidearm caution | PMC8720247: sidearm → medial elbow stress, UCL | **not side-on** — frontal plane at release | 11.9° (4.3°) | caution when > 70° from vertical beyond floor. **Angle is ours — owner to confirm**. Never a fault | built for behind view; the overhand gate refuses a wrist below the shoulder, so a true sidearm is refused upstream |

Honest summary: of the eight, **four are measurable side-on** (1, 2, 3, 6) and two of those have floors that limit calls (3 far arm, 6 band edges). **Four need a behind/in-front camera** (4, 5, 7, 8).

## Mechanics checks
- Tempo — all three patterns (ruling 1). Ungraded until a throwing tempo standard exists.
- Stride from the final step — ≥ 90 % of height (ruling 2).
- Energy angle — sideways shuffle only; crow hop / walk-through refuse (pattern classifier).
- Head through the throw — reused head-movement measurement.
- **Lift & Thrust — left out.** No crow-hop version specified by the owner.
- Softball = same code, softball wording (`throwingCopy.ts`). Terminology says throwing, never pitching.

## Validation state
Still clip and both swing clips refuse every flag and check with `throwing_delivery_not_confirmed` (swing clips) or pose/anchor reasons (still). Not yet connected to live analysis or the server bundle — needs owner go-ahead to wire and deploy.
