import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { IqActorRole } from "@/lib/iq/types";

export type FieldSport = "baseball" | "softball";
export type AlignmentPositions = Partial<Record<IqActorRole, { x: number; y: number }>>;

export interface AlignmentPreset {
  id: string;
  sport: FieldSport;
  preset_key: string;
  label: string;
  positions: AlignmentPositions;
  is_default: boolean;
  updated_at: string;
}

// Last-resort fallback so the diamond ALWAYS renders even if the network
// is down before any preset has been loaded. Owner-editable presets in the
// database override this for real users.
const HARD_FALLBACK: Record<FieldSport, AlignmentPositions> = {
  baseball: {
    P: { x: 50, y: 68 }, C: { x: 50, y: 94 },
    "1B": { x: 72, y: 66 }, "2B": { x: 60, y: 52 }, SS: { x: 40, y: 52 }, "3B": { x: 28, y: 66 },
    LF: { x: 22, y: 22 }, CF: { x: 50, y: 10 }, RF: { x: 78, y: 22 },
  },
  softball: {
    P: { x: 50, y: 60 }, C: { x: 50, y: 94 },
    "1B": { x: 70, y: 62 }, "2B": { x: 60, y: 48 }, SS: { x: 40, y: 48 }, "3B": { x: 30, y: 62 },
    LF: { x: 24, y: 26 }, CF: { x: 50, y: 14 }, RF: { x: 76, y: 26 },
  },
};

export function fallbackAlignment(sport: FieldSport): AlignmentPositions {
  return HARD_FALLBACK[sport];
}

/** All presets for a sport (used by the editor). */
export function useAlignmentPresets(sport: FieldSport) {
  return useQuery({
    queryKey: ["iq-alignments", sport],
    queryFn: async (): Promise<AlignmentPreset[]> => {
      const { data, error } = await supabase
        .from("iq_defensive_alignments" as any)
        .select("*")
        .eq("sport", sport)
        .order("is_default", { ascending: false })
        .order("label");
      if (error) throw error;
      return (data ?? []) as any;
    },
    staleTime: 60_000,
  });
}

/**
 * Resolve the positions to render:
 *   requested preset → sport default → hard fallback.
 */
export function useDefensiveAlignment(sport: FieldSport, presetKey?: string | null) {
  const q = useAlignmentPresets(sport);
  const presets = q.data ?? [];
  const chosen =
    (presetKey ? presets.find((p) => p.preset_key === presetKey) : null) ??
    presets.find((p) => p.is_default) ??
    presets.find((p) => p.preset_key === "standard") ??
    null;

  return {
    positions: (chosen?.positions ?? fallbackAlignment(sport)) as AlignmentPositions,
    preset: chosen,
    isLoading: q.isLoading,
  };
}
