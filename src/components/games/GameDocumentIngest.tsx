/**
 * GameDocumentIngest — multimodal AI ingest panel.
 *
 * User drops a scorebook photo / TrackMan PDF / GameChanger export / Rapsodo
 * CSV. We upload to the `gp-documents` storage bucket and call the
 * `gp-ingest-document` edge function which uses Gemini Vision to extract a
 * draft of at-bats / pitches / defensive plays. User confirms by inning.
 */
import { useState } from "react";
import { FileUp, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { gp, GP_DOC_BUCKET } from "@/lib/games/ledger";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DocumentReview } from "./DocumentReview";
import { documentSelection } from "@/lib/games/documentReview";

interface DraftSummary {
  atBats?: number;
  pitches?: number;
  defense?: number;
  baserun?: number;
}

export function GameDocumentIngest({ gameId, sport }: { gameId: string; sport: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const { data: docs = [], isLoading, error: loadError } = useQuery<Array<{ id: string; file_url: string | null; parse_status: string; parse_error: string | null; parsed_events: { summary?: DraftSummary; raw?: unknown; added?: number } | null }>>({
    queryKey: ["gp-documents", gameId, user?.id], enabled: !!user,
    queryFn: async () => {
      const result = await gp("gp_documents").select("id,file_url,parse_status,parse_error,parsed_events").eq("game_id", gameId).eq("user_id", user?.id).order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
    refetchInterval: busy ? 3000 : false,
  });
  async function confirm(documentId: string, selection: ReturnType<typeof documentSelection>) {
    setConfirming(documentId);
    try {
      const { data, error } = await (supabase as any).rpc("confirm_game_document", { _document_id: documentId, _selection: selection });
      if (error) throw error;
      await Promise.all(["gp-documents", "gp-at-bats", "gp-ab", "gp-pitches", "gp-defense", "gp-baserun"].map(key => qc.invalidateQueries({ queryKey: [key, gameId] })));
      toast.success(`${data.added} imported entries added.`);
    } catch {
      toast.error("Entries were not added. Check the game details and try again.");
    } finally { setConfirming(null); }
  }

  async function handleFile(file: File) {
    if (!user) return;
    setBusy(true);
    const path = `${user.id}/${gameId}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, "_")}`;
    try {
      const up = await supabase.storage.from(GP_DOC_BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (up.error) throw up.error;

      // gp_documents schema uses (source, file_url, file_mime, parse_status,
      // parse_error, parsed_events). We pack bucket+path into source/file_url.
      const docRow = await gp("gp_documents").insert({
        user_id: user.id,
        game_id: gameId,
        source: file.type.startsWith("image/") ? "photo" : "other",
        file_url: `${GP_DOC_BUCKET}://${path}`,
        file_mime: file.type || null,
        parse_status: "pending",
      }).select("id").single();
      if (docRow.error) throw docRow.error;

      await qc.invalidateQueries({ queryKey: ["gp-documents", gameId] });

      // 45s safety: edge function uses Gemini and may take ~10–30s on big files
      
      const { data, error } = await supabase.functions.invoke("gp-ingest-document", {
        body: { documentId: docRow.data?.id, gameId, sport, bucket: GP_DOC_BUCKET, path },
      });
      if (error) throw error;

      if (data?.error) throw new Error(data.error);
      await qc.invalidateQueries({ queryKey: ["gp-documents", gameId] });
      qc.invalidateQueries({ queryKey: ["gp-at-bats", gameId] });
      qc.invalidateQueries({ queryKey: ["gp-pitches", gameId] });
      qc.invalidateQueries({ queryKey: ["gp-defense", gameId] });
      qc.invalidateQueries({ queryKey: ["gp-baserun", gameId] });
      toast.success("Document read — draft saved. No game events added.");
    } catch (e: any) {
      const msg = e?.message ?? "Ingest failed";
      await qc.invalidateQueries({ queryKey: ["gp-documents", gameId] });
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card className="p-4 space-y-3 border-dashed">
        <div className="flex items-center gap-2">
          <FileUp className="h-4 w-4 text-primary" />
          <p className="font-medium">Hammer document import</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Scorebook photo · TrackMan PDF/CSV · GameChanger export · Rapsodo CSV. Gemini
          saves a draft. Review your entries before adding them to the game.
        </p>
        <label className="block">
          <input
            type="file"
            accept="image/*,application/pdf,.csv,.txt"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.currentTarget.value = "";
            }}
            className="text-xs file:mr-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:px-3 file:py-1.5 file:text-xs file:font-medium"
          />
        </label>
        {busy && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Uploading & analyzing…
          </p>
        )}
      </Card>

      <div className="space-y-2">
        {isLoading && <p className="text-xs text-muted-foreground">Loading saved documents…</p>}
        {loadError && <p className="text-xs text-destructive">Saved documents could not be loaded.</p>}
        {docs.map((d) => (
          <Card key={d.id} className="p-3 flex items-start gap-2">
            {d.parse_status === "failed" ? (
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            ) : ["ready", "applied"].includes(d.parse_status) ? (
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium break-words">{d.file_url?.split("/").pop()?.replace(/^\d+_/, "") ?? "Saved document"}</p>
              {d.parse_status === "failed" && <p className="text-xs text-destructive">Document could not be read.</p>}
              {["pending", "parsing"].includes(d.parse_status) && <p className="text-xs text-muted-foreground">Document status: waiting for draft</p>}
              {d.parse_status === "applied" && <p className="text-xs text-muted-foreground">Document status: confirmed · Imported entries added: {d.parsed_events?.added ?? "Not recorded"}</p>}
              {d.parse_status === "ready" && d.parsed_events?.summary && (
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {d.parsed_events.summary.atBats != null && <Badge variant="secondary">{d.parsed_events.summary.atBats} AB draft</Badge>}
                  {d.parsed_events.summary.pitches != null && <Badge variant="secondary">{d.parsed_events.summary.pitches} pitch drafts</Badge>}
                  {d.parsed_events.summary.defense != null && <Badge variant="secondary">{d.parsed_events.summary.defense} defense drafts</Badge>}
                  {d.parsed_events.summary.baserun != null && <Badge variant="secondary">{d.parsed_events.summary.baserun} baserunning drafts</Badge>}
                </div>
              )}
              {d.parse_status === "ready" && <DocumentReview raw={d.parsed_events?.raw} busy={confirming === d.id} onConfirm={selection => confirm(d.id, selection)} />}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
