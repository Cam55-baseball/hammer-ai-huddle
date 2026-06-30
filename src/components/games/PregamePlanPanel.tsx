/**
 * PregamePlanPanel — the elite plan workspace inside a pitcher or hitter dossier.
 *
 * Pieces:
 *  - Intake row: paste notes / upload Trackman screenshot / CSV / PDF → AI fills tendencies.
 *  - Video shelf: upload clips, list signed urls (clicking opens in new tab).
 *  - Generate plan: calls gp-pregame-plan, shows headline / vibe / cues / triggers.
 *  - Plan history: past plans for this dossier, rateable, re-openable.
 *
 * Reads/writes everything through hooks in usePregamePlan.ts so the wire
 * format lives in one place.
 */
import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles, Upload, FileText, Video, Star, Play, RefreshCw, Brain,
} from "lucide-react";
import {
  usePregamePlans,
  useIngestDossierAsset,
  useUploadDossierVideos,
} from "@/hooks/usePregamePlan";
import { supabase } from "@/integrations/supabase/client";
import { GP_DOSSIER_VIDEO_BUCKET } from "@/lib/games/ledger";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

interface Props {
  role: "pitcher" | "hitter";
  dossierId: string | null;
  sport: string;
  archetype?: string | null;
  videoUrls?: string[] | null;
  gameId?: string | null;
}

