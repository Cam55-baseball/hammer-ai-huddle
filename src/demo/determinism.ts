// Public determinism layer for demo simulations. Re-exports the core seeded
// PRNG and adds a per-user salt so the same user always sees the same numbers.
export { seedFromString, rng, between } from './sims/simEngine';
import { seedFromString } from './sims/simEngine';

/** Stable integer hash. Mirrors `seedFromString` for callers that want a hash directly. */
export function stableHash(input: string): number {
  return seedFromString(input);
}

/** Build a seed scoped to (sim, user). `null` user → 'anon' bucket. */
export function userScopedSeed(simId: string, userId: string | null | undefined): number {
  return seedFromString(`${simId}:${userId ?? 'anon'}`);
}
