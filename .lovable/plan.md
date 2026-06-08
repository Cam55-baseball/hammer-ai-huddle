
# Phase 0.4 — Owner Decision Form

No new audits, discovery, synthesis, or governance. This plan presents the six §0.21 closure bundles in final ratifiable form. After your single response, the AI will (in build mode) update §0.18/§0.21 with ratified selections, close CDR items, append RFL-085, and recompute remaining ratification blockers.

---

## Bundle 1 — Scoring Spine
**Decision:** Define the meaning and shape of pillar scores (CDR-1, CDR-2, CDR-3, CDR-4).

**Options:**
- **CDR-1 Score Frame:** A) % of elite reference  B) % of athlete ceiling  C) Movement-quality band  D) Hybrid band + numeric sub-value
- **CDR-2 Absolute vs. Relative:** A) Fully absolute  B) Fully athlete-relative  C) Hybrid with declared line
- **CDR-3 P3 schema:** A) Combined pass/fail  B) Two independent scores  C) Single score + expansion
- **CDR-4 P4 schema:** A) Aggregated holistic  B) Four independent elements  C) Single score + expansion

**Recommended Default:** CDR-1=D, CDR-2=C, CDR-3=C, CDR-4=C

**Consequences:**
- *Implementation:* Fixes Report Card data model (band enum + numeric sub-value), Analysis Engine output schema, and pillar payload contract for P3/P4 (headline score + expansion sub-fields). Binds Roadmap and Correction Engine input shape.
- *Coaching:* Coach Hammer reads a single headline per pillar with drill-down on P3/P4; the "declared line" tells coaches when a number is absolute vs. athlete-relative.
- *Athlete experience:* Athlete sees a band first, a number second, with progressive expansion on P3/P4 — no raw stat dump.

---

## Bundle 2 — Progress Signal
**Decision:** Define what counts as progress and when to celebrate (CDR-5, CDR-6, CDR-7, CDR-8).

**Options:**
- **CDR-5 Pillar threshold:** A) Any positive delta  B) Threshold delta N  C) Band crossing only  D) Combination
- **CDR-6 Improvement signal:** A) Per-session  B) Rolling deltas  C) Both (rolling headline + session expansion)
- **CDR-7 Time horizon:** A) Per-session  B) Rolling N  C) Since roadmap start  D) Athlete-selectable
- **CDR-8 Celebration triggers:** A) Pillar climb  B) Pillar + Band  C) Pillar + Band + Roadmap  D) Combination + First-time

**Recommended Default:** CDR-5=D, CDR-6=C, CDR-7=D, CDR-8=D

**Consequences:**
- *Implementation:* Roadmap engine must compute rolling + session deltas, band-crossing events, and first-time-category flags; Report Card emits celebration events into the closed loop.
- *Coaching:* Coach Hammer can cite both session moves and rolling trend; reduces false-positive praise on noise.
- *Athlete experience:* Athlete controls time horizon; celebrations feel earned (band crossings, roadmap hits, firsts) rather than per-session sugar.

---

## Bundle 3 — Athlete Surface Grammar
**Decision:** Define how the athlete-facing card renders tone, conflict, color, and disclosure (CDR-9, CDR-10, CDR-11, CDR-13).

**Options:**
- **CDR-9 Conflict-mode rendering:** A) Hide score  B) De-emphasize  C) "Progressing" overlay  D) Unchanged + context copy
- **CDR-10 ENCOURAGED enforcement:** A) Tone-only  B) Tone + Visual  C) Tone + Visual + Structural
- **CDR-11 Palette:** A) Red/failure allowed  B) Neutral/Positive only  C) Conditional (red reserved for Safeguarding/Injury)
- **CDR-13 Disclosure:** A) Always-expanded  B) Always-collapsed  C) Progressive disclosure

**Recommended Default:** CDR-9=C, CDR-10=C, CDR-11=C, CDR-13=C

