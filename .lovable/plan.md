## Phase 48 — Actual Athlete-Facing Release Inventory

**Single deliverable:** `.lovable/phase-48-actual-athlete-facing-release-inventory.md` (evidence-only product audit, no code changes).

### Investigation approach (read-only, before writing the doc)

1. Trace every athlete-facing mount point from routes:
   - `src/pages/AthleteCommand.tsx` (canonical Command Center)
   - `src/pages/AnalyzeVideo.tsx` (post-upload analysis surface)
   - `src/pages/VideoLibrary.tsx`, `AthleteDigest.tsx`, `ProgressDashboard` (trend surfaces)
2. Walk the report-card render tree: `UhrcAthleteSection` → `UhrcReportCard` → pillar contributions in `src/lib/uhrc/buildReport.ts`; `BhCategoryPanels` (confirmed suppressed via `RELEASE1_HITTING_SUPPRESSED`); BP tile specs in `src/lib/reportCard/disciplines/bp.ts`.
3. Cross-reference each visible tile against `RELEASE1_VISIBLE_METRICS` / `RELEASE1_HIDDEN_METRICS` / `RELEASE1_SHOWCASE_FUTURE` in `src/lib/reportCard/release1.ts`.
4. Identify data sources per tile: deterministic engine vs `videos.ai_analysis` (LLM) vs static catalog vs HIE/PIE snapshot.
5. Enumerate coaching/recommendation surfaces: `HammerDailyPlan`, `HammerChat`, `HammerOnboardingChat`, lineage drilldowns, biggest_leak/biggest_win text.
6. Enumerate trend surfaces: `useReportCardTrend`, `usePitchingV2Trends`, HIE snapshot.
7. Inventory empty-state / missingness renders: `EmptyStateExplainer`, missing-signal copy in `UhrcReportCard`, sport-unsupported card, suppressed BH panel.

All findings sourced from repo + prior Phase 46/47 DB evidence (0 `video_metric_runs`, 0 `video_landmark_runs`, only LLM `ai_analysis.metrics` populated). No new queries needed unless a gap appears during walkthrough.

### Document structure (§1–§10 as specified)

- **§1 Athlete Visible Inventory** — table of every visible tile with columns: visible / hidden / suppressed / placeholder / driven-by-measurement / driven-by-AI / driven-by-static. Pillar tiles, BP tiles, UHRC composite, biggest_leak/win, missingness footer, drill-down button, "work on this in today's plan" CTA.
- **§2 Report Card Reality** — concrete render walkthrough for a freshly uploaded pitching video: which `UhrcReportCard` elements actually populate vs render "—" vs render missingness chip. Hitting branch confirmed unmounted.
- **§3 Coaching Reality** — `HammerDailyPlan` items, `HammerChat` responses, `HammerOnboardingChat` prompts; classify each as LLM-generated narrative, static catalog (drill catalog, schedule rules), or measurement-derived.
- **§4 Recommendation Reality** — sources: PIE V2 drill catalog, static drill/benefit constants, LLM coaching text, ageCurves/velocityBands. None are tied to deterministic per-video measurement.
- **§5 Trend Reality** — `useReportCardTrend` reads `videos.ai_analysis` (LLM only); `usePitchingV2Trends` reads PIE V2 aggregates; HIE snapshot fields. Note that all per-video trend points are LLM-derived.
- **§6 Empty-State Audit** — list every surface that today renders empty/missing/placeholder: all 6 Release-1 tiles render "—" + missingness chip (since `video_metric_runs` empty and Release-1 trust lock suppresses LLM-only values); BH panel fully unmounted; non-baseball sports show waiting-on-projector card.
- **§7 Public Release Candidate** — feature set defensible today without false measurement claims: organism readiness/fatigue grid, daily plan (catalog-driven), HammerChat (clearly conversational), onboarding, recent activity, video upload + storage + LLM narrative coaching *if framed as opinion not measurement*. Report-card composite cannot be honestly shipped because pillar scores compute from inputs that are largely missing.
- **§8 Trust Audit** — risks: composite pillar scores rendered as integers despite contributions being mostly missing; biggest_leak/biggest_win text reads like measured findings but originates from LLM/PIE aggregates; trend chart implies measurement continuity; engine_version badge implies deterministic engine.
- **§9 Release Classification** — based purely on athlete-visible reality: **NOT READY for public release**, **READY for limited beta only if** report card and trend surfaces are gated off or explicitly labeled as preview/non-measured.
- **§10 Final Determination** — one paragraph: what Hammers can honestly claim to athletes today (video upload + storage, conversational coaching framed as opinion, static daily plan, organism readiness from self-reported HIE inputs) and what it cannot claim (any per-video biomechanical measurement, any measured trend, any measurement-derived report card grade).

### Constraints honored
- No new code, no fixes, no roadmap, no architecture changes.
- Only evidence already in repo + prior phase findings.
- Single file output.