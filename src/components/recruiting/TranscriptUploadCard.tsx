import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Row = { id: string; status: string; uploaded_at: string; reviewed_at: string | null };

const STATUS_LABEL: Record<string, string> = {
  pending: "Status: waiting for review",
  verified: "Status: verified",
  rejected: "Status: not accepted — upload a clearer copy",
};

/** Player uploads a school transcript so their grades can be checked. Private: only the player and app staff can open it. */
export function TranscriptUploadCard({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("academic_transcripts")
      .select("id,status,uploaded_at,reviewed_at")
      .eq("athlete_id", userId)
      .order("uploaded_at", { ascending: false })
      .limit(3);
    setRows((data as Row[]) ?? []);
  };
  useEffect(() => { void load(); }, [userId]);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const ext = (f.name.split(".").pop() || "pdf").toLowerCase();
      const path = `${userId}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("transcripts").upload(path, f);
      if (up.error) throw up.error;
      const ins = await supabase.from("academic_transcripts").insert({ athlete_id: userId, file_path: path });
      if (ins.error) throw ins.error;
      toast({ title: "Transcript sent", description: "We'll check it and mark your grades verified." });
      await load();
    } catch {
      toast({ title: "Upload didn't work", description: "Try again with a PDF or photo under 10 MB.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card data-testid="transcript-upload-card">
      <CardHeader className="pb-2"><CardTitle className="text-base">School transcript</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">Your grades show as "you entered this" until a transcript is checked. Only you and app staff can open the file.</p>
        <label className="inline-block">
          <input type="file" accept="application/pdf,image/*" className="hidden" disabled={busy}
            onChange={(e) => onFile(e.target.files?.[0])} aria-label="Upload transcript" />
          <Button asChild variant="outline" disabled={busy}><span>{busy ? "Uploading…" : "Upload transcript"}</span></Button>
        </label>
        {rows.map((r) => (
          <p key={r.id} className="text-xs">
            Uploaded {new Date(r.uploaded_at).toLocaleDateString()} · {STATUS_LABEL[r.status] ?? r.status}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
