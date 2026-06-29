/**
 * Resume store — localStorage-backed snapshots so any IQ surface can be
 * left and re-entered without losing work. Pure client storage: zero
 * network, zero schema. Survives reloads, accidental exits, and auth blips.
 */

const PREFIX = "iq:v1:";

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function read<T>(key: string): T | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // quota / private mode — silently drop
  }
}

function remove(key: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

// ---------- Quiz runner resume ----------

export interface QuizResumeSnapshot {
  situationId: string;
  situationSlug: string;
  situationTitle: string;
  scenarioId: string;
  position: string | null;
  answer: string | null;
  startedAt: number;
  updatedAt: number;
}

const QUIZ_KEY = "quiz:current";

export const quizResume = {
  load(): QuizResumeSnapshot | null {
    return read<QuizResumeSnapshot>(QUIZ_KEY);
  },
  save(snap: Omit<QuizResumeSnapshot, "updatedAt">): void {
    write<QuizResumeSnapshot>(QUIZ_KEY, { ...snap, updatedAt: Date.now() });
  },
  clear(): void {
    remove(QUIZ_KEY);
  },
};

// ---------- Pending attempt queue (offline-safe) ----------

export interface PendingAttempt {
  id: string;
  scenarioId: string;
  situationId: string;
  positionChosen: string | null;
  correct: boolean;
  answerPayload: Record<string, unknown>;
  timeMs: number;
  queuedAt: number;
}

const PENDING_KEY = "attempts:pending";

export const pendingAttempts = {
  list(): PendingAttempt[] {
    return read<PendingAttempt[]>(PENDING_KEY) ?? [];
  },
  enqueue(a: Omit<PendingAttempt, "id" | "queuedAt">): PendingAttempt {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `att-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const row: PendingAttempt = { ...a, id, queuedAt: Date.now() };
    const list = pendingAttempts.list();
    write(PENDING_KEY, [...list, row]);
    return row;
  },
  remove(id: string): void {
    const list = pendingAttempts.list().filter((p) => p.id !== id);
    if (list.length) write(PENDING_KEY, list);
    else remove(PENDING_KEY);
  },
};

// ---------- Owner wizard draft autosave ----------

export interface WizardDraft {
  draftKey: string; // slug or "new:<uuid>"
  meta: Record<string, unknown>;
  actors: unknown[];
  updatedAt: number;
}

function wizardKey(draftKey: string): string {
  return `wizard:${draftKey}`;
}

export const wizardDraft = {
  load(draftKey: string): WizardDraft | null {
    return read<WizardDraft>(wizardKey(draftKey));
  },
  save(draftKey: string, meta: Record<string, unknown>, actors: unknown[]): void {
    write<WizardDraft>(wizardKey(draftKey), {
      draftKey,
      meta,
      actors,
      updatedAt: Date.now(),
    });
  },
  clear(draftKey: string): void {
    remove(wizardKey(draftKey));
  },
};
