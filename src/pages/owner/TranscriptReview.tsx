import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type Row = { id: string; athlete_id: string; file_path: string; status: string; uploaded_at: string };

/** Owner/admin queue: open each transcript, then mark it verified or not accepted. */
export default function TranscriptReview() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase
      .from("academic_transcripts")
      .select("id,athlete_id,file_path,status,uploaded_at")
      .eq("status", "pending")
      .order("uploaded_at");
    const list = (data as Row[]) ?? [];
    setRows(list);
    if (list.length) {
      const { data: ps } = await supabase.from("profiles").select("id,first_name,last_name")
        .in("id", [...new Set(list.map((r) => r.athlete_id))]);
      setNames(Object.fromEntries((ps ?? []).map((p: any) => [p.id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()])));
    }
  };
  useEffect(() => { void load(); }, []);

  const open = async (path: string) => {
    const { data, error } = await supabase.storage.from("transcripts").createSignedUrl(path, 60);
    if (error || !data) return toast({ title: "Couldn't open the file", variant: "destructive" });
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const decide = async (id: string, status: "verified" | "rejected") => {
    const { error } = await supabase.from("academic_transcripts")
      .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast({ title: "Not saved", variant: "destructive" });
    toast({ title: status === "verified" ? "Marked verified" : "Marked not accepted" });
    void load();
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Card data-testid="transcript-review">
          <CardHeader><CardTitle>Transcripts waiting for review</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {rows.length === 0 && <p className="text-muted-foreground">Nothing waiting.</p>}
            {rows.map((r) => (
              <div key={r.id} className="rounded border p-3 space-y-2">
                <p>Player: {names[r.athlete_id] || "Name not set"} · Uploaded {new Date(r.uploaded_at).toLocaleDateString()}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => open(r.file_path)}>Open file</Button>
                  <Button size="sm" onClick={() => decide(r.id, "verified")}>Verified</Button>
                  <Button size="sm" variant="destructive" onClick={() => decide(r.id, "rejected")}>Not accepted</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