export function PregamePlanPanel({ role, dossierId, sport, archetype, videoUrls, gameId }: Props) {
  const [notes, setNotes] = useState("");
  const [userContext, setUserContext] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const { list, generate, rate } = usePregamePlans({ role, dossierId });
  const ingest = useIngestDossierAsset();
  const uploadVideos = useUploadDossierVideos();

  if (!dossierId) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Save this dossier first — then upload Trackman, notes, or video and Hammer will
        write you an elite plan.
      </Card>
    );
  }

  const handleIngestNotes = async () => {
    if (!notes.trim()) return;
    await ingest.mutateAsync({ dossierId, role, sport, text: notes });
    setNotes("");
  };
  const handleIngestFile = async (file: File) => {
    await ingest.mutateAsync({ dossierId, role, sport, file });
  };
  const handleUploadVideos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await uploadVideos.mutateAsync({ dossierId, role, files: Array.from(files) });
  };
  const handleGenerate = () => {
    generate.mutate({
      sport,
      gameId: gameId ?? undefined,
      userContext: userContext ? { notes: userContext } : {},
    });
  };

  return (
    <div className="space-y-4">
      {/* Archetype badge */}
      <Card className="p-3 flex items-center justify-between gap-3">
        <div className="text-xs">
          <div className="uppercase tracking-wide text-muted-foreground">Archetype</div>
          <div className="font-semibold">{archetype ?? "Not detected yet"}</div>
        </div>
        <Badge variant="outline" className="text-[10px]">{sport}</Badge>
      </Card>

      {/* 1. INTAKE */}
      <Card className="p-3 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Brain className="h-4 w-4 text-primary" /> Intake
        </div>
        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Paste notes (scout report, conversation, prior at-bats…)
        </Label>
        <Textarea
          rows={3}
          placeholder={role === "pitcher"
            ? "e.g. RHP, 6'2\", high slot, 92-94 with ride, sweeper 82-84 glove side, throws first-pitch strike 70%…"
            : "e.g. RHB, free swinger, crushes middle-in fastball, chases sliders away…"}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleIngestNotes} disabled={!notes.trim() || ingest.isPending} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            {ingest.isPending ? "Analyzing…" : "Analyze notes"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="gap-1.5">
            <Upload className="h-3.5 w-3.5" /> Upload Trackman / CSV / PDF
          </Button>
          <input
            ref={fileRef} type="file"
            accept="image/*,application/pdf,.csv,.txt,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await handleIngestFile(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
        </div>
      </Card>

      {/* 2. VIDEO SHELF */}
      <Card className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Video className="h-4 w-4 text-primary" /> Video clips
          </div>
          <Button size="sm" variant="outline" onClick={() => videoRef.current?.click()} className="gap-1.5">
            <Upload className="h-3.5 w-3.5" /> Add clip
          </Button>
          <input
            ref={videoRef} type="file" accept="video/*" multiple className="hidden"
            onChange={async (e) => {
              await handleUploadVideos(e.target.files);
              if (videoRef.current) videoRef.current.value = "";
            }}
          />
        </div>
        {(!videoUrls || videoUrls.length === 0) ? (
          <p className="text-xs text-muted-foreground">No clips yet. Upload bullpen, in-game, or stadium video.</p>
        ) : (
          <ul className="space-y-1.5">
            {videoUrls.map((p, i) => (
              <VideoRow key={p} path={p} idx={i} />
            ))}
          </ul>
        )}
      </Card>

      {/* 3. PLAN GENERATOR */}
      <Card className="p-3 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          {role === "pitcher" ? "Personal hitting plan" : "Personal pitching plan"}
        </div>
        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
          How are you feeling? (optional — Hammer reads form into the plan)
        </Label>
        <Textarea
          rows={2}
          placeholder="e.g. timing felt late last game, hitting late on FB; or, command was sharp in bullpen…"
          value={userContext}
          onChange={(e) => setUserContext(e.target.value)}
        />
        <Button onClick={handleGenerate} disabled={generate.isPending} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${generate.isPending ? "animate-spin" : ""}`} />
          {generate.isPending ? "Writing your plan…" : "Generate elite plan"}
        </Button>

        {generate.data && (
          <PlanView plan_json={generate.data.plan_json} markdown={generate.data.plan_markdown} />
        )}
      </Card>

      {/* 4. HISTORY */}
      {(list.data?.length ?? 0) > 0 && (
        <Card className="p-3 space-y-3">
          <div className="text-sm font-semibold">Plan history</div>
          <ul className="space-y-3">
            {list.data!.map((p) => (
              <li key={p.id} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{format(parseISO(p.created_at), "MMM d, yyyy · h:mm a")}</span>
                  <RatingStars
                    value={p.user_rating ?? 0}
                    onChange={(v) => rate.mutate({ id: p.id, rating: v })}
                  />
                </div>
                <PlanView plan_json={p.plan_json} markdown={p.plan_markdown ?? ""} compact />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function PlanView({ plan_json, markdown, compact = false }: { plan_json: any; markdown: string; compact?: boolean }) {
  if (!plan_json) return <pre className="text-xs whitespace-pre-wrap">{markdown}</pre>;
  return (
    <div className="space-y-2 text-sm">
      {plan_json.headline && <div className="font-semibold">{plan_json.headline}</div>}
      {plan_json.vibe && <p className="text-muted-foreground">{plan_json.vibe}</p>}
      {Array.isArray(plan_json.cues) && plan_json.cues.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Cues</div>
          {plan_json.cues.map((c: any, i: number) => (
            <div key={i} className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] mt-0.5">{c.tag ?? "cue"}</Badge>
              <span>{c.text}</span>
            </div>
          ))}
        </div>
      )}
      {Array.isArray(plan_json.in_game_triggers) && plan_json.in_game_triggers.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">In-game triggers</div>
          {plan_json.in_game_triggers.map((t: any, i: number) => (
            <div key={i} className="text-xs">
              <span className="font-medium">If</span> {t.if} → <span className="font-medium">then</span> {t.then}
            </div>
          ))}
        </div>
      )}
      {Array.isArray(plan_json.mental_anchors) && plan_json.mental_anchors.length > 0 && !compact && (
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Mental anchors</div>
          {plan_json.mental_anchors.map((m: string, i: number) => (
            <div key={i} className="text-xs italic">"{m}"</div>
          ))}
        </div>
      )}
      {plan_json.matchup_grade && (
        <div className="flex gap-2 pt-1">
          <Badge variant="outline" className="text-[10px]">Matchup: {plan_json.matchup_grade}</Badge>
          {plan_json.confidence && (
            <Badge variant="outline" className="text-[10px]">Confidence: {plan_json.confidence}</Badge>
          )}
        </div>
      )}
    </div>
  );
}

function VideoRow({ path, idx }: { path: string; idx: number }) {
  const open = async () => {
    const { data, error } = await supabase.storage
      .from(GP_DOSSIER_VIDEO_BUCKET)
      .createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) {
      toast.error("Could not open video");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const name = path.split("/").pop() ?? `Clip ${idx + 1}`;
  return (
    <li className="flex items-center justify-between gap-2 text-xs">
      <span className="truncate">{name}</span>
      <Button size="sm" variant="ghost" onClick={open} className="h-7 gap-1">
        <Play className="h-3 w-3" /> Open
      </Button>
    </li>
  );
}

function RatingStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} className="leading-none">
          <Star className={`h-3.5 w-3.5 ${n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}