**Consequences:**
- *Implementation:* Locks the design system tokens (palette, state overlays), the card component variants, and the disclosure primitive used across Report Card, Parent, and Recruiter surfaces.
- *Coaching:* Coach Hammer's tone enforcement is backed by structural UI guarantees, not just copy.
- *Athlete experience:* No red shame-states outside safety contexts; conflict states read as "progressing"; athlete pulls detail rather than being drowned in it.

---

## Bundle 4 — Priority & Scope
**Decision:** Define what "highest-priority pillar" means and which disciplines ship in V1 (CDR-12, CDR-15).

**Options:**
- **CDR-12 Highest-priority definition:** A) Lowest score  B) Highest leverage  C) Coach-defined rank  D) Furthest-from-roadmap  E) Hybrid (§0.7 ordering first)
- **CDR-15 V1 discipline scope (Y/N each):** Baseball Pitching, Baseball Hitting, Softball Pitching, Softball Hitting, Throwing, Catching, Defense, Baserunning

**Recommended Default:** CDR-12=E; CDR-15=Y for Baseball Pitching, Baseball Hitting, Throwing; N for the rest in V1.

**Consequences:**
- *Implementation:* Defines the Correction Engine's selection function and the V1 build surface area (schemas, drills, roadmap templates only for in-scope disciplines).
- *Coaching:* Priority is deterministic and auditable; Coach Hammer cannot drift into preference-based ranking.
- *Athlete experience:* Athletes in out-of-scope disciplines see an explicit "coming soon" state instead of a half-built card.

---

## Bundle 5 — Variance
**Decision:** Handle softball slap-hitting variance (CDR-14).

**Options:** A) Full alternate card  B) P4-modifier on standard card  C) Defer to post-V1

**Recommended Default:** C (Defer), consistent with CDR-15 default.

**Consequences:**
- *Implementation:* No slap-hitting schema branch in V1; reserved namespace only.
- *Coaching:* Coach Hammer flags slap-hitting athletes as out-of-scope rather than scoring them on a mismatched rubric.
- *Athlete experience:* Slap hitters see an explicit deferral state, not a distorted score.

---

## Bundle 6 — Process
**Decision:** Define interview cadence and RFL granularity going forward (CDR-16, CDR-17).

**Options:**
- **CDR-16 Cadence:** A) Auto-advance  B) Explicit owner approval per wave
- **CDR-17 RFL granularity:** A) Per-wave entry  B) Single entry at ratification

**Recommended Default:** CDR-16=B, CDR-17=A

**Consequences:**
- *Implementation:* Governs how Phase 1+ is conducted; no code impact.
- *Coaching:* N/A.
- *Athlete experience:* N/A.

---

## Owner Response Template

Reply with exactly:

```
Bundle 1: CDR-1=?, CDR-2=?, CDR-3=?, CDR-4=?
Bundle 2: CDR-5=?, CDR-6=?, CDR-7=?, CDR-8=?
Bundle 3: CDR-9=?, CDR-10=?, CDR-11=?, CDR-13=?
Bundle 4: CDR-12=?, CDR-15=[BP:Y/N, BH:Y/N, SP:Y/N, SH:Y/N, TH:Y/N, CA:Y/N, DE:Y/N, BR:Y/N]
Bundle 5: CDR-14=?
Bundle 6: CDR-16=?, CDR-17=?
```

You may also reply `DEFAULTS` to ratify all Recommended Defaults verbatim.

---

## Post-Submission Actions (executed in build mode after your response)
1. Update `docs/asb/report-card-constitution.md` → §0.18 mark each CDR `RATIFIED` with selected option; §0.21 mark bundles closed; bump to v0.6.
2. Update CDR status table; close D1, D4, D5 if all items resolved.
3. Append `RFL-085` documenting ratified decisions and version bump.
4. Recalculate remaining ratification blockers in §0.12 and §0.14; if zero Class-C items remain open, flip §0 gate to `READY-FOR-RATIFICATION` pending owner's explicit ratification statement.
5. No code, schema, or implementation changes. Implementation remains constitutionally blocked.
