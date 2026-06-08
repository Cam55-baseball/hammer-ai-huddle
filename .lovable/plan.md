## Phase 0.5 — False Ambiguity Audit

**Authority:** Constitutional review only. No implementation. No new audits after this. Output is a single packet update bumping `report-card-constitution.md` to **v0.7 (DRAFT — UNRATIFIED)**.

**Mandate:** Re-test every CDR item against already-ratified doctrine. Close any CDR resolvable by existing constitutional sources. Reduce owner workload to the smallest irreducible set.

---

### 1. Doctrine sources consulted

| Source | File | What it constitutionalizes |
|---|---|---|
| Pillar architecture | `docs/asb/uhrc-pillar-mapping-audit.md` | PIE V2 → 4 pillar weights; HIE P1/P2/P3/P4 → `stuff` / `mechanics`; composite weights = 100 (PASS) |
| Analysis formula | `docs/asb/analysis-formula-ratification.md` | Ratified scoring math; lineage-bound; replay-safe |
| Hammer Today guidance | `docs/asb/hammer-today-guidance-architecture.md` §2 Slot 3 | "Exactly one Next-Action per Today render" — single-priority hero is already doctrine |
| Hammer activation | `docs/asb/hammer-activation-architecture.md` | "One well-timed handoff > scattered nudges" (Megaphase 111–150) |
| V1 launch scope | `docs/asb/baseball-public-launch-ratification.md` §1–§7, `baseball-launch-reratification.md` | Baseball Pitching + Hitting = LIVE; minors = fail-closed hidden; Softball = P1-E "defer or sprint"; Throwing/Catching/Defense/Baserunning = absent from launch ratification |
| Report Card itself | `docs/asb/report-card-constitution.md` §0.6, §0.7, §3 Law 1, §3 Law 10, §0.1 | 9 explanation blocks per category; lineage one click away; additive only; consistency-of-grammar |

---

### 2. False-Ambiguity Audit Table (focus CDRs)

| CDR | Current Status | Resolution Source | Owner Input Required? |
|---|---|---|---|
| **CDR-3** (P3 sub-criteria) | **FALSE AMBIGUITY** | §3 Law 1 ("lineage one click away") + §0.6 (9 explanation blocks include "Why" + "How to improve") + §0.1 (consistency) → Option **C** is the only constitutionally legal render. A collapses lineage (violates Law 1); B duplicates §17 rows without grammar justification (violates §0.1 vs CDR-4). | **N** — auto-resolve to C |
| **CDR-4** (P4 sub-criteria) | **FALSE AMBIGUITY** | Identical doctrine chain as CDR-3 + §0.1 symmetry requirement explicitly cited in current §0.18 (CDR-4 Recommended Default rationale: "forced by symmetry with CDR-3"). | **N** — auto-resolve to C (forced by CDR-3) |
| **CDR-12** (highest-priority hero) | **PARTIAL FALSE AMBIGUITY** | `hammer-today-guidance-architecture.md` §2 Slot 3 already constitutionalizes "exactly one next action"; §0.7 already ratifies P1-first non-negotiable ordering for hitting; §0.4 hero is priority-1 by §0.7 cascade. Option **E (Hybrid, §0.7 first)** is the only option that does not contradict already-ratified Hammer Today doctrine. A/B/C/D each invent a competing ranking authority that Hammer Today does not recognize. | **N** — auto-resolve to E |
| **CDR-14** (Softball Slap variance) | **FALSE AMBIGUITY** | `baseball-public-launch-ratification.md` P1-E classifies softball parity (including Slap) as "**defer or run softball sprint**". Until softball sprint is authorized, Slap has no surface to render on. Option **C (Defer)** is the only option consistent with current launch doctrine. | **N** — auto-resolve to C (defer) |
| **CDR-15** (V1 discipline scope) | **MOSTLY FALSE AMBIGUITY** | `baseball-public-launch-ratification.md` ratifies Baseball Pitching + Baseball Hitting as the live launch scope. Softball = P1-E (deferred per CDR-14). Throwing / Catching / Defense / Baserunning are **absent from every launch ratification document** — i.e., not in V1 by silence. Doctrine resolves all 8 toggles: BP=Y, BH=Y, SP=N, SH=N, TH=N, CA=N, DE=N, BR=N. | **N** — auto-resolve from launch doctrine |

---

### 3. Audit of remaining 12 CDR items (Bundles 2, 3, 6 + CDR-1, CDR-2)

| CDR | Status | Notes |
|---|---|---|
| CDR-1 (score frame) | **TRUE** | No doctrine fixes choice among % elite / % ceiling / band / hybrid. Drives §17 schema. |
| CDR-2 (absolute vs relative) | **TRUE** | Owner philosophical choice; depends on CDR-1. |
| CDR-5 (pillar threshold) | **TRUE** | Numeric threshold not in any doctrine. |
| CDR-6 (improvement signal) | **TRUE** | Per-session vs rolling not in any doctrine. |
| CDR-7 (time horizon) | **TRUE** | Athlete-selectable vs fixed not in doctrine. |
| CDR-8 (celebration triggers) | **TRUE** | Trigger set not in doctrine. |
| CDR-9 (conflict-mode render) | **TRUE** | Render grammar undecided. |
| CDR-10 (ENCOURAGED enforcement) | **TRUE** | Tone/visual/structural scope undecided. |
| CDR-11 (palette permissions) | **PARTIAL** | RR-6 injury doctrine already reserves red for safeguarding; option **C** is doctrine-aligned. Borderline false ambiguity — but render permission across non-RR-6 surfaces still owner choice. Keep as TRUE for safety. |
| CDR-13 (disclosure pattern) | **TRUE** | Progressive vs always-expanded not in doctrine. |
| CDR-16 (interview cadence) | **TRUE** | Process choice — no doctrine. |
| CDR-17 (RFL granularity) | **TRUE** | Process choice — no doctrine. |

