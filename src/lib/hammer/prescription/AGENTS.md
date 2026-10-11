# Prescription rules
- Warm-up ORDER comes only from `warmupStages.ts` (stage → order-within-stage → builder order, applied after choosing); it never adds/removes movements, and hard rules (tissue prep first, max intent after build-ups) override Vault stage tags. Why: owner 2026-10-11 — choose the old way, order cold to ready.
