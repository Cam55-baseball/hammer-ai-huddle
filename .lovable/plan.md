## Goal

Replace the universal "Hammer Report Card" + "Hitting phase category" in the Command Center with a **per-analysis** Hammer Report Card that lives **inside every video analysis result**. Users land on the Report Card by default, can toggle to the existing detailed Analysis view, and can tap any report-card tile for a deep-dive explainer.

This is purely a delivery-layer change. The existing analysis pipeline keeps measuring everything it measures today — we add a graded, visual report card on top of it and remove the misplaced command-center surfaces.

---

## Architecture decisions (locked from Q&A)

1. **Remove** the universal Hammer Report Card and standalone Hitting Phase category from the Command Center.
2. **Add** a Report Card ↔ Analysis segmented toggle to every analysis result screen. **Report Card is the default view.**
3. Each report-card tile is tappable → opens a bottom sheet explainer.
4. Tile visual language is **identical across all sports/disciplines** — only the metric, value, and standard change. This is the singular "Hammer Report Card" look.
5. **No top-line overall score ring.** Individual tiles + Non-Negotiable PASS/FAIL stamps only.
6. Visible-missingness rule still applies (§3 Law 7) — if a metric can't be measured, the tile shows a clear "Not detected yet" state, never a fake number.

---

## Universal tile component

One tile renders any of four display modes, picked per-metric:

| Mode | Used when | Visual |
| --- | --- | --- |
| **RAW + PASSED X/10** | Quantifiable metric with a numeric standard | `0.98` big number, `✓ PASSED 10/10` chip, footer `1.05s OR LESS` (matches your reference image) |
| **PASS/FAIL badge** | Pure binary check, no useful magnitude | Big `✓ PASS` or `✗ FAIL` badge centered (matches your Torque Retention reference) |
| **RAW + PASS/FAIL combined** | Numeric but also a hard binary gate | `8°` number AND `✓ PASS` badge stacked, footer `15° OR LESS` |
| **1–10 + meter** | Composite quality score | Circular arc meter + big number 0–10 in the ring (matches the 62% reference style, scaled to /10) |

All tiles share: discipline-specific icon (top-left), metric name (top-right), standard footer (small, muted), tap affordance.

**Non-Negotiable tiles** get a small "NON-NEGOTIABLE" pill at the top and, if FAILED, also stamp a red `NON-NEGOTIABLE FAILED` banner at the very top of the report card.

---

## Tap-through explainer sheet

Opens from any tile. Four sections, in this order:
1. **What + Why** — plain-English definition and why this matters in the elite formula
2. **How to improve** — drills, cues, simple actionable work
3. **Trend vs prior sessions** — small sparkline of this athlete's last N submissions for this metric
4. **Keep going** — short encouragement line ("The game is hard. Stay with it — small daily wins compound.")

Each section pulls from a per-metric content store, never AI-generated at runtime.

---

## Baseball Pitching report card — LOCKED

10 tiles. Grouped flat (not by phase). Non-Negotiables marked **★**.

| # | Tile | Mode | Standard |
| --- | --- | --- | --- |
| 1 | Energy Angle | RAW + PASSED X/10 | 25° target, 18° OR MORE |
| 2 | _(Eyes on Target removed from report card; stays in detailed Analysis)_ | — | — |
| 3 ★ | Hip/Shoulder Separation | Composite: PASS/FAIL + RAW degrees + 1–10 meter (3 stacked elements in one tile) | No shoulder open before landing |
| 4 | Tempo | RAW + PASSED X/10 | 1.05s OR LESS |
| 5 | Stride Length | RAW % + PASSED X/10, PLUS a 1–10 meter for length-and-consistency combined | 90% OR MORE of height |
| 6 ★ | Head Stability (Posture) | RAW % + PASSED X/10 | 2% OR LESS vertical movement |
| 7 | Glove / Front Side Control | PASS/FAIL + RAW (inches outside frame) + PASSED X/10 | Stays inside shoulder frame |
| 8 | Head at Release | RAW degrees + PASS/FAIL badge | 15° OR LESS |
| 9 | Shoulder Tilt at Release | RAW degrees + PASS/FAIL badge | 10° OR LESS |
| 10 | Lift & Thrust | RAW degrees + PASS/FAIL badge | 18° OR MORE |

