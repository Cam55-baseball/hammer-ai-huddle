/**
 * AbSwingPanel — per at-bat swing video analysis.
 *
 * - Lists existing swing analyses for this AB.
 * - Lets the user upload a clip + optional thoughts and runs gp-analyze-ab-swing.
 *   The analysis is automatically tagged with the pitcher dossier on the AB,
 *   so the AI grades the swing inside the actual matchup context.
 */
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, Video, Sparkles } from "lucide-react";
import { gp } from "@/lib/games/ledger";
import { useAuth } from "@/hooks/useAuth";
import { useAnalyzeAtBatSwing } from "@/hooks/usePregamePlan";

export function AbSwingPanel({
  abId, gameId, dossierId,
}: { abId: string; gameId: string; dossierId?: string | null }) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [thoughts, setThoughts] = useState("");
  const [pending, setPending] = useState(false);
  const analyze = useAnalyzeAtBatSwing();

  const list = useQuery({
    queryKey: ["gp-ab-swing-analyses", abId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await gp("gp_ab_swing_analyses")
        .select("*").eq("ab_id", abId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const handleFile = async (file: File) => {
    setPending(true);
    try {
      await analyze.mutateAsync({
        abId,
        gameId,
        dossierId: dossierId ?? undefined,
        file,
        userThoughts: thoughts,
      });
      setThoughts("");
      list.refetch();
    } finally { setPending(false); }
  };

  return (
    <div className="space-y-3 mt-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold flex items-center gap-1.5">
          <Video className="h-3.5 w-3.5 text-primary" /> Swing video analysis
        </div>
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="h-7 gap-1.5">
          <Upload className="h-3 w-3" /> Upload clip
        </Button>
        <input
          ref={fileRef} type="file" accept="video/*" className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await handleFile(f);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
      </div>
      <Textarea
        rows={2} placeholder="Your thoughts on this AB (optional — helps Hammer tune the read)"
        value={thoughts} onChange={(e) => setThoughts(e.target.value)}
        className="text-xs"
      />
      {pending && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Sparkles className="h-3 w-3 animate-pulse" /> Analyzing swing in matchup context…</p>}

      {(list.data ?? []).map((a) => (
        <Card key={a.id} className="p-3 space-y-2 text-xs">
          {a.summary && <p>{a.summary}</p>}
          {a.cues?.length > 0 && (
            <div className="space-y-1">
              <div className="uppercase text-[10px] text-muted-foreground tracking-wide">Cues</div>
              {a.cues.map((c: string, i: number) => <div key={i}>• {c}</div>)}
            </div>
          )}
          {a.drills?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {a.drills.map((d: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px]">{d}</Badge>
              ))}
            </div>
          )}
          {a.video_url && (
            <a href={a.video_url} target="_blank" rel="noreferrer" className="text-primary underline">
              Open clip
            </a>
          )}
        </Card>
      ))}
    </div>
  );
}
