// Phase 10.8 — Safe-storage wrapper.
// Survives QuotaExceeded, disabled storage, and SSR. Maintains an in-memory
// mirror so reads stay consistent within a session even when the underlying
// localStorage throws. All methods are infallible.

const memory = new Map<string, string>();

function ls(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function safeGet(key: string): string | null {
  try {
    const store = ls();
    if (store) {
      const v = store.getItem(key);
      if (v !== null) {
        memory.set(key, v);
        return v;
      }
    }
  } catch { /* fall through to memory */ }
  return memory.has(key) ? memory.get(key)! : null;
}

export function safeSet(key: string, value: string): void {
  memory.set(key, value);
  try { ls()?.setItem(key, value); } catch { /* noop */ }
}

export function safeRemove(key: string): void {
  memory.delete(key);
  try { ls()?.removeItem(key); } catch { /* noop */ }
}

export function safeHas(key: string): boolean {
  return safeGet(key) !== null;
}
