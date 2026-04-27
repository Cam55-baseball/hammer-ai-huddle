// Phase 10.5 — Local persistence for owner-created builds.
// Uses safeStorage to survive disabled localStorage / quota errors / SSR.
// No backend, no DB. Drop-in replaceable for Phase 11 (Supabase).

import { safeGet, safeSet } from './safeStorage';

export type BuildItem = {
  id: string;
  type: 'program' | 'bundle' | 'consultation';
  name: string;
  meta: Record<string, any>;
  createdAt: number;
};

const KEY = 'owner_builds';

export function getBuilds(): BuildItem[] {
  try {
    const raw = safeGet(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBuild(item: BuildItem): void {
  try {
    const existing = getBuilds();
    existing.unshift(item);
    safeSet(KEY, JSON.stringify(existing));
  } catch {
    /* noop */
  }
}

export function updateBuild(id: string, patch: Partial<Pick<BuildItem, 'name' | 'meta'>>): BuildItem | null {
  try {
    const existing = getBuilds();
    const idx = existing.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    const current = existing[idx];
    const next: BuildItem = {
      ...current,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      meta: patch.meta ? { ...current.meta, ...patch.meta } : current.meta,
    };
    existing[idx] = next;
    safeSet(KEY, JSON.stringify(existing));
    return next;
  } catch {
    return null;
  }
}
