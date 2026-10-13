// Plan 4 GUEST MODE — a coach analyzes a player with no account. Nothing is saved:
// the video stays on this phone, the result lives only on this screen until it is closed.
import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Result = { score: number | null; strengths: string[]; fixes: string[]; drills: string[] };

async function framesFromVideo(file: File, count = 7): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement("video");
    v.src = url; v.muted = true; v.playsInline = true;
    await new Promise<void>((res, rej) => { v.onloadedmetadata = () => res(); v.onerror = () => rej(new Error("read")); });
    const c = document.createElement("canvas");
    const scale = Math.min(1, 640 / (v.videoWidth || 640));
    c.width = Math.round((v.videoWidth || 640) * scale); c.height = Math.round((v.videoHeight || 360) * scale);
    const ctx = c.getContext("2d")!;
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      v.currentTime = (v.duration * (i + 0.5)) / count;
      await new Promise<void>((res) => { v.onseeked = () => res(); });
      ctx.drawImage(v, 0, 0, c.width, c.height);
      out.push(c.toDataURL("image/jpeg", 0.7));
    }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const Choice = ({ value, set, options }: { value: string; set: (v: string) => void; options: string[] }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => (
      <Button key={o} type="button" size="sm" variant={value === o ? "default" : "outline"} onClick={() => set(o)} className="first-letter:uppercase">{o}</Button>
    ))}
  </div>
);

export default function CoachGuestMode() {
  const [sport, setSport] = useState("baseball");
  const [module, setModule] = useState("hitting");
  const [age, setAge] = useState<"" | "13 or older" | "Under 13">("");
  const [permission, setPermission] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const under13 = age === "Under 13";
  const ready = !!file && !!age && (!under13 || permission) && !busy;

  const run = async () => {
    if (!file) return;
    setBusy(true); setResult(null);
    try {
      const frames = await framesFromVideo(file);
      const { data, error } = await supabase.functions.invoke("analyze-guest", {
        body: { sport, module, frames, under13, parentPermissionConfirmed: under13 ? permission : undefined },
      });
      if (error) {
        const body = await (error as any).context?.json?.().catch(() => null);
        toast.error(body?.error ?? "The analysis couldn't run. Nothing was saved.");
      } else setResult(data.result);
    } catch {
      toast.error("That video couldn't be read on this phone. Nothing was saved.");
    } finally { setBusy(false); }
  };

  const invite = async () => {
    const text = `Your coach ran a Hammers analysis for you. Join Hammers to save results like this: ${window.location.origin}/auth`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); toast.success("Invite copied. Send it to the player or parent."); }
    } catch { /* closed share sheet */ }
  };

  const clear = () => { setResult(null); setFile(null); setAge(""); setPermission(false); };

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <div>
        <Link to="/coach-dashboard" className="text-sm text-muted-foreground">← Coach dashboard</Link>
        <h1 className="mt-2 text-2xl font-bold">Guest analysis</h1>
        <p className="text-sm text-muted-foreground">For a player without a Hammers account. Nothing is saved — not the video, not the result. It shows only on this screen.</p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2"><Label>Sport</Label><Choice value={sport} set={setSport} options={["baseball", "softball"]} /></div>
          <div className="space-y-2"><Label>What the video shows</Label><Choice value={module} set={setModule} options={["hitting", "pitching", "throwing"]} /></div>
          <div className="space-y-2"><Label>Player's age</Label><Choice value={age} set={(v) => { setAge(v as any); setPermission(false); }} options={["13 or older", "Under 13"]} /></div>
          {under13 && (
            <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
              <Checkbox checked={permission} onCheckedChange={(v) => setPermission(v === true)} aria-label="Parent gave permission" />
              <span>A parent or guardian of this player gave permission for this analysis.</span>
            </label>
          )}
          <div className="space-y-2">
            <Label htmlFor="guest-video">Video (one rep)</Label>
            <input id="guest-video" type="file" accept="video/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
          </div>
          <Button className="w-full" disabled={!ready} onClick={run}>{busy ? "Analyzing…" : "Analyze (nothing is saved)"}</Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader><CardTitle>Guest result — not saved</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><span className="font-semibold">Form score (0–100):</span> {result.score ?? "Not enough data"}</p>
            {([["What's working", result.strengths], ["What to fix", result.fixes], ["Drills to try", result.drills]] as const).map(([label, items]) => (
              <div key={label}>
                <p className="font-semibold">{label}</p>
                {items.length ? <ul className="list-disc pl-5">{items.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="text-muted-foreground">Not enough data</p>}
              </div>
            ))}
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={invite}>Invite to Hammers to save this</Button>
              <Button variant="outline" onClick={clear}>Clear and start over</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
