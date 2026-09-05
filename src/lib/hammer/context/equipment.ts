/**
 * Equipment precedence resolver.
 *
 * Sprint: Athlete Context Spine Implementation (P0-1).
 *
 * Authoritative precedence (Section E of constitution):
 *   session > temporary > persistent > inferred
 *
 * Session-scope writes are end-of-day TTL and must NEVER overwrite
 * persistent profile state. A "hotel today" mention writes a session
 * row; tomorrow the persistent profile is unchanged.
 */
import { supabase } from "@/integrations/supabase/client";

export const EQUIPMENT_CONTEXT_CHANGED_EVENT = "hammer:equipment-context-changed";

function announceEquipmentContextChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EQUIPMENT_CONTEXT_CHANGED_EVENT));
  }
}

export type EquipmentScope = "persistent" | "session" | "temporary" | "inferred";

export type Venue =
  | "commercial_gym"
  | "home_gym"
  | "field"
  | "hotel"
  | "travel"
  | "bodyweight"
  | "bands"
  | "field_only";

export interface EquipmentRow {
  scope: EquipmentScope;
  equipment: string[];
  venue: Venue | string | null;
  valid_until: string | null;
  source: string;
  confidence: string;
  created_at: string;
}

export interface EquipmentEffective {
  scope: EquipmentScope | null;
  equipment: string[];
  venue: Venue | string | null;
  source: string | null;
  confidence: string;
  missing: boolean;
}

const PRECEDENCE: EquipmentScope[] = ["session", "temporary", "persistent", "inferred"];

export function resolveEquipment(rows: EquipmentRow[], now = new Date()): EquipmentEffective {
  const live = rows.filter(
    (r) => !r.valid_until || new Date(r.valid_until).getTime() > now.getTime(),
  );
  for (const scope of PRECEDENCE) {
    const candidates = live
      .filter((r) => r.scope === scope)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    if (candidates.length > 0) {
      const top = candidates[0];
      return {
        scope: top.scope,
        equipment: top.equipment ?? [],
        venue: top.venue ?? null,
        source: top.source,
        confidence: top.confidence,
        missing: false,
      };
    }
  }
  return {
    scope: null,
    equipment: [],
    venue: null,
    source: null,
    confidence: "missing",
    missing: true,
  };
}

/**
 * Save an equipment row through the server-side helper.
 *
 * We cannot use PostgREST upsert here: the singleton uniqueness is enforced by
 * a PARTIAL unique index (user_id, scope) WHERE scope IN ('persistent','session'),
 * and ON CONFLICT inference cannot match a partial index without repeating its
 * predicate — which PostgREST cannot express. That failed with 42P10 every time.
 * `save_equipment_context` does the update-or-insert server-side instead.
 */
async function saveEquipmentContext(
  scope: EquipmentScope,
  equipment: string[],
  venue: Venue | string | null,
  source: string,
  validUntil: string | null,
): Promise<void> {
  const { error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: { message: string; details?: string; code?: string } | null }>)(
    "save_equipment_context",
    {
      p_scope: scope,
      p_equipment: equipment,
      p_venue: venue,
      p_source: source,
      p_valid_until: validUntil,
    },
  );
  if (error) {
    const err = new Error(error.message) as Error & { code?: string; details?: string };
    err.code = error.code;
    err.details = error.details;
    throw err;
  }
  // The context envelope is a derived RPC result, so a successful equipment
  // write cannot update it through table-query cache matching. Tell every live
  // plan consumer to invalidate and re-read the envelope immediately.
  announceEquipmentContextChanged();
}

/** Write a session-scoped equipment override (TTL: end of today UTC). */
export async function writeSessionEquipment(
  userId: string,
  equipment: string[],
  venue: Venue | string | null,
  source: string,
): Promise<void> {
  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);
  await saveEquipmentContext("session", equipment, venue, source, endOfDay.toISOString());
}

/** Write or update the persistent equipment profile. */
export async function writePersistentEquipment(
  userId: string,
  equipment: string[],
  venue: Venue | string | null,
  source: string,
): Promise<void> {
  await saveEquipmentContext("persistent", equipment, venue, source, null);
}

/** Read the athlete's stored persistent equipment list (empty when unset). */
export async function fetchPersistentEquipment(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("athlete_equipment_context")
    .select("equipment")
    .eq("user_id", userId)
    .eq("scope", "persistent")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return ((data as { equipment?: string[] } | null)?.equipment ?? []).filter(Boolean);
}

/**
 * Plain-language cause for a failed equipment save — shared by onboarding and
 * the Hammer chat path so neither surface ever shows a generic "try again".
 */
export function plainEquipmentSaveError(err: Error & { code?: string; details?: string }): string {
  const code = err.code ?? "";
  const msg = (err.message ?? "").toLowerCase();
  if (code === "42501" || msg.includes("row-level security") || msg.includes("permission")) {
    return "Your account isn't allowed to save this equipment list. That usually means your sign-in expired — sign out and back in, then try again.";
  }
  if (code === "28000" || msg.includes("not authenticated") || msg.includes("jwt")) {
    return "Your sign-in expired before the save went through. Sign back in and tell me again.";
  }
  if (code === "23514" || msg.includes("violates check constraint")) {
    return "The app sent an equipment list the database wouldn't accept. Nothing was saved — that's a bug on our side, not something retrying will fix.";
  }
  if (code === "42P10" || msg.includes("on conflict")) {
    return "The app couldn't match your existing equipment entry, so nothing was saved. That's a bug on our side — retrying won't help.";
  }
  if (code === "PGRST202" || msg.includes("could not find the function")) {
    return "The equipment save isn't available on the server yet. Nothing was saved.";
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "I couldn't reach the server, so nothing was saved. Check your connection and tell me again.";
  }
  return `The server refused to save your equipment: ${err.message}`;
}


