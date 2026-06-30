/**
 * usePregamePlan — generate, list, and rate AI pregame plans for a dossier.
 *
 * Mirrors the gp-pregame-plan + gp-ingest-dossier-asset + gp-analyze-ab-swing
 * edge functions so the UI never has to know the wire format.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { gp, GP_DOSSIER_VIDEO_BUCKET, GP_DOC_BUCKET } from "@/lib/games/ledger";
import { toast } from "sonner";

export interface PregamePlan {
  id: string;
  sport: string;
  dossier_kind: "pitcher" | "hitter";
  pitcher_dossier_id: string | null;
  hitter_dossier_id: string | null;
  game_id: string | null;
  plan_json: any;
  plan_markdown: string | null;
  user_rating: number | null;
  user_feedback: string | null;
  created_at: string;
}

export function usePregamePlans(args: {
  role: "pitcher" | "hitter";
  dossierId: string | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const column = args.role === "pitcher" ? "pitcher_dossier_id" : "hitter_dossier_id";

  const list = useQuery({
    queryKey: ["gp-pregame-plans", user?.id, args.role, args.dossierId],
    enabled: !!user && !!args.dossierId,
    queryFn: async () => {
      const { data, error } = await gp("gp_pregame_plans")
        .select("*")
        .eq("user_id", user!.id)
        .eq(column, args.dossierId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as PregamePlan[];
    },
  });

  const generate = useMutation({
    mutationFn: async (input: { sport: string; gameId?: string; userContext?: any }) => {
      if (!args.dossierId) throw new Error("No dossier selected");
      const { data, error } = await supabase.functions.invoke("gp-pregame-plan", {
        body: {
          sport: input.sport,
          role: args.role,
          dossierId: args.dossierId,
          gameId: input.gameId,
          userContext: input.userContext ?? {},
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { plan_id: string; plan_json: any; plan_markdown: string; archetype?: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gp-pregame-plans"] });
      toast.success("Plan ready");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not generate plan"),
  });

  const rate = useMutation({
    mutationFn: async (input: { id: string; rating: number; feedback?: string }) => {
      const { error } = await gp("gp_pregame_plans")
        .update({ user_rating: input.rating, user_feedback: input.feedback ?? null })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gp-pregame-plans"] }),
  });

  return { list, generate, rate };
}

/** Ingest a notes blob OR an uploaded file into a dossier (merges tendencies, sets archetype). */
export function useIngestDossierAsset() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      dossierId: string;
      role: "pitcher" | "hitter";
      sport: string;
      text?: string;
      file?: File;
    }) => {
      let bucket: string | undefined;
      let path: string | undefined;
      if (input.file) {
        bucket = GP_DOC_BUCKET;
        path = `${user!.id}/dossier/${input.dossierId}/${Date.now()}-${input.file.name}`;
        const up = await supabase.storage.from(bucket).upload(path, input.file, { upsert: true });
        if (up.error) throw up.error;
      }
      const { data, error } = await supabase.functions.invoke("gp-ingest-dossier-asset", {
        body: {
          dossierId: input.dossierId,
          role: input.role,
          sport: input.sport,
          text: input.text,
          bucket,
          path,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { tendencies: any; archetype: string | null; summary: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gp-pitcher-dossiers"] });
      qc.invalidateQueries({ queryKey: ["gp-opponent-hitters"] });
      toast.success("Profile updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Ingest failed"),
  });
}

/** Upload one or more videos directly attached to a dossier. */
export function useUploadDossierVideos() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      dossierId: string;
      role: "pitcher" | "hitter";
      files: File[];
    }) => {
      const table = input.role === "pitcher" ? "gp_pitcher_dossiers" : "gp_opponent_hitters";
      const urls: string[] = [];
      for (const file of input.files) {
        const path = `${user!.id}/${input.dossierId}/${Date.now()}-${file.name}`;
        const up = await supabase.storage.from(GP_DOSSIER_VIDEO_BUCKET).upload(path, file, { upsert: true });
        if (up.error) throw up.error;
        urls.push(path);
      }
      const { data: cur } = await gp(table).select("video_urls").eq("id", input.dossierId).maybeSingle();
      const merged = [...((cur as any)?.video_urls ?? []), ...urls];
      const { error } = await gp(table).update({ video_urls: merged }).eq("id", input.dossierId);
      if (error) throw error;
      return merged;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gp-pitcher-dossiers"] });
      qc.invalidateQueries({ queryKey: ["gp-opponent-hitters"] });
      toast.success("Video attached");
    },
    onError: (e: any) => toast.error(e?.message ?? "Upload failed"),
  });
}

/** Analyze a single at-bat swing video against the specific pitcher faced. */
export function useAnalyzeAtBatSwing() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      abId: string;
      gameId?: string;
      dossierId?: string;
      file: File;
      userThoughts?: string;
    }) => {
      const path = `${user!.id}/ab/${input.abId}/${Date.now()}-${input.file.name}`;
      const up = await supabase.storage.from(GP_DOSSIER_VIDEO_BUCKET).upload(path, input.file, { upsert: true });
      if (up.error) throw up.error;
      const { data, error } = await supabase.functions.invoke("gp-analyze-ab-swing", {
        body: {
          abId: input.abId,
          gameId: input.gameId,
          dossierId: input.dossierId,
          bucket: GP_DOSSIER_VIDEO_BUCKET,
          path,
          userThoughts: input.userThoughts,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gp-ab-swing-analyses"] });
      toast.success("Swing analyzed");
    },
    onError: (e: any) => toast.error(e?.message ?? "Analysis failed"),
  });
}

/** Mark which plan recommendations were followed / worked — drives learning loop. */
export function useLogPlanOutcome() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      planId: string;
      abId?: string;
      recommendation_key: string;
      recommendation_text?: string;
      followed?: boolean;
      worked?: boolean;
      user_note?: string;
    }) => {
      const { error } = await gp("gp_plan_outcomes").insert({
        user_id: user!.id,
        plan_id: input.planId,
        ab_id: input.abId ?? null,
        recommendation_key: input.recommendation_key,
        recommendation_text: input.recommendation_text ?? null,
        followed: input.followed ?? null,
        worked: input.worked ?? null,
        user_note: input.user_note ?? null,
      });
      if (error) throw error;
      // Fire-and-forget learning-loop update — never blocks the UI.
      try { await supabase.functions.invoke("gp-update-priors", { body: { planId: input.planId } }); } catch {}
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not log outcome"),
  });
}

