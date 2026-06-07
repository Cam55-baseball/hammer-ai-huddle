# Hammers Modality — Launch Status

## Current verdict: **NO-GO** (athlete-experience grounds)

**Sole remaining launch blocker: RFL-053** — `/dashboard` vs `/command` athlete-home duality.

Post-login default routes returning athletes to `/dashboard`, where the canonical Hammer surfaces (`HammerOnboardingChat`, `HammerDailyPlan`, `HammerChat`) are not mounted. The entire P0-3 differentiation work, athlete-context spine activation, and minor-supremacy enforcement are invisible to any athlete who does not deep-link to `/command`. Architecture is sound; the surface that delivers it is bypassed.

## What is closed

- **P0 launch blockers** (RFL-032/033/034) — CLOSED (`docs/asb/p0-launch-blocker-remediation-ratification.md`).
- **P0 athlete-context workstream** (RFL-023/025/026/027/028/029/030/031) — CLOSED.
- **Coach Hammer runtime ratification** — CLOSED.
- **Architectural verdict** — GO WITH LIMITATIONS (unchanged).

## What this audit produced

`docs/asb/athlete-experience-retention-audit.md` — hostile audit of onboarding, daily use, progression, retention, navigation, trust, delight. 15 new RFLs opened (RFL-044…RFL-058). Zero code changes.

## Fix-before-launch

- **RFL-053 (P0)** — make post-login default `/command`; demote `/dashboard` to module-discovery/marketing only, or merge canonical Hammer surfaces into `/dashboard`. Small surface change; nullifies the largest experience-side launch risk.

## Defer-to-V2 (disclosed launch debt)

- Carried hostile-audit P1s: RFL-035, RFL-036, RFL-037, RFL-038, RFL-039, RFL-040, RFL-041, RFL-042, RFL-043.
- New experience P1s: RFL-044, RFL-045, RFL-046, RFL-048, RFL-049, RFL-052, RFL-055, RFL-056.
- All P2s: RFL-047, RFL-050, RFL-051, RFL-054, RFL-057, RFL-058.
- D90 / career-arc surfaces remain gated by post-mastery-expansion-roadmap (RR-7 sealed, implementation deferred).

## Expected post-fix verdict

**GO WITH LIMITATIONS** — with the P1/P2 list above carried as disclosed launch debt.