---

## Baseball Hitting report card — LOCKED (lean v1)

Grouped under the **4 existing §5.1 phases** (Hip Load, Hand Load, Stride, Hitter's Move) as section headers. Tiles confirmed:

| Phase | Tile | Mode | Standard |
| --- | --- | --- | --- |
| Stride | **Stride Direction** | PURE PASS/FAIL | Within 15° of square (not stepping in the bucket / not cutting across) |
| Hitter's Move | **Bat Path In/Out of Zone** | 1–10 meter | Enters behind ball, exits in front |
| Hitter's Move | **Back Elbow at Contact** | RAW degrees + PASSED X/10 | Past belly button, shoulders square to pitcher |
| Hitter's Move | **Sequencing** | PASS/FAIL | Load legs → Load hands → Pause → Stride → Pause → Contact |

Additional Hip Load / Hand Load tiles will be added in a follow-up pass — v1 ships with these 4 to validate the end-to-end loop.

---

## Throwing report card (BB + SB, identical) — DERIVED from BP

Per your throwing notes, reuses these BP tiles with throwing-specific copy:
- Eyes on Target → kept in Analysis view (excluded from card, same as BP)
- Hip/Shoulder Separation ★ (composite mode)
- Stride Length (RAW % + PASSED X/10 + 1–10 meter)
- Head Stability ★ (RAW % + PASSED X/10)
- Glove / Front Side Control (composite mode)
- Head at Release (RAW + PASS/FAIL)
- Shoulder Tilt at Release (RAW + PASS/FAIL)

(No Energy Angle / Lift & Thrust / Tempo — those are pitching-from-windup-specific.)

---

## Softball Pitching report card — DERIVED from BP

Same 10 tiles as BP, same modes, same non-negotiables. Windmill-specific delta tiles (arm circle, brush, IR snap) **left as open follow-up** to layer on without disturbing the locked base.

## Softball Hitting report card — IDENTICAL to BH

Same 4 v1 tiles, same phase grouping.

---

## Implementation sequence

1. **Demolition.** Remove the Hammer Report Card surface and the "Hitting phase category" from the Command Center page.
2. **Universal `<ReportCardTile />`** component supporting all 4 display modes + tap handler.
3. **Universal `<ReportCard />`** shell: Non-Negotiable banner (conditional), tile grid, optional phase section headers.
4. **`<TileExplainerSheet />`** bottom sheet with the 4 sections (What+Why / Improve / Trend / Encouragement).
5. **`<AnalysisToggle />`** segmented control at top of every analysis result page: `[Report Card]` (default) `[Analysis]`.
6. **Metric content stores** per discipline (`reportCard/bp.ts`, `reportCard/bh.ts`, `reportCard/bbThrowing.ts`, `reportCard/sbThrowing.ts`, `reportCard/sbHitting.ts`, `reportCard/sbPitching.ts`). Each entry: `key`, `name`, `icon`, `mode`, `standard`, `nonNegotiable`, `phase?`, `explainer { whatWhy, howToImprove, encouragement }`, and a `compute(analysisResult)` function that maps existing analysis output → tile state.
7. **Wire BP first**, then BH, then the other 4 (which all derive from BP/BH stores).
8. **Visible missingness** state on any tile whose `compute()` returns null.

---

## Out of scope for this phase
- Top-line overall score ring (explicitly excluded).
- Softball pitching windmill-specific tiles (deferred).
- Adding Hip Load / Hand Load tiles to BH (v1.1 follow-up).
- Any change to the underlying analysis pipeline or measurement code — the report card consumes existing analysis output only.

## Remaining open follow-ups (won't block this plan)
- Specific Hip Load and Hand Load tiles for BH.
- Windmill-specific tiles for SB Pitching.
- Exact copy for each explainer sheet (drafted from your notes, reviewed before shipping).
