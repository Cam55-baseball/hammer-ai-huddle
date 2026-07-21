/**
 * IqSituationsAuthoring — owner-facing end-to-end situation builder.
 *
 * Author a full Game IQ situation without touching SQL:
 *   metadata → base alignment → per-defender routes + cues → ball track
 *   → concept tags + rung → live preview → save as draft.
 *
 * Waypoints are placed by selecting a role, then clicking on the field.
 * Preview uses the same `IqDiamond` playback the athlete sees.
 */
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Undo2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAlignmentPresets, type FieldSport } from "@/hooks/useDefensiveAlignment";
import { IqDiamond } from "@/components/iq/IqDiamond";
import { IqPlaybackControls } from "@/components/iq/IqPlaybackControls";
import { IqDefenderPositionEditor } from "@/components/iq/authoring/IqDefenderPositionEditor";
import { IqBallTrackEditor } from "@/components/iq/authoring/IqBallTrackEditor";
import { IqActorCueForm } from "@/components/iq/authoring/IqActorCueForm";
import { emptyActor, type DraftActor } from "@/components/iq/authoring/types";
import {
  DEFENSIVE_ROLES, type IqActor, type IqActorRole,
  type IqLens, type IqScenario, type IqSport,
} from "@/lib/iq/types";

const LENSES: IqLens[] = ["defense", "offense", "pitching", "baserunning"];


