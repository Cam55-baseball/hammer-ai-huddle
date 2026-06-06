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

/** Write a session-scoped equipment override (TTL: end of today UTC). */
export async function writeSessionEquipment(
  userId: string,
  equipment: string[],
  venue: Venue | string | null,
  source: string,
): Promise<void> {
  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);
  // Upsert via unique (user_id, scope) for session.
  const { error } = await supabase
    .from("athlete_equipment_context")
    .upsert(
      {
        user_id: userId,
        scope: "session",
        equipment,
        venue,
        valid_until: endOfDay.toISOString(),
        source,
        confidence: "self_report",
      },
      { onConflict: "user_id,scope" },
    );
  if (error) throw new Error(error.message);
}

/** Write or update the persistent equipment profile. */
export async function writePersistentEquipment(
  userId: string,
  equipment: string[],
  venue: Venue | string | null,
  source: string,
): Promise<void> {
  const { error } = await supabase
    .from("athlete_equipment_context")
    .upsert(
      {
        user_id: userId,
        scope: "persistent",
        equipment,
        venue,
        valid_until: null,
        source,
        confidence: "self_report",
      },
      { onConflict: "user_id,scope" },
    );
  if (error) throw new Error(error.message);
}
