/**
 * Universal Save-&-Exit draft store.
 *
 * Goals are persisted in `athlete_context.category_goals`. THIS module
 * persists everything else — partial onboarding state, in-progress schedule
 * imports, half-written injury intakes — so the user can always exit safely
 * and resume exactly where they left off.
 *
 * Storage strategy:
 *  1) localStorage write happens IMMEDIATELY (synchronous, offline-safe).
 *  2) Supabase upsert is debounced (800ms) into `athlete_context.onboarding_draft`.
 *     Authoritative cross-device source; localStorage is the warm cache.
 *
 * The draft is a free-form bag of named slots keyed by flow id, e.g.:
 *   { "category-goals-wizard": {...},
 *     "schedule-importer":    { pastedText, parsedRows },
 *     "injury-intake":        { region, severity, notes },
 *     "onboarding-step":      { stepIndex, dayType } }
 *
 * Slots are cleared on explicit completion via `clearDraftSlot()`.
 */
import { supabase } from "@/integrations/supabase/client";

export type DraftSlot =
  | "category-goals-wizard"
  | "schedule-importer"
  | "injury-intake"
  | "onboarding-step"
  | "profile-answers";

type DraftBag = Partial<Record<DraftSlot, unknown>>;

const LS_PREFIX = "onboarding-draft:v2:";

function lsKey(uid: string): string {
  return `${LS_PREFIX}${uid}`;
}

function readLocal(uid: string): DraftBag {
  try {
    const raw = localStorage.getItem(lsKey(uid));
    if (!raw) return {};
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as DraftBag) : {};
  } catch {
    return {};
  }
}

function writeLocal(uid: string, bag: DraftBag): void {
  try {
    localStorage.setItem(lsKey(uid), JSON.stringify(bag));
  } catch {
    /* quota / private-mode — drafts still survive in memory for this session */
  }
}

const pendingFlush = new Map<string, ReturnType<typeof setTimeout>>();
const FLUSH_DELAY_MS = 800;

function scheduleRemoteFlush(uid: string, bag: DraftBag): void {
  const prev = pendingFlush.get(uid);
  if (prev) clearTimeout(prev);
  const t = setTimeout(async () => {
    pendingFlush.delete(uid);
    try {
      await supabase
        .from("athlete_context")
        .upsert(
          { user_id: uid, onboarding_draft: bag as unknown as never },
          { onConflict: "user_id" },
        );
    } catch (e) {
      // Non-fatal — localStorage already has it; next mount will retry.
      console.warn("[draftStore] remote flush failed", e);
    }
  }, FLUSH_DELAY_MS);
  pendingFlush.set(uid, t);
}

/** Read the most recent draft slot. Prefers remote, falls back to local. */
export async function readDraftSlot<T>(uid: string, slot: DraftSlot): Promise<T | null> {
  const local = readLocal(uid);
  if (slot in local && local[slot] !== undefined) return local[slot] as T;
  try {
    const { data } = await supabase
      .from("athlete_context")
      .select("onboarding_draft")
      .eq("user_id", uid)
      .maybeSingle();
    const remote = (data as { onboarding_draft?: DraftBag } | null)?.onboarding_draft ?? {};
    if (slot in remote) {
      // Warm the local cache for offline reads.
      writeLocal(uid, { ...local, [slot]: remote[slot] });
      return remote[slot] as T;
    }
  } catch (e) {
    console.warn("[draftStore] remote read failed", e);
  }
  return null;
}

/** Write a draft slot. Synchronous localStorage + debounced remote upsert. */
export function writeDraftSlot<T>(uid: string, slot: DraftSlot, value: T): void {
  const bag = readLocal(uid);
  bag[slot] = value as unknown;
  writeLocal(uid, bag);
  scheduleRemoteFlush(uid, bag);
}

/** Clear a slot on explicit completion (e.g. user finishes the wizard). */
export function clearDraftSlot(uid: string, slot: DraftSlot): void {
  const bag = readLocal(uid);
  if (!(slot in bag)) return;
  delete bag[slot];
  writeLocal(uid, bag);
  scheduleRemoteFlush(uid, bag);
}
