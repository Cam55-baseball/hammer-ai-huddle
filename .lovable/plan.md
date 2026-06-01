# Finish Presentation Finalization Pass

Remaining work from the prior pass. No new architecture, no new primitives, no schema changes.

## 1. Route registration
Edit `src/App.tsx`:
- Register `/relational/demo` → `RelationalDemo` (lazy import already added).

## 2. Presentation runbook
Create `docs/asb/relational-presentation-runbook.md`:
- Final screen order and 10–12 min timing per `RelationalDemo.tsx` sequence.
- Per-step talking points (calm, observant, protection-first tone).
- Fallback recovery: `/relational?fallback=fixture` if live seed fails.
- Fragility points (live DB latency, projection cold-start, Hammer citation gaps).
- Pre-demo checklist (seed idempotency run, viewport 440px verified, replay proof panel collapsed by default).
- Highest-impact talking points and final blockers.

## 3. Presentation mode lock doc
Create `docs/asb/presentation-mode-lock.md`:
- Freeze: architecture, relational primitives, doctrine, major surfaces.
- Allowed: bug fixes, copy refinement, perf, visual polish, presentation resilience.
- References Phases 152–154 sealed; 155–160 remain frozen; RR-4…RR-10 reserved.

## 4. Memory update
Update `mem://index.md` Core:
- Add one-liner: "Presentation mode locked — only bug fixes, copy, perf, polish, resilience allowed until presentation completes."
- Add Memories entry pointing to `presentation-mode-lock.md` rule file at `mem://constraints/presentation-mode-lock`.
- Create `mem://constraints/presentation-mode-lock` constraint memory file.

## Files
- Edit: `src/App.tsx`, `mem://index.md`
- Create: `docs/asb/relational-presentation-runbook.md`, `docs/asb/presentation-mode-lock.md`, `mem://constraints/presentation-mode-lock`
