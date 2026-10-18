import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { validVideoTagTime } from "@/lib/intelligence/videoTag";

export function AtBatVideoTag({ abId, gameId }: { abId: string; gameId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [videoId, setVideoId] = useState("");
  const [seconds, setSeconds] = useState("0");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const clips = useQuery({
    queryKey: ["at-bat-tag-clips", user?.id], enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("videos").select("id,module,created_at,duration_sec,library_title").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  const selected = clips.data?.find((clip) => clip.id === videoId);
  const save = async () => {
    if (!selected || seconds.trim() === "" || !validVideoTagTime(Number(seconds), selected.duration_sec)) {
      setMessage("Choose a clip and a time within it."); return;
    }
    setSaving(true); setMessage(null);
    try {
      const { error } = await supabase.rpc("tag_at_bat_video", { _ab: abId, _video: videoId, _seconds: Number(seconds) });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["gp-ab", gameId] });
      setMessage("Saved: Video-tagged.");
    } catch { setMessage("Couldn't tag this at-bat. Check the clip and time, then try again."); }
    finally { setSaving(false); }
  };
  return <section className="space-y-3 border-t pt-3" aria-label="Tag from a video">
    <h4 className="text-sm font-semibold">Tag from a video</h4>
    {clips.error ? <p role="alert" className="text-sm text-destructive">Couldn't load your clips.</p> : <>
      <Label htmlFor={`tag-clip-${abId}`}>Your saved clip</Label>
      <Select value={videoId} onValueChange={setVideoId}>
        <SelectTrigger id={`tag-clip-${abId}`}><SelectValue placeholder={clips.isPending ? "Loading clips…" : "Choose a clip"} /></SelectTrigger>
        <SelectContent>{clips.data?.map((clip) => <SelectItem key={clip.id} value={clip.id}>{clip.library_title || `${clip.module} clip`} · {new Date(clip.created_at).toLocaleDateString()}</SelectItem>)}</SelectContent>
      </Select>
      {!clips.isPending && !clips.data?.length && <p className="text-sm text-muted-foreground">No saved clips yet.</p>}
      <Label htmlFor={`tag-time-${abId}`}>Clip time (seconds)</Label>
      <Input id={`tag-time-${abId}`} type="number" min="0" step="0.1" value={seconds} onChange={(e) => setSeconds(e.target.value)} />
      <Button variant="outline" disabled={saving || !selected} onClick={save}>{saving ? "Saving…" : "Save video tag"}</Button>
    </>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}