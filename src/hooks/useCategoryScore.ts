/**
 * Category scores for a clip, computed in the browser from the clip's SAVED
 * landmark series with the same tile code the server bundle and tests run.
 * Nothing is sent anywhere; nothing new is stored.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readLandmarkSeries } from "@/lib/biomech/pose/landmarkSeriesStorage";
import { evaluateMovementGate } from "@/lib/biomech/gates/movementGate";
import { runHittingPoseTiles } from "@/lib/biomech/metrics/hittingPoseTiles";
import { runHittingCardTiles } from "@/lib/biomech/metrics/hittingCardTiles";
import { runHittingOwnerTiles } from "@/lib/biomech/metrics/hittingOwnerTiles";
import { runFrontLegGather } from "@/lib/biomech/metrics/frontLegGather";
import { runPitchingTiles } from "@/lib/biomech/metrics/pitchingTiles";
import { runPitchingCardTiles } from "@/lib/biomech/metrics/pitchingCardTiles";
import { runThrowingTiles } from "@/lib/biomech/metrics/throwingTiles";
import { runSoftballPitchingTiles } from "@/lib/biomech/metrics/softballPitchingTiles";
import { categorySpecFor } from "@/lib/reportCard/categories/specs";
import type { CardCategorySpec } from "@/lib/reportCard/categories/scoring";

export type CategoryInputs = { spec: CardCategorySpec; raw: unknown } | { refused: string };

export function useCategoryInputs(videoId: string | null, sport: string | undefined, module: string | undefined, side: "L" | "R" | null) {
  const [state, setState] = useState<{ loading: boolean; data: CategoryInputs | null }>({ loading: false, data: null });
  useEffect(() => {
    const spec = categorySpecFor(sport, module);
    if (!videoId || !spec) { setState({ loading: false, data: null }); return; }
    let cancelled = false;
    setState({ loading: true, data: null });
    (async () => {
      try {
        const { data: run } = await supabase.from("video_landmark_runs").select("landmarks_storage_path")
          .eq("video_id", videoId).not("landmarks_storage_path", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
        const path = (run as { landmarks_storage_path?: string } | null)?.landmarks_storage_path;
        if (!path) { if (!cancelled) setState({ loading: false, data: { refused: "no_saved_body_tracking" } }); return; }
        const s = await readLandmarkSeries(path);
        const mv = evaluateMovementGate(s) as { status: string; reason?: string };
        if (mv.status === "refused") { if (!cancelled) setState({ loading: false, data: { refused: mv.reason ?? "no_movement" } }); return; }
        const m = (module ?? "").toLowerCase();
        const raw = m === "hitting"
          ? { pose: runHittingPoseTiles(s, { side }), card: runHittingCardTiles(s, { side }), owner: runHittingOwnerTiles(s, { side, athlete_height_in: null }), gather: runFrontLegGather(s, { side }) }
          : m === "throwing" ? runThrowingTiles(s, side)
          : (sport ?? "").toLowerCase() === "softball" ? runSoftballPitchingTiles(s, { throwing_side: side } as never)
          : { tiles: runPitchingTiles(s, { throwing_side: side }), card: runPitchingCardTiles(s, { throwing_side: side, athlete_height_in: null }) };
        if (!cancelled) setState({ loading: false, data: { spec, raw } });
      } catch {
        if (!cancelled) setState({ loading: false, data: { refused: "body_tracking_unreadable" } });
      }
    })();
    return () => { cancelled = true; };
  }, [videoId, sport, module, side]);
  return state;
}
