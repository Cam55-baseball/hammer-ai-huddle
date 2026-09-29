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

4. "For throwing the arm will move with fascial selection from the user. I do not like that elbow height at landing metric as it may turn our throwers robotic. We need fluid throwers." `[owner-supplied 2026-09-29]`
   → Elbow height at landing is **removed, not hidden**. Arm slot and elbow height belong to the thrower's structure. **Do not re-add it or any arm-slot/elbow-position flag.**
5. "Yes, sidearm throws must be allowed in. There should be a good way to help them." `[owner-supplied 2026-09-29]`
   → The overhand gate (wrist above shoulder at release) is removed. Swings are now kept out by a slot-free check: hands must be ≥ 1.5 throwing-forearm lengths apart at release (both swing fixtures read 0.62–0.63). The sidearm "caution" flag is removed — a slot is never a fault or a warning. How to serve sidearm throwers is a proposal awaiting the owner.
6. **STANDING RULE, WHOLE PROJECT:** "Let's choose elite things and not knit pick and drive users into unathletic form" `[owner-supplied 2026-09-29]`
   → A flag or tile earns its place only if (a) the injury/performance evidence is strong, not suggestive; (b) it is a genuine mechanical fault, not structure or style; (c) fixing it makes the athlete more athletic, not more mechanical; (d) it can be called clearly without guessing at edge cases.

## Arm-care flags (after the elite filter)

| Flag | Evidence | Camera | Status |
|---|---|---|---|
| Shoulders turn before the front foot lands | moderate–strong (Aguinaldo & Chambers 2009; Fleisig/ASMI); owner's own doctrine | side-on | built (reuses shoulder-opening fusion) |
| Arm drags behind the body at landing | limited (Takagi; Aguinaldo) — kept as a genuine fault | behind/overhead only | refuses until a behind-view throwing clip exists |
| Front foot lands across the body / turned in | limited (PMC8720247; Davis 2009) — a fault, not structure | behind/in front only | refuses until a behind-view throwing clip exists |

**Cut, with reasons — do not re-add without a new owner ruling:**
- Elbow height at landing — owner ruling 4 (structure, makes throwers robotic).
- Sidearm arm slot — owner ruling 5 (a slot is not a fault).
- Elbow bend at landing — fails (b) and (d): varies with structure and slot; far-arm jitter 26° side-on means only extreme cases could ever be called.
- Front knee at landing/release — fails (a) and (d): injury link indirect (speed link only); jitter 5.4° exceeds half the 45–55° band.
- Upper-body lean away from the arm — fails (a)–(c): Oyama 2014 also links it to more ball speed, so it is partly a performance strategy; jitter ~half the one-head-width criterion; frontal-only.

Only one flag is measurable from a side-on camera. That is the honest result.

## Mechanics checks
- Tempo — all three patterns (ruling 1). Ungraded until a throwing tempo standard exists.
- Stride from the final step — ≥ 90 % of height (ruling 2).
- Energy angle — sideways shuffle only; crow hop / walk-through refuse (pattern classifier).
- Head through the throw — reused head-movement measurement.
- **Lift & Thrust — left out.** No crow-hop version specified by the owner.
- Softball = same code, softball wording (`throwingCopy.ts`). Terminology says throwing, never pitching.

## Validation state
Still clip and both swing clips refuse every flag (swings now via the hands-apart check) and check with `throwing_delivery_not_confirmed` (swing clips) or pose/anchor reasons (still). Not yet connected to live analysis or the server bundle — needs owner go-ahead to wire and deploy.

## 2026-09-29 owner decisions
- Sidearm pitchers allowed ("We have to allow"): pitching now uses the same slot-free hands-apart gate as throwing (`gates/releaseHandsApart.ts`, one implementation).
- Sidearm proposal approved ("Good"): arm slot is staff-only context (`metrics/armSlot.ts`, blind to trunk lateral tilt); a low slot moves shoulders-wait-for-landing and front-foot-in-line to the top and swaps in low-slot cues (`reportCard/slotEmphasis.ts`). Never "get on top" or "raise your elbow" (test-enforced).
