import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { IqActorRole } from "@/lib/iq/types";
import {
  anchorsToPositions, type DefensiveAnchors, type FieldSport, type Handedness,
} from "@/lib/iq/fieldModel";

export type { FieldSport } from "@/lib/iq/fieldModel";
export type AlignmentPositions = Partial<Record<IqActorRole, { x: number; y: number }>>;
export type AlignmentRanges = Partial<Record<IqActorRole, number>>;

export interface AlignmentPreset {
  id: string;
  sport: FieldSport;
  preset_key: string;
  label: string;
  positions: AlignmentPositions;
  range_radii: AlignmentRanges | null;
  is_default: boolean;
  updated_at: string;
  anchors_vs_rhh?: DefensiveAnchors | null;
  anchors_vs_lhh?: DefensiveAnchors | null;
  positions_vs_rhh?: AlignmentPositions | null;
  positions_vs_lhh?: AlignmentPositions | null;
}

// Sensible per-role coverage radii (0–100 grid units). Owner can override per preset.
export const DEFAULT_RANGE_RADII: AlignmentRanges = {
  P: 6, C: 5,
  "1B": 8, "2B": 10, SS: 10, "3B": 8,
  LF: 14, CF: 18, RF: 14,
};

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
 * Resolve positions for a given preset and batter handedness.
 * Priority: anchors_vs_<hand> (elite) → positions_vs_<hand> → legacy `positions` → hard fallback.
 */
export function resolvePositions(
  preset: AlignmentPreset | null | undefined,
  sport: FieldSport,
  hand: Handedness,
): AlignmentPositions {
  if (!preset) return fallbackAlignment(sport);
  const anchors = hand === "R" ? preset.anchors_vs_rhh : preset.anchors_vs_lhh;
  if (anchors && Object.keys(anchors).length > 0) {
    return anchorsToPositions(sport, anchors, hand);
  }
  const posByHand = hand === "R" ? preset.positions_vs_rhh : preset.positions_vs_lhh;
  if (posByHand && Object.keys(posByHand).length > 0) return posByHand;
  return preset.positions ?? fallbackAlignment(sport);
}

export function useDefensiveAlignment(
  sport: FieldSport,
  presetKey?: string | null,
  hand: Handedness = "R",
) {
  const q = useAlignmentPresets(sport);
  const presets = q.data ?? [];
  const chosen =
    (presetKey ? presets.find((p) => p.preset_key === presetKey) : null) ??
    presets.find((p) => p.is_default) ??
    presets.find((p) => p.preset_key === "standard") ??
    null;

  return {
    positions: resolvePositions(chosen, sport, hand),
    anchors: (hand === "R" ? chosen?.anchors_vs_rhh : chosen?.anchors_vs_lhh) ?? null,
    rangeRadii: { ...DEFAULT_RANGE_RADII, ...(chosen?.range_radii ?? {}) } as AlignmentRanges,
    preset: chosen,
    isLoading: q.isLoading,
  };
}
