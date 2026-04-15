

# Upgrade Coaching Report Intelligence Layer — Deep Reasoning Enforcement

## Summary
Upgrade the AI prompt, tool schema, TypeScript types, and display UI to enforce deep causal reasoning, cross-section linking, decision quality metrics, and anti-generic filtering. No structural changes — same 7 sections, but with richer data and stricter generation rules.

## Changes

### 1. `src/lib/coachingReportTypes.ts` — Expand `RootCause` interface

Add three new fields to `RootCause`:
```typescript
export interface RootCause {
  issue: string;
  classification: 'perception' | 'decision' | 'execution' | 'consistency';
  mechanism: string;   // precise biomechanical/cognitive failure
  trigger: string;     // when/under what condition
  failureChain: string; // step-by-step breakdown
  evidence: string;
}
```

### 2. `supabase/functions/session-insights/index.ts` — Major prompt + schema upgrade

**Tool schema (`coachingReportTool`):**
- Add `mechanism`, `trigger`, `failure_chain` as required fields in `rootCauseAnalysis` items

**System prompt (`buildSystemPrompt`)** — Add these enforcement blocks:

- **Root Cause Depth Rules**: mechanism must describe a precise failure (not a symptom), trigger must specify the condition, failure_chain must show the read→decision→movement sequence
- **Causal Linking Mandate**: The `issue` string must be identical across rootCauseAnalysis, priorityStack, prescriptiveFixes, and gameTransfer. No new issues may appear in later sections. No rewording.
- **Prescriptive Fix Constraint Quality**: Drill must target the mechanism (not symptom). Constraint must remove the athlete's ability to compensate. Cue must be 3-6 words tied to the mechanism. Invalid examples: "focus on timing", "work on reaction". Valid: "commit before ball contact", "one-step only before throw"
- **Decision Quality Emphasis**: If decision-making data exists (chase_pct, decision index, hesitation patterns), it MUST appear in performanceBreakdown and rootCauseAnalysis. Evaluate decision speed vs optimal window, correct vs safe decisions, hesitation patterns.
- **Anti-Generic Filter**: Before finalizing, reject any sentence that (a) could apply to any athlete, (b) does not include a condition (when/where), (c) does not change next-session behavior
- **Output Self-Check**: Internally verify: Are all issues situation-specific? Does each fix map to a root cause mechanism? Would a top 1% coach actually say this? If not, regenerate.

**Model upgrade**: Switch from `google/gemini-2.5-flash` to `google/gemini-2.5-pro` for deeper reasoning capability.

### 3. `src/components/practice/CoachingReportDisplay.tsx` — Render new fields

Update the Root Cause Analysis section to display `mechanism`, `trigger`, and `failureChain`:

```text
[Badge: classification] Issue title
Mechanism: "first step delayed due to late hip read"
Trigger: "on glove-side ground balls under <0.8s reaction window"  
Chain: "late visual pickup → delayed weight shift → arm-side compensation"
Evidence: ...
```

Each rendered as a labeled line with muted styling beneath the issue title.

### 4. Cache invalidation note
Existing cached reports in `session_insights` will not have the new fields. The display component will render `mechanism`/`trigger`/`failureChain` only when present (optional chaining), so old reports degrade gracefully. New sessions get the upgraded output.

## Files modified

| File | Changes |
|------|--------|
| `src/lib/coachingReportTypes.ts` | Add `mechanism`, `trigger`, `failureChain` to `RootCause` |
| `supabase/functions/session-insights/index.ts` | Expand tool schema, upgrade system prompt with 6 enforcement blocks, switch to gemini-2.5-pro |
| `src/components/practice/CoachingReportDisplay.tsx` | Render mechanism/trigger/failureChain in root cause cards |

