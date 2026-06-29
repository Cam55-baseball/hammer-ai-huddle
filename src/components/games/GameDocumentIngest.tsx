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
import { useQueryClient } from "@tanstack/react-query";

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
  const [docs, setDocs] = useState<Array<{ path: string; name: string; summary?: DraftSummary; error?: string }>>([]);

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
        source: "upload",
        file_url: `${GP_DOC_BUCKET}://${path}`,
        file_mime: file.type || null,
        parse_status: "uploaded",
      }).select("id").single();
      if (docRow.error) throw docRow.error;

      setDocs((d) => [...d, { path, name: file.name }]);

      // 45s safety: edge function uses Gemini and may take ~10–30s on big files
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 45_000);
      const { data, error } = await supabase.functions.invoke("gp-ingest-document", {
        body: { documentId: docRow.data!.id, gameId, sport, bucket: GP_DOC_BUCKET, path },
      });
      clearTimeout(timer);
      if (error) throw error;

      const summary: DraftSummary = data?.summary ?? {};
      setDocs((d) => d.map((x) => (x.path === path ? { ...x, summary } : x)));
      qc.invalidateQueries({ queryKey: ["gp-at-bats", gameId] });
      qc.invalidateQueries({ queryKey: ["gp-pitches", gameId] });
      qc.invalidateQueries({ queryKey: ["gp-defense", gameId] });
      qc.invalidateQueries({ queryKey: ["gp-baserun", gameId] });
      toast.success("Draft extracted — review each tab to confirm.");
    } catch (e: any) {
      const msg = e?.message ?? "Ingest failed";
      setDocs((d) => d.map((x) => (x.path === path ? { ...x, error: msg } : x)));
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
          <p className="font-medium">AI document import</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Scorebook photo · TrackMan PDF/CSV · GameChanger export · Rapsodo CSV. Gemini
          drafts at-bats / pitches / defense — you confirm by inning. Nothing is auto-final.
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
        {docs.map((d) => (
          <Card key={d.path} className="p-3 flex items-start gap-2">
            {d.error ? (
              <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5" />
            ) : d.summary ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{d.name}</p>
              {d.error && <p className="text-xs text-rose-600">{d.error}</p>}
              {d.summary && (
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {d.summary.atBats != null && <Badge variant="secondary">{d.summary.atBats} AB draft</Badge>}
                  {d.summary.pitches != null && <Badge variant="secondary">{d.summary.pitches} pitches</Badge>}
                  {d.summary.defense != null && <Badge variant="secondary">{d.summary.defense} defense</Badge>}
                  {d.summary.baserun != null && <Badge variant="secondary">{d.summary.baserun} baserun</Badge>}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
