/**
 * The athlete's ordered position list. The first entry is their primary
 * position; the rest are positions they also play. Falls back to the legacy
 * single `profiles.position` value when the list has never been set.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { canonicalizePositions, normalizePositionCode } from "@/lib/drills/positionLabels";

export function useAthletePositions() {
  const { user } = useOptionalAuth();
  const [positions, setPositions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setPositions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("profiles")
      .select("position, positions")
      .eq("id", user.id)
      .maybeSingle();
    if (err) {
      setError(err.message);
    } else {
      setError(null);
      const list = ((data as { positions?: string[] } | null)?.positions ?? []) as string[];
      const legacy = normalizePositionCode((data as { position?: string } | null)?.position ?? null);
      setPositions(list.length > 0 ? list : legacy ? [legacy] : []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const savePositions = useCallback(
    async (next: string[]) => {
      if (!user) throw new Error("You need to be signed in to change your positions.");
      const clean = canonicalizePositionsPreservingOrder(next);
      const { error: err } = await supabase
        .from("profiles")
        .update({ positions: clean, position: clean[0] ?? null } as never)
        .eq("id", user.id);
      if (err) throw new Error(err.message);
      setPositions(clean);
    },
    [user],
  );

  return { positions, primary: positions[0] ?? null, loading, error, savePositions, reload: load };
}

/** Keep the athlete's chosen order (primary first) while de-duplicating. */
function canonicalizePositionsPreservingOrder(raw: string[]): string[] {
  const out: string[] = [];
  for (const r of raw) {
    const c = normalizePositionCode(r);
    if (c && !out.includes(c)) out.push(c);
  }
  return out.length > 0 ? out : canonicalizePositions(raw);
}
