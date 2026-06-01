/**
 * Presentation-resilience shim — re-exports the canonical relational demo
 * seed so production code (the fixture fallback hook) and tests share one
 * source of truth. No parallel state, no new doctrine; the underlying builder
 * still routes every event through the canonical Zod schemas.
 */
export {
  buildDemoSeed,
  DEMO_ATHLETE_ID,
  DEMO_COACH_ID,
  DEMO_PARENT_ID,
  DEMO_RECRUITER_ID,
  DEMO_EPOCH_MS,
} from "./__tests__/_seed";