**Bundle 2, 3, 6 remain owner-facing as previously scoped.** Bundles 4 and 5 fully collapse.

---

### 4. Collapse arithmetic

```text
Original CDR count                      17
False-ambiguity closures (auto-resolve)  5  (CDR-3, CDR-4, CDR-12, CDR-14, CDR-15)
Remaining TRUE owner decisions          12
```

Twelve is still > 5. Bundle reorganization required:

- **Bundle 1 (Scoring Spine):** collapses from CDR-1/2/3/4 → **CDR-1 + CDR-2 only** (CDR-3/4 auto-resolved by §3 Law 1 + §0.1). Becomes a 2-item bundle.
- **Bundle 4 (Priority & Scope):** **DISSOLVED.** Both CDR-12 and CDR-15 auto-resolved.
- **Bundle 5 (Variance):** **DISSOLVED.** CDR-14 auto-resolved.
- **Bundle 2 (Progress Signal):** unchanged — CDR-5/6/7/8 (4 items).
- **Bundle 3 (Athlete Surface Grammar):** unchanged — CDR-9/10/11/13 (4 items).
- **Bundle 6 (Process):** unchanged — CDR-16/17 (2 items).

**Revised total:** 6 bundles → **4 bundles**. 17 owner decisions → **12 true decisions**.

---

### 5. Further compression attempt (toward ≤5)

True decisions still cluster into **4 irreducible doctrinal axes**:

| Axis | True CDRs absorbed | One-question form |
|---|---|---|
| **A. Scoring spine meaning** | CDR-1 + CDR-2 | "What does a number on the card mean — elite-relative, ceiling-relative, banded, or hybrid; absolute or athlete-relative?" |
| **B. Progress signal definition** | CDR-5 + CDR-6 + CDR-7 + CDR-8 | "When and how does the card declare 'you improved'?" |
| **C. Surface grammar** | CDR-9 + CDR-10 + CDR-11 + CDR-13 | "How does the athlete surface render under conflict, ENCOURAGED tone, palette limits, and disclosure depth?" |
| **D. Process** | CDR-16 + CDR-17 | "Auto-advance or wait; per-wave or single RFL entry?" |

→ Owner can ratify in **4 axis-level answers** rather than 12 atomic ones. ≤5 target met.

---

### 6. Plan execution (in build mode)

Three files only:

1. **`docs/asb/report-card-constitution.md` → v0.7**
   - Add **§0.22 — False Ambiguity Audit (Phase 0.5)** containing: audit table, doctrine citations, collapse arithmetic, axis-level compression.
   - Mark CDR-3, CDR-4, CDR-12, CDR-14, CDR-15 as **CLOSED — AUTO-RESOLVED** in §0.18 with citation to the resolving doctrine; preserve the original entries for lineage (§3 Law 10 additive-only).
   - Update §0.21 closure recommendation: 6 bundles → **4 bundles**, 2 owner responses → **1 owner response across 4 axes**.
   - Append **§0.23 — Owner Decision Form (Axis-Level)** with 4 axis questions and recommended defaults inherited from Phase 0.4 packet.
   - Recompute ratification blockers: 12 true atomic decisions presentable as 4 axis answers.

2. **`docs/asb/reality-feedback-ledger.md`**
   - Append **RFL-086** documenting: 5 CDRs auto-closed by false-ambiguity audit; bundle count 6→4; owner response count 2→1; cite each resolving doctrine.

3. **`.lovable/plan.md`**
   - Record Phase 0.5 outcome and the 4-axis owner form.

**No code, schema, or implementation work.** Implementation remains constitutionally blocked pending the single owner response across 4 axes.

---

### 7. Final Owner Decision Form (preview — to be ratified post-approval)

```text
Axis A — Scoring Spine (CDR-1 + CDR-2):
  CDR-1: [A | B | C | D=recommended]
  CDR-2: [A | B=recommended | C]

Axis B — Progress Signal (CDR-5 + CDR-6 + CDR-7 + CDR-8):
  CDR-5: [A | B | C | D=recommended]
  CDR-6: [A | B | C=recommended]
  CDR-7: [A | B | C | D=recommended]
  CDR-8: [A | B | C | D=recommended]

Axis C — Surface Grammar (CDR-9 + CDR-10 + CDR-11 + CDR-13):
  CDR-9:  [A | B | C=recommended | D]
  CDR-10: [A | B | C=recommended]
  CDR-11: [A | B | C=recommended]
  CDR-13: [A | B | C=recommended]

Axis D — Process (CDR-16 + CDR-17):
  CDR-16: [A | B=recommended]
  CDR-17: [A=recommended | B]

Or reply DEFAULTS to accept all recommended defaults.
```

Auto-resolved (no owner input): CDR-3=C, CDR-4=C, CDR-12=E, CDR-14=C, CDR-15={BP:Y, BH:Y, SP:N, SH:N, TH:N, CA:N, DE:N, BR:N}.
