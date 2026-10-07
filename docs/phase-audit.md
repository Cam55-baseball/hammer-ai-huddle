# Phase audit (2026-10-07)
Season phase — one calculator: src/lib/seasonPhase.ts = supabase/functions/_shared/seasonPhase.ts → _shared/wkPhaseQuarter.ts (Q1–Q4 names). Readers: wk-generate-daily, finalCheck, goals/goalDose, pap/powerPrimer, tissueCost (phaseFrom delegates), ai-chat, suggest-meals, hie-analyze, compute-hammer-state, generate/adapt-training-block, suggest-adaptation, adaptive-phases-shadow, generate-vault-recap (fixed: was own copy).
App: useSeasonStatus (fixed: defaulted in-season), useCanonicalPhaseDisplay (plan's saved phase wins), seasonDisplay.ts labels, SeasonCounter (The General), HammerDailyPlan warm-up label, AdaptivePhaseStrip, WeeklyRoadmapStrip, HammerScheduleStrip, WkLiftsCard, WkSpeedCard, useWkDailyPrescriptions, trainingContext.ts.
Database: athlete_mpi_settings.season_status + 6 date columns + season_status_manual; wk prescriptions store phase per card; adaptive_phase_shadow / _credit.
Lighter week: lift/trendDeload.ts + HT deload (builder only). Growth mode: tissueCost config, finalCheck, pap, ubPlyo. Ramp-up: timeline/blockContent, adaptive-phases-shadow.
Still to unify: lighter week, growth, ramp-up into the one resolver output.
