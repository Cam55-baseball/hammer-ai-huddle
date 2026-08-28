/**
 * useTellReport — data layer for the pitcher-facing Tell Report preview.
 * Reads the pitcher's own video_metric_runs (RLS-scoped to their videos),
 * extracts the eligible metrics (energy_angle_deg / shoulder_tilt_deg),
 * and lets the owner tag each analyzed pitch with a pitch type AND a
 * delivery (windup / stretch). Comparisons only ever happen within one
 * delivery, so both tags are required before a pitch can be compared.
 * Pre-release only: TIPPING_DETECTION_ENABLED stays false.
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  buildTellReport,
  isDeliveryType,
  TIPPING_ELIGIBLE_METRICS,
  type DeliveryType,
  type PitchObservation,
  type TellReport,
} from "@/lib/biomech/tipping/tellReport";

export interface TellReportRun {
  id: string;
  videoId: string;
  createdAt: string;
  pitchType: string | null;
  deliveryType: DeliveryType | null;
  metrics: { energy_angle_deg: number | null; shoulder_tilt_deg: number | null };
  eligibleMetricCount: number;
}

type MetricsJsonb = Record<string, unknown>;

function extractMetric(jsonb: MetricsJsonb, key: string): number | null {
  const raw = jsonb?.[key];
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === "object") {
    const v = (raw as { value?: unknown }).value;
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

export function useTellReportRuns() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tell-report-runs", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<TellReportRun[]> => {
      const { data, error } = await (supabase as any)
        .from("video_metric_runs")
        .select("id, video_id, created_at, metrics_jsonb, pitch_type, delivery_type")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return ((data ?? []) as Array<{
        id: string;
        video_id: string;
        created_at: string;
        metrics_jsonb: MetricsJsonb;
        pitch_type: string | null;
        delivery_type: string | null;
      }>).map((row) => {
        const metrics = {
          energy_angle_deg: extractMetric(row.metrics_jsonb, "energy_angle_deg"),
          shoulder_tilt_deg: extractMetric(row.metrics_jsonb, "shoulder_tilt_deg"),
        };
        const eligibleMetricCount = TIPPING_ELIGIBLE_METRICS.filter(
          (k) => metrics[k] !== null,
        ).length;
        return {
          id: row.id as string,
          videoId: row.video_id as string,
          createdAt: row.created_at as string,
          pitchType: row.pitch_type as string | null,
          deliveryType: isDeliveryType(row.delivery_type) ? row.delivery_type : null,
          metrics,
          eligibleMetricCount,
        };
      });
    },
  });
}

export function useSetRunTags() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      runId,
      patch,
    }: {
      runId: string;
      patch: { pitch_type?: string | null; delivery_type?: DeliveryType | null };
    }) => {
      const { error } = await (supabase as any)
        .from("video_metric_runs")
        .update(patch)
        .eq("id", runId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tell-report-runs", user?.id] });
      toast.success("Tag saved");
    },
    onError: () => toast.error("Couldn't save tag"),
  });
}

export function useTellReport(runs: TellReportRun[] | undefined): TellReport | null {
  const { user } = useAuth();
  return useMemo(() => {
    if (!runs || !user?.id) return null;
    const observations: PitchObservation[] = runs
      .filter((r) => r.pitchType)
      .map((r) => ({
        pitch_id: r.id,
        pitch_type: r.pitchType!,
        delivery_type: r.deliveryType,
        metrics: { ...r.metrics },
      }));
    return buildTellReport(user.id, observations);
  }, [runs, user?.id]);
}
