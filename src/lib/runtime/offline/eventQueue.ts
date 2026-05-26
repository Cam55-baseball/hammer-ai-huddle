/**
 * Wave 2 — Offline event outbox.
 *
 * Append-only IndexedDB queue. emitRuntimeEvent enqueues here when the
 * network is unavailable; the reconciler drains in order on reconnect.
 *
 * Append-only: entries are never edited in place. Only removed after the
 * server confirms acceptance (or a permanent reject, which surfaces an
 * operational event rather than silent drop).
 */

export interface QueuedEvent {
  /** Client-generated UUID, also used as the server event_id for dedupe. */
  id: string;
  topic: string;
  athleteId: string;
  payload: Record<string, unknown>;
  actorRole: string;
  actorId: string | null;
  causalityRefs?: string[];
  lineageRefs?: string[];
  enqueuedAt: number;
  retries: number;
}

const DB_NAME = "asb_runtime_outbox";
const STORE = "events";
const VERSION = 1;

function isBrowser(): boolean {
  return typeof indexedDB !== "undefined";
}

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("enqueuedAt", "enqueuedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  if (!isBrowser()) return undefined as unknown as T;
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    Promise.resolve(fn(store))
      .then((v) => {
        t.oncomplete = () => resolve(v);
        t.onerror = () => reject(t.error);
      })
      .catch(reject);
  });
}

export async function enqueueEvent(e: QueuedEvent): Promise<void> {
  if (!isBrowser()) return;
  await tx("readwrite", (store) => {
    store.put(e);
  });
}

export async function listQueue(): Promise<QueuedEvent[]> {
  if (!isBrowser()) return [];
  return tx("readonly", (store) => {
    return new Promise<QueuedEvent[]>((resolve, reject) => {
      const out: QueuedEvent[] = [];
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          out.push(cursor.value as QueuedEvent);
          cursor.continue();
        } else {
          resolve(out.sort((a, b) => a.enqueuedAt - b.enqueuedAt));
        }
      };
      req.onerror = () => reject(req.error);
    });
  });
}

export async function removeFromQueue(id: string): Promise<void> {
  if (!isBrowser()) return;
  await tx("readwrite", (store) => {
    store.delete(id);
  });
}

export async function bumpRetry(id: string): Promise<void> {
  if (!isBrowser()) return;
  await tx("readwrite", (store) => {
    const req = store.get(id);
    req.onsuccess = () => {
      const existing = req.result as QueuedEvent | undefined;
      if (existing) {
        store.put({ ...existing, retries: existing.retries + 1 });
      }
    };
  });
}
