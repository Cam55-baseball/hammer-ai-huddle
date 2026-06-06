
# Coach Hammer Production Reality Validation

This sprint is **measurement-only**. No features, no architecture, no doctrine. It interrogates runtime telemetry (`asb_events`, `asb_event_lineage`, `asb_topic_registry`, route/profile state) to determine whether the unified Coach Hammer system is actually being adopted, used, and effective in production — then issues a final workstream verdict.

## Approach

All evidence is sourced from live tables via `supabase--read_query`. No code is changed. Output is a single ratification document plus ledger entries.

### Section A — Adoption Funnel
Query `asb_events` for the 9 funnel stages:
- `hammer.surfaced`, `hammer.viewed`, `onboarding.started`, `onboarding.knowledge_gap_resolved` (terminal = completed), `intelligence.next_step.resolved` (opened), `prescription.daily.opened`, `hammer.chat.message`, `prescription.daily.modality.*` (started), modality completion events.
Compute distinct-user counts per stage → funnel %, stage-to-stage drop-off %, largest abandonment point.

### Section B — Guidance Utilization
For Hammer Now / Plan / Chat surfaces, count distinct athletes and per-athlete event frequency over the live window: viewed → opened → acted (route navigation event lineage) → completed (modality/next-step completion event). Return utilization rates as %.

### Section C — Next Step Effectiveness
Group `intelligence.next_step.resolved` events by `payload->>title` (or topic):
- opened (resolved fired)
- ignored (resolved with no follow-on route nav within session)
- completed (followed by matching modality completion)
- replaced (subsequent resolved with different title same session)
- abandoned (route opened, no completion)
Rank top/bottom 5.

### Section D — Onboarding Effectiveness
From `onboarding.knowledge_gap_resolved` payloads, tally per gap_id: answered, skipped (resolved with skip flag), still-missing (registered gaps minus answered, derived from `profiles` columns). Return acquisition % and remaining blind spots.

### Section E — Daily Plan Modality Utilization
From `prescription.daily.modality.{warmup|speed|strength|hitting|throwing|defense|baserunning|fueling|recovery}` events, count opens & completions per modality. Identify most-used, least-used, never-used.

### Section F — Chat Effectiveness
From `hammer.chat.message` payloads:
- Cluster athlete questions (keyword buckets)
- Count Hammer response categories
- Conversation abandonment (session with athlete msg, no follow-up within N min)
- Repeat questions (same athlete, similar normalized text within 7d)
- Unanswered (response flagged uncertain / empty)
Return largest conversational weakness.

### Section G — Confusion Detection
From route navigation events / `asb_events` topic lineage:
- Surfaces opened ≥3× per athlete per session
- Navigation loops (A→B→A within 60s)
- Repeated next-step replacements
Rank top confusion sources.

### Section H — Reality Scorecard
Compute:
- Adoption %  = onboarding_completed / surfaced
- Utilization % = weekly active hammer users / total active athletes
- Completion % = modality_completed / modality_opened
- Guidance effectiveness % = next_step_completed / next_step_resolved
- Conversation effectiveness % = chat_resolved / chat_started
- Confusion score = confusion events / total sessions (inverted)
- **Overall Hammer Reality Score** = weighted mean (0.25 adoption, 0.20 utilization, 0.15 completion, 0.20 guidance, 0.10 conversation, 0.10 (1 − confusion)).

### Section I — Final Closure
GO / NO-GO + Workstream CLOSED / OPEN, with stated highest-value next concern.

## Constitutional Subordination
Read-only measurement only. Hammer remains interpretive — no `organism_truth`/`athlete_intent`/`authority_override`/`hard_stop` writes. All evidence cites canonical `asb_events` lineage at pinned engine_version + reasoning_version. Safeguarding supersedes any visibility surface. Conforms to RR-1…RR-10, RW-1…RW-10, EI-1…EI-10, all sealed phases.

## Deliverables
- `docs/asb/coach-hammer-production-reality-validation.md` — sections A–I with SQL evidence, counts, percentages, rankings, scorecard, and final verdict.
- `docs/asb/reality-feedback-ledger.md` — append RFL-020 (production reality validation) with outcome.
- `.lovable/plan.md` — append sprint summary.

## Out of Scope
- New features, new topics, new surfaces.
- Doctrine, scoring, governance, recruiting, safeguarding audits.
- Any UI/route changes (even if confusion sources surface — those become roadmap items, not edits).
- Recomputing guidance completeness % (held at 92% from prior ratification).

## Exit Criteria
- All nine sections answered with live-query evidence.
- Hammer Reality Score computed.
- GO/NO-GO and CLOSED/OPEN verdict issued with highest-value next concern named.
