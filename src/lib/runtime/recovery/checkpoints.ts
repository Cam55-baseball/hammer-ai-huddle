/**
 * Wave 2 — Deterministic projection checkpoints.
 *
 * Keyed by (athleteId, lastEventId, engineVersion). Stored in IndexedDB.
 * Invalidated never mutated — engine_version mismatch drops the checkpoint
 * and forces a fresh replay rather than migrating in place.
 */
import { ENGINE_VERSION } from "@/lib/asb/engineVersion";

export interface ProjectionCheckpoint<T = unknown> {
  key: string;
  athleteId: string;
  lastEventId: string;
  engineVersion: string;
  inputsHash: string;
  projection: T;
  createdAt: number;
}

const DB_NAME = "asb_runtime_checkpoints";
const STORE = "checkpoints";
const VERSION = 1;

function isBrowser(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function checkpointKey(
  athleteId: string,
  lastEventId: string,
  engineVersion: string = ENGINE_VERSION,
): string {
  return `${engineVersion}::${athleteId}::${lastEventId}`;
}

export async function saveCheckpoint<T>(cp: ProjectionCheckpoint<T>): Promise<void> {
  if (!isBrowser()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    t.objectStore(STORE).put(cp);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function loadCheckpoint<T>(
  key: string,
): Promise<ProjectionCheckpoint<T> | null> {
  if (!isBrowser()) return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, "readonly");
    const req = t.objectStore(STORE).get(key);
    req.onsuccess = () => {
      const cp = req.result as ProjectionCheckpoint<T> | undefined;
      // Invalidate on engine version mismatch — never migrate in place.
      if (!cp || cp.engineVersion !== ENGINE_VERSION) {
        resolve(null);
      } else {
        resolve(cp);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function invalidateCheckpoint(key: string): Promise<void> {
  if (!isBrowser()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    t.objectStore(STORE).delete(key);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
