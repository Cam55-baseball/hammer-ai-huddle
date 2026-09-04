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