export default function IqSituationsAuthoring() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();

  // Metadata
  const [sport, setSport] = useState<IqSport>("baseball");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [debrief, setDebrief] = useState("");
  const [difficulty, setDifficulty] = useState<"intro"|"core"|"advanced"|"elite">("core");
  const [difficultyRung, setDifficultyRung] = useState(1);
  const [canonicalOrder, setCanonicalOrder] = useState(999);
  const [alignmentPreset, setAlignmentPreset] = useState<string>("");
  const [lensTags, setLensTags] = useState<IqLens[]>(["defense"]);
  const [conceptIds, setConceptIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [explanation, setExplanation] = useState("");
  const [batterSide, setBatterSide] = useState<"R" | "L">("R");

  // Actors
  const [actors, setActors] = useState<Record<IqActorRole, DraftActor>>(() => {
    const m = {} as Record<IqActorRole, DraftActor>;
    DEFENSIVE_ROLES.forEach((r) => { m[r] = emptyActor(r); });
    return m;
  });
  const [ballTrack, setBallTrack] = useState<{ x: number; y: number; t?: number }[]>([]);

  // Editor state
  const [editing, setEditing] = useState<IqActorRole | "ball" | null>("ball");

  // Preview clock
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);

  const presetsQ = useAlignmentPresets(sport === "both" ? "baseball" : (sport as FieldSport));
  const conceptsQ = useQuery({
    queryKey: ["iq-concept-tags", sport],
    queryFn: async () => {
      const filter = sport === "both" ? ["baseball", "softball", "both"] : [sport, "both"];
      const { data } = await supabase.from("iq_concept_tags").select("*").in("sport", filter);
      return (data ?? []) as { id: string; label: string; sport: string }[];
    },
  });

  const defensivePositions = useMemo(() => {
    const p = (presetsQ.data ?? []).find((x) => x.id === alignmentPreset || (!alignmentPreset && x.is_default));
    return p?.positions ?? undefined;
  }, [presetsQ.data, alignmentPreset]);

  // Click-to-place waypoint on the diamond overlay.
  const overlayRef = useRef<HTMLDivElement>(null);
  const handleFieldClick = (e: React.MouseEvent) => {
    if (!editing) return;
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    if (editing === "ball") {
      setBallTrack((prev) => [...prev, { x: +x.toFixed(1), y: +y.toFixed(1) }]);
    } else {
      setActors((prev) => ({
        ...prev,
        [editing]: {
          ...prev[editing],
          primary_path: [...prev[editing].primary_path, { x: +x.toFixed(1), y: +y.toFixed(1) }],
        },
      }));
    }
  };

  const undoLastWaypoint = () => {
    if (!editing) return;
    if (editing === "ball") setBallTrack((p) => p.slice(0, -1));
    else setActors((prev) => ({
      ...prev,
      [editing]: { ...prev[editing], primary_path: prev[editing].primary_path.slice(0, -1) },
    }));
  };

  // Preview scenario shape (feeds IqDiamond).
  const previewScenario: IqScenario = useMemo(() => ({
    id: "preview",
    situation_id: "preview",
    variant_id: null,
    sport,
    prompt: prompt || "Preview",
    position_focus: "",
    correct_actor_assignments: {},
    distractors: [],
    explanation: "",
    alignment_preset: alignmentPreset || null,
    // ball_track lives on the row but IqDiamond reads via `scenario`
    ...(ballTrack.length ? { ball_track: ballTrack } as never : {}),
  }), [sport, prompt, alignmentPreset, ballTrack]);

  const previewActors: IqActor[] = useMemo(
    () => DEFENSIVE_ROLES.map((r) => ({
      id: r, situation_id: "preview", ...actors[r],
    } as unknown as IqActor)),
    [actors],
  );

  const validate = (): string | null => {
    if (!slug.trim()) return "Slug required";
    if (!title.trim()) return "Title required";
    if (!prompt.trim()) return "Quiz prompt required";
    if (!lensTags.length) return "Pick at least one lens";
    return null;
  };

  const saveMut = useMutation({
    mutationFn: async (publish: boolean) => {
      const err = validate();
      if (err) throw new Error(err);

      const { data: sit, error: sErr } = await supabase
        .from("iq_situations")
        .insert({
          sport, slug: slug.trim(), title: title.trim(), summary,
          lens_tags: lensTags, difficulty,
          canonical_order: canonicalOrder,
          status: publish ? "published" : "draft",
          triple_check_count: 0,
          sources: [{ label: "Owner-authored", ref: "in-app" }],
          alignment_preset: alignmentPreset || null,
          difficulty_rung: difficultyRung,
          debrief: debrief || null,
        } as never)
        .select("id")
        .single();
      if (sErr) throw sErr;
      const sitId = (sit as { id: string }).id;

      const actorRows = DEFENSIVE_ROLES.map((r) => {
        const a = actors[r];
        return {
          situation_id: sitId,
          role: a.role, assignment: a.assignment,
          primary_path: a.primary_path,
          secondary_read: a.secondary_read,
          communication_call: a.communication_call,
          coaching_note: a.coaching_note,
          common_mistake: a.common_mistake,
          elite_cue: a.elite_cue,
          footwork_cue: a.footwork_cue || null,
          eyes_target: a.eyes_target || null,
        };
      });
      const { error: aErr } = await supabase
        .from("iq_situation_actors").insert(actorRows as never);
      if (aErr) throw aErr;

      const { error: scErr } = await supabase
        .from("iq_scenarios").insert({
          situation_id: sitId, sport, prompt,
          position_focus: "",
          correct_actor_assignments: Object.fromEntries(
            DEFENSIVE_ROLES.map((r) => [r, actors[r].assignment]),
          ) as never,
          distractors: [] as never,
          explanation,
          alignment_preset: alignmentPreset || null,
          ball_track: ballTrack as never,
        } as never);
      if (scErr) throw scErr;

      if (conceptIds.length) {
        const { error: cErr } = await supabase
          .from("iq_situation_concepts")
          .insert(conceptIds.map((cid) => ({ situation_id: sitId, concept_id: cid })) as never);
        if (cErr) throw cErr;
      }

      return sitId;
    },
    onSuccess: (_id, publish) => {
      toast({ title: publish ? "Published" : "Saved as draft" });
      qc.invalidateQueries({ queryKey: ["iq-situations"] });
      qc.invalidateQueries({ queryKey: ["iq-concept-ladder"] });
      navigate("/iq");
    },
    onError: (e: unknown) => toast({
      title: "Save failed",
      description: e instanceof Error ? e.message : "Unknown error",
      variant: "destructive",
    }),
  });

  // RAF loop for preview playback
  const rafRef = useRef<number | null>(null);
  const startPreview = () => {
    if (playing) { setPlaying(false); return; }
    setProgress(0); setPlaying(true);
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      setProgress((p) => {
        const n = p + (dt / 3.2) * speed;
        if (n >= 1) { setPlaying(false); return 1; }
        return n;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  if (ownerLoading) return <DashboardLayout><div className="p-8">Loading…</div></DashboardLayout>;
  if (!isOwner) return (
    <DashboardLayout>
      <div className="p-8 text-center text-muted-foreground">Owner access required.</div>
    </DashboardLayout>
  );

  const cur = editing && editing !== "ball" ? actors[editing] : null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <Button variant="ghost" onClick={() => navigate("/iq")} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Game IQ
        </Button>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">Author a situation</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline"
                    onClick={() => saveMut.mutate(false)} disabled={saveMut.isPending}>
              <Save className="h-4 w-4 mr-1" /> Save draft
            </Button>
            <Button size="sm" onClick={() => saveMut.mutate(true)} disabled={saveMut.isPending}>
              <Save className="h-4 w-4 mr-1" /> Publish
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* LEFT: Field preview */}
          <div className="space-y-3">
            <Card className="p-3 space-y-2">
              <div className="relative" ref={overlayRef} onClick={handleFieldClick} style={{ cursor: editing ? "crosshair" : "default" }}>
                <IqDiamond
                  actors={previewActors}
                  mode="reveal"
                  defensivePositions={defensivePositions}
                  sport={sport === "both" ? "baseball" : (sport as FieldSport)}
                  batterSide={batterSide}
                  playing={playing}
                  progress={playing || progress > 0 ? progress : undefined}
                  scenario={previewScenario}
                  overlay="all"
                  highlightRole={editing && editing !== "ball" ? editing : null}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-muted-foreground">Placing waypoints for:</span>
                <Badge variant="secondary">
                  {editing === "ball" ? "Ball track" : editing ?? "—"}
                </Badge>
                <Button size="sm" variant="ghost" onClick={undoLastWaypoint} disabled={!editing}>
                  <Undo2 className="h-3.5 w-3.5 mr-1" /> Undo waypoint
                </Button>
              </div>
              <IqPlaybackControls
                playing={playing} progress={progress} speed={speed}
                onTogglePlay={startPreview}
                onScrub={(t) => { setPlaying(false); setProgress(t); }}
                onSetSpeed={setSpeed}
                onRestart={() => { setProgress(0); startPreview(); }}
              />
            </Card>

            <IqDefenderPositionEditor editing={editing} onChange={setEditing} />

          </div>

          {/* RIGHT: Metadata + per-role cues */}
          <div className="space-y-3">
            <Card className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Sport</Label>
                  <Select value={sport} onValueChange={(v) => setSport(v as IqSport)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baseball">Baseball</SelectItem>
                      <SelectItem value="softball">Softball</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Batter side (preview)</Label>
                  <Select value={batterSide} onValueChange={(v) => setBatterSide(v as "R"|"L")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="R">RHH</SelectItem>
                      <SelectItem value="L">LHH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Slug</Label>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. r2-no-outs-bunt" />
                </div>
                <div>
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Runner on 2B · Bunt" />
                </div>
              </div>
              <div>
                <Label>Summary</Label>
                <Textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Difficulty</Label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as never)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intro">Intro</SelectItem>
                      <SelectItem value="core">Core</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="elite">Elite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rung (1–5)</Label>
                  <Input type="number" min={1} max={5} value={difficultyRung}
                         onChange={(e) => setDifficultyRung(Math.max(1, Math.min(5, +e.target.value || 1)))} />
                </div>
                <div>
                  <Label>Order</Label>
                  <Input type="number" value={canonicalOrder}
                         onChange={(e) => setCanonicalOrder(+e.target.value || 999)} />
                </div>
              </div>
              <div>
                <Label>Lens tags</Label>
                <div className="flex flex-wrap gap-1">
                  {LENSES.map((l) => {
                    const on = lensTags.includes(l);
                    return (
                      <Button key={l} size="sm" variant={on ? "default" : "outline"}
                              onClick={() => setLensTags((p) => on ? p.filter((x) => x !== l) : [...p, l])}>
                        {l}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>Base alignment</Label>
                <Select value={alignmentPreset} onValueChange={setAlignmentPreset}>
                  <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                  <SelectContent>
                    {(presetsQ.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.preset_key}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Concept tags</Label>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-auto">
                  {(conceptsQ.data ?? []).map((c) => {
                    const on = conceptIds.includes(c.id);
                    return (
                      <Button key={c.id} size="sm" variant={on ? "default" : "outline"}
                              onClick={() => setConceptIds((p) => on ? p.filter((x) => x !== c.id) : [...p, c.id])}>
                        {c.label}
                      </Button>
                    );
                  })}
                  {!conceptsQ.data?.length && (
                    <span className="text-xs text-muted-foreground">No concept tags seeded yet.</span>
                  )}
                </div>
              </div>
              <div>
                <Label>Quiz prompt</Label>
                <Textarea rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)}
                          placeholder="Where do you go and what's your job?" />
              </div>
              <div>
                <Label>Explanation (reveal)</Label>
                <Textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
              </div>
              <div>
                <Label>Debrief (post-play summary)</Label>
                <Textarea rows={3} value={debrief} onChange={(e) => setDebrief(e.target.value)}
                          placeholder="Concept recap + one next-rung prompt…" />
              </div>
            </Card>

            {/* Per-role cues */}
            {cur && (
              <Card className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{ROLE_LABELS[cur.role]} ({cur.role})</h3>
                  <Badge variant="outline">{cur.primary_path.length} waypoints</Badge>
                </div>
                <div>
                  <Label>Assignment</Label>
                  <Select value={cur.assignment} onValueChange={(v) => setActors((p) => ({
                    ...p, [cur.role]: { ...p[cur.role], assignment: v as IqAssignment },
                  }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSIGNMENTS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {(["footwork_cue", "communication_call", "coaching_note", "common_mistake", "elite_cue", "secondary_read", "eyes_target"] as const).map((k) => (
                  <div key={k}>
                    <Label className="capitalize">{k.replace(/_/g, " ")}</Label>
                    <Input value={cur[k]} onChange={(e) => setActors((p) => ({
                      ...p, [cur.role]: { ...p[cur.role], [k]: e.target.value },
                    }))} />
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setActors((p) => ({
                  ...p, [cur.role]: { ...p[cur.role], primary_path: [] },
                }))}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear waypoints
                </Button>
              </Card>
            )}

            {editing === "ball" && (
              <Card className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">Ball track</h3>
                  <Badge variant="outline">{ballTrack.length} points</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Click the field to add each ball position in order. The playback
                  clock spaces them evenly.
                </p>
                <Button size="sm" variant="outline" onClick={() => setBallTrack([])}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear track
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
