# Dependency Map

```text
src/hooks/useFoundationVideos.ts
   ├── foundationVideos.ts          (parser + scorer + trigger derivation)
   ├── foundationStateMachine.ts    (deriveTargetState, reconcileFoundationState, cooldown)
   ├── foundationFatigue.ts         (loadFatigueState, applyFatigue)
   ├── foundationOnboarding.ts      (kill switches, rollout, cold-start gate)
   ├── foundationTracing.ts         (insert traces — fire-and-forget)
   └── @/integrations/supabase/client

src/lib/foundationReplay.ts
   └── foundationVideos.ts          (re-run scorer against frozen trace + meta)

src/pages/owner/FoundationTraceInspector.tsx
   ├── foundationReplay.ts
   └── supabase client

src/pages/owner/FoundationDiagnosticsPanel.tsx
   └── supabase client (queries traces, outcomes, health)

supabase/functions/
   ├── recompute-foundation-effectiveness/  (writes library_videos.foundation_effectiveness)
   ├── nightly-foundation-health/           (writes library_videos.foundation_health_*)
   ├── hourly-trigger-decay/                (decays foundation_trigger_events.confidence)
   └── daily-trace-prune/                   (RPC cleanup_old_foundation_traces)
```

No edge function imports from `src/`. No `src/` module imports edge function code. The boundary is JSON over the `library_videos` / event tables.
