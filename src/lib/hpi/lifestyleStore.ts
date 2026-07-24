/**
 * Human Performance Intelligence — Lifestyle Intake (Su Wen / Neijing overlay).
 *
 * Additive-only: stored in localStorage so we don't touch schema or ledger.
 * Values are interpretive-only inputs to the derived HPI score; they never
 * author organism truth.
 */

export type YinYangLean = "yin" | "balanced" | "yang";
export type StressLevel = 1 | 2 | 3 | 4 | 5;

export interface HpiLifestyle {
  /** Nightly sleep target in hours (6–10). */
  sleepTargetHours: number;
  /** Typical actual sleep last week in hours (4–10). */
  sleepActualHours: number;
  /** Water intake per day in ounces (24–160). */
  waterOz: number;
  /** Perceived life stress 1 (very low) – 5 (very high). */
  stressLevel: StressLevel;
  /** Rough self-report of constitutional lean. */
  constitution: YinYangLean;
  /** Prefers to train early / midday / evening. */
  trainingWindow: "early" | "midday" | "evening";
  /** ISO timestamp of last save. */
  savedAt: string;
}

const KEY = "hpi:lifestyle:v1";

export function readHpiLifestyle(): HpiLifestyle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HpiLifestyle>;
    if (
      typeof parsed.sleepTargetHours !== "number" ||
      typeof parsed.sleepActualHours !== "number" ||
      typeof parsed.waterOz !== "number" ||
      !parsed.constitution
    ) {
      return null;
    }
    return parsed as HpiLifestyle;
  } catch {
    return null;
  }
}

export function writeHpiLifestyle(next: Omit<HpiLifestyle, "savedAt">): HpiLifestyle {
  const record: HpiLifestyle = { ...next, savedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    /* storage unavailable — skip silently */
  }
  return record;
}

export function defaultLifestyle(): Omit<HpiLifestyle, "savedAt"> {
  return {
    sleepTargetHours: 8,
    sleepActualHours: 7,
    waterOz: 80,
    stressLevel: 3,
    constitution: "balanced",
    trainingWindow: "midday",
  };
}

/**
 * Merge partial signals (from daily quizzes, nutrition logs, etc.) into the
 * existing HPI lifestyle snapshot without overwriting user-set baselines.
 * Safe on server (no-op) and when storage is unavailable.
 */
export function mergeHpiLifestyle(
  patch: Partial<Omit<HpiLifestyle, "savedAt">>,
): HpiLifestyle | null {
  if (typeof window === "undefined") return null;
  const existing = readHpiLifestyle();
  const base = existing
    ? (() => { const { savedAt: _s, ...rest } = existing; return rest; })()
    : defaultLifestyle();
  const merged = { ...base, ...patch };
  return writeHpiLifestyle(merged);
}
