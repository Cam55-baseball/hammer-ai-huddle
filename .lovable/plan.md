## Phase 0.10 — §17 BP + BH Schema Generation Pass

Generate the complete §17 per-category schema fill for V1 (Baseball Pitching + Baseball Hitting) entirely from ratified doctrine. No new doctrine, no new questionnaires, no new phases.

### Scope (per CDR-15, §0.26, §0.27)

**Baseball Pitching — 11 categories** (per §4 + §0.27 B2):
1. Eyes On Target (`visual_stability`) — Pass/Fail gate
2. Hip/Shoulder Separation (`separation`) — Rank 1
3. Energy Angle (`energy_angle`) — Rank 1
4. Tempo (`tempo`) — Rank 2
5. Stride Length (`stride.length`) — Rank 2
6. Stride Consistency (`stride.variance`) — Rank 2 *(separate category per §0.27 B2b)*
7. Posture (composite: `head_stability` + `hip_alignment`) — Rank 2 *(composite per §0.27 B2a)*
8. Front Side Control (`front_side`) — Rank 2
9. Head Direction (`head_alignment`) — Developmental
10. Shoulder Plane (`shoulder_level`) — Developmental
11. Rear Foot Drag (`rear_foot_drag`) — Developmental

**Baseball Hitting — 4 phases** (per §5):
1. Hip Load / Pelvic Coil (P1) — Non-Negotiable
2. Hand Load (P2) — Rank 1
3. Stride & Landing (P3) — Rank 1
4. Hitter's Move (P4) — Non-Negotiable

Total: **15 schemas**, each filled across all 18 §17 fields.

### Doctrine Binding Map (cited on every schema)

| §17 Field | Ratified Source |
|---|---|
| Engine binding | §4 / §5 tables; `pieV2Signals.ts` / `hittingPhases.ts` (read-only) |
| Display format | CDR-1=D (band default + numeric reveal), §14, §0.27 C1 weights |
| Hierarchy rank | §0.27 C1 (BP), §5 + C2 (BH), §0.27 C3 age-neutral |
| Weight | §0.27 C1 ratified weights (BP); BH = NN gate / Rank 1 derived |
| What is it / Why it matters / If poor ×4 / How to improve | §0.6 Universal Category Explanation Law + §15 blocks 1–4 |
| Drill IDs | §7 + §16 F (deterministic, ordered, seeded from `common_deficiencies` / `failureSymptoms`) — emit `<pending tagging — visible missingness>` per §3 Law 7 |
| Video IDs | §8 + §16 G taxonomy — `<pending tagging>` slots |
| Roadmap step | §9 + §16 H (deficiency-bound, deterministic, next-step only) |
| Good/Bad clip | §8 + §15 block 8 |
| Coach Hammer voice | §10 + §16 I (athlete · parent · coach envelope; RR-5/RR-6 bound) |
| Confidence rule | CDR-5=D / CDR-6=C / CDR-7=D / CDR-8=D (visible confidence, missingness preserved) |
| Missingness rule | §3 Law 7 + CDR-8=D (visible missingness, never silent) |
| Lineage | §0.5 pillar binding + ASB Megaphase doctrine (replay-visible, lineage-complete) |

`<pending tagging>` slots for Drill IDs / Video IDs / Roadmap step / Good-Bad clips are **constitutionally valid** under §3 Law 7 — they are visible missingness, not blockers; human tagging is a post-ratification operational task, not a constitutional one.

### File Edits

**1. `docs/asb/report-card-constitution.md` → v0.12**
- Append **§0.28 — Phase 0.10 §17 Schema Generation Pass (2026-06-09)** with header, doctrine citation block, and a single "Validation Report" subsection (no unresolved fields, no placeholder values requiring owner decision, no new owner questions).
- Append **§4.1 — Filled BP §17 Schemas** containing all 11 filled schema blocks (using the §17 code-block template).
- Append **§5.1 — Filled BH §17 Schemas** containing all 4 filled schema blocks.
- Update **§17** with a Phase 0.10 stamp noting V1 schemas now filled in §4.1 / §5.1; §6 Throwing fill remains deferred per CDR-15.
- Update **§18 exit criteria** condition (3) to: *"BP+BH §17 schemas drafted (§4.1 / §5.1); SATISFIED pending owner ratification."*
- Update footer to `v0.12 — §0 RATIFIED — §16 FULLY CLOSED (V1) — §17 V1 DRAFTED, AWAITING OWNER RATIFICATION`.

**2. `docs/asb/reality-feedback-ledger.md`**
- Append **RFL-091** logging Phase 0.10 execution: 15 schemas generated, 0 unresolved fields, 0 owner decisions required, sole remaining action = owner ratification, version pin v0.12.

**3. `.lovable/plan.md`**
- Mark Phase 0.9 closed.
- Mark Phase 0.10 executed (draft delivered).
- Open **Phase 0.11 — Owner Ratification of §17 V1 Draft** as the single next action (owner-only; no AI work pending).

### Constraints

- No code edits anywhere outside the three docs above.
- No new CDRs, audits, questionnaires, ambiguity reviews, or doctrine.
- Every schema field traces to a ratified §0 / §0.27 / CDR / §3–§15 source — no invented values.
- `<pending tagging>` is the only allowed unfilled value, and only where §3 Law 7 explicitly authorizes it.

### Output Sections Delivered in the Response

- **A.** Generated §17 schemas (15 total) — written into §4.1 / §5.1.
- **B.** Validation report (§0.28) — 0 unresolved, 0 placeholders, 0 owner decisions.
- **C.** Ratification readiness — §17 V1 complete; sole remaining blocker is owner ratification of the draft (§18 condition 3 + RFL-091 sign-off).
