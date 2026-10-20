# Prescription rules
- Warm-up ORDER comes only from `warmupStages.ts` (stage → order-within-stage → builder order, applied after choosing); it never adds/removes movements, and hard rules (tissue prep first, max intent after build-ups) override Vault stage tags. Why: owner 2026-10-11 — choose the old way, order cold to ready.
- Practice load is projected from exact logged category/sport/date with unknown minutes/intensity preserved; schedules never stand in for actual work. Why: category isolation and honest workload require source records, not estimates.
