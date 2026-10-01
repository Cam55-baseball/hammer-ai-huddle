# Phone-first spotlight product tour

## Goal
Replace the outdated Demo experience with a guided tour that teaches the owner-approved product story using real interface elements. Report Card content remains excluded while its release gate is off.

## Proposed story for owner approval
1. **Your athlete home** — orient the user to today’s priorities.
2. **Tell Hammer** — show how athlete context changes guidance.
3. **Upload and analyze** — explain choosing the correct analysis and receiving coaching.
4. **Detailed analysis** — show plain fault language, key findings, and the next action.
5. **Prescription** — connect a diagnosed fault to an immediately usable drill.
6. **Today’s plan** — show how analysis and readiness become daily work.
7. **Progress over time** — show history, completed work, and the next check-in.
8. **Support and sharing** — explain parent, coach, and recruiting protections only where relevant.

The owner will approve or revise this order and intent before final tour copy is written.

## Experience
- The existing Demo button starts or reopens the walkthrough.
- The active element stays sharp while the surrounding screen dims and genuinely blurs.
- Coach marks provide Back, Next, Skip, and progress, with phone-first placement and edge-aware flipping.
- Targets scroll into view before illumination; geometry follows resize, page scroll, and nested scroll containers.
- Missing or inaccessible targets are skipped without showing an empty spotlight.
- Completed and skipped states are remembered so the tour never reappears uninvited.
- Reduced-motion users receive fades rather than gliding movement.

## Technical approach
- Build a reusable full-screen overlay using `backdrop-filter` and an inline SVG `mask-image`/`-webkit-mask-image` with a rounded target cutout.
- Observe the target with `ResizeObserver`; subscribe to relevant scroll containers and viewport changes; batch geometry updates with `requestAnimationFrame`.
- Animate spotlight bounds and coach marks with Framer Motion.
- Define stable tour target attributes on existing UI rather than brittle CSS selectors.
- Keep tour progress separate from athlete outcomes and existing analysis data.
- Exclude inaccessible subscription features and all gated Report Card targets.

## Verification
- Test initial launch, Next, Back, Skip, completion, remembered state, and manual reopening.
- Test missing targets, nested scrolling, viewport resize, and reduced motion.
- Verify in a real phone viewport and capture a screenshot showing the sharp cutout and blurred backdrop.
- Confirm the existing app build and focused tour tests pass.

## Boundaries
- No publishing, deployment, or redeployment.
- No changes to `ios/`, `capacitor.config.ts`, analysis generation paths, measurement doctrine, or Report Card release status.
