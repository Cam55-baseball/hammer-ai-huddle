# Recommendation Lifecycle

```text
Athlete opens VideoLibrary / Hammer surface
        │
        ▼
useFoundationVideos(userId, opts)
        │
        ├─► readFoundationKillSwitches()   ← engine_settings
        │     • foundations_enabled?              → if false, return []
        │     • userInRollout(uid, rolloutPct)?   → if false, return []
        │
        ├─► buildFoundationSnapshot(userId)
        │     • accountAgeDays, domainRepCount, bqi/pei deltas,
        │       layoffDays, regulationLow3d, primaryDomains, …
        │
        ├─► computeFoundationTriggers(snapshot)   → activeTriggers[]
        │
        ├─► recordAndFilterTriggerCooldown()      ← foundation_trigger_events
        │     filters out triggers still in cooldown window
        │
        ├─► reconcileFoundationState()            ← athlete_foundation_state
        │     deriveTargetState + applyDwellGuard (anti-flap)
        │
        ├─► fetch candidate library_videos where video_class='foundation'
        │     parseFoundationMeta on each row; skip nulls
        │
        ├─► scoreFoundationCandidates()
        │     base + audience + length + effectiveness − watchedPenalty
        │     × tierMultiplier; per-domain cap
        │
        ├─► loadFatigueState() → applyFatigue()   ← foundation_recommendation_traces
        │     exposure / domain quota / semantic dedupe / philosophy cap
        │
        ├─► computeOnboardingGate() → applyOnboardingGate()
        │     cold-start (≤30d) limits to beginner-safe + 1/week
        │
        ├─► insert traces (kept + suppressed)     → foundation_recommendation_traces
        │
        ▼
return results to UI
```

Failure modes degrade open: if any DB read fails, the layer returns "neutral" data so deterministic scoring still ships a result. Only the kill switch can block entirely.
