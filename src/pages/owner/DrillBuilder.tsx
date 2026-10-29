/**
 * Owner Drill Builder — create, edit and switch drills on/off for every place
 * a drill can land. Owner/admin only (route + row-level security).
 * Usage counts are "used / repeated", never "effective".
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { planReadiness, type PlanSlot } from "@/lib/prescription/ownerPlanDrills";
import { validateVideoFile } from "@/data/videoLimits";
import { VideoPlayer } from "@/components/video-library/VideoPlayer";
import { useVideoLibrary } from '@/hooks/useVideoLibrary';
import { BuilderLibraryLink } from '@/components/owner/BuilderLibraryLink';
import { DrillCmsManager } from '@/components/owner/DrillCmsManager';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ownerConditioningProblems } from '../../../supabase/functions/_shared/wic/conditioning/ownerConditioning';
import { SKILL_AREAS, ROUTINE_ROLES, BAT_SPEED_KINDS, validDrillRoleTags } from '@/lib/prescription/drillRoleTags';

const SLOT_LABEL: Record<PlanSlot, string> = {
  "hammers_today:skill": "Skill block",
  "hammers_today:warmup": "Warm-up",
  "hammers_today:defense": "Defense block",
  defensive_library: "Defensive library",
  "hammers_today:baserunning": "Baserunning block",
  "hammers_today:bunting": "Bunting (exact type and side)",
  "hammers_today:mind": "Daily Mind item",
  "hammers_today:conditioning": "Weekly running minimum (conditioning)",
};
const BUNT_TYPES = ["squeeze", "sac_3b", "sac_1b", "drag", "push", "hit"] as const;

/** At-a-glance: will this drill actually compete in each block it's filed under? */
function PlanReadiness({ row, compact = false }: { row: Omit<OwnerDrillRow, "created_at" | "id"> & { id?: string }; compact?: boolean }) {
  const items = planReadiness(row);
  if (items.length === 0) return null;
  return (
    <ul className={compact ? "mt-0.5 space-y-0.5 text-[11px]" : "space-y-1 rounded-md border p-2 text-xs"} aria-label="Hammers Today readiness">
      {!compact && <li className="font-semibold">Hammers Today readiness</li>}
      {items.map(({ slot, missing }) => (
        <li key={slot} className={missing.length || !row.active ? "text-destructive" : "text-primary"}>
          {SLOT_LABEL[slot]}: {missing.length
            ? `not served yet — needs ${missing.join(", ")}`
            : row.active ? "complete, competing" : "complete, but switched off"}
        </li>
      ))}
    </ul>
  );
}
import { Plus, Pencil, Eye } from "lucide-react";
import { ELITE_DRILL_CATALOG, type EliteDrill } from "@/data/drills/eliteDrillCatalog";
import { listDefenseCatalogForOwner } from "@/lib/hammer/prescription/defenseLibrary";
import { isAcceptedDrillVideoUrl, drillVideoFromUrl, drillVideoLabel } from "@/lib/prescription/drillVideoSource";
import { DrillVideo } from "@/components/drills/DrillVideo";
import { ANALYSIS_PLACEMENTS, OTHER_PLACEMENTS, type OwnerDrillRow } from "@/lib/prescription/ownerDrills";
import { faultKeysFor } from "../../../supabase/functions/analyze-video/constructiveCriticism";

const LEVELS = ["feel", "iso", "constraint", "transfer", "timing"] as const;

type Draft = Omit<OwnerDrillRow, "id" | "created_at"> & { id?: string };

type Preview = Pick<Draft, "name" | "setup" | "steps" | "dosage" | "cue" | "feel" | "feel_wrong" | "common_mistake" | "video_url">;

function readiness(row: Draft): string {
  if (!row.active) return "Off";
  const missing = planReadiness(row).flatMap((item) => item.missing);
  if (missing.length) return "Needs details";
  if (!row.name.trim() || row.placements.length === 0 || !row.steps.some((s) => s.trim())) return "Needs details";
  if (row.placements.some((p) => p.startsWith("analysis:")) && (row.fault_keys.length === 0 || !row.phase?.trim())) return "Needs details";
  return "Ready";
}

const EMPTY: Draft = {
  overrides_drill_id: null, placements: [], sports: [], name: "", fault_keys: [], phase: "", level: null,
  dosage: "", setup: "", steps: [""], cue: "", feel: "", feel_wrong: "", common_mistake: "",
  equipment: [], video_url: "", active: true, pinned: false,
};

function placementsFor(d: EliteDrill): string[] {
  return d.sports.map((s) => `analysis:${s}:${d.category}`);
}

function fromBuiltIn(d: EliteDrill): Draft {
  return {
    ...EMPTY, overrides_drill_id: d.id, placements: placementsFor(d), sports: [...d.sports], name: d.name,
    fault_keys: [...d.violationKeys], phase: d.phase ?? d.subSkill, level: d.level, dosage: d.dosage,
    setup: d.setup, steps: [...d.steps], cue: d.cues[0] ?? "", feel: d.feel ?? "", feel_wrong: d.feelWrong ?? "",
    common_mistake: d.commonMistake ?? "", equipment: [...d.equipment], video_url: d.videoUrl ?? "",
  };
}

/** Union of fault keys for the analyses ticked — never the full list. */
function availableFaultKeys(placements: string[]): string[] {
  const keys = new Set<string>();
  for (const p of placements) {
    if (!p.startsWith("analysis:")) continue;
    const [, sport, module] = p.split(":");
    for (const k of faultKeysFor(module, sport)) keys.add(k);
    // Keys already on built-in drills for this same analysis only.
    for (const d of ELITE_DRILL_CATALOG) {
      if (d.category === module && d.sports.includes(sport as any)) d.violationKeys.forEach((k) => keys.add(k));
    }
  }
  return [...keys].sort();
}

export default function DrillBuilder() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<OwnerDrillRow[]>([]);
  const [usage, setUsage] = useState<Record<string, { completed: number; returned: number }>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [request, setRequest] = useState({ analysis: "", description: "" });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [videoSearch, setVideoSearch] = useState('');
  const { videos: libraryVideos, loading: videosLoading, hasMore: moreVideos, loadMore: loadMoreVideos } = useVideoLibrary({ search: videoSearch, limit: 20 });

  useEffect(() => {
    const id = params.get('drill');
    const drill = ELITE_DRILL_CATALOG.find(item => item.id === id);
    if (drill) setDraft(fromBuiltIn(drill));
  }, [params]);

  useEffect(() => {
    if (!videoFile) { setLocalVideoUrl(null); return; }
    const url = URL.createObjectURL(videoFile);
    setLocalVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const matches = (name: string, active: boolean, placements: string[]) =>
    name.toLowerCase().includes(search.trim().toLowerCase()) &&
    (filter === "all" || (filter === "on" ? active : filter === "off" ? !active : placements.includes(filter)));

  const load = async () => {
    const db = supabase as any;
    const [{ data: r }, { data: u }] = await Promise.all([db.from("owner_drills").select("*"), db.rpc("drill_usage_totals")]);
    setRows((r ?? []) as OwnerDrillRow[]);
    const us: typeof usage = {};
    for (const x of (u ?? []) as any[]) us[x.drill_id] = { completed: Number(x.completed), returned: Number(x.returned) };
    setUsage(us);
  };
  useEffect(() => { void load(); }, []);

  const overrideById = useMemo(() => new Map(rows.filter((r) => r.overrides_drill_id).map((r) => [r.overrides_drill_id!, r])), [rows]);
  const ownerOnly = rows.filter((r) => !r.overrides_drill_id);

  const groups = useMemo(() => ANALYSIS_PLACEMENTS.map((p) => {
    const [, sport, cat] = p.id.split(":");
    return {
      ...p,
      builtIn: ELITE_DRILL_CATALOG.filter((d) => d.category === cat && d.sports.includes(sport as any)),
      owner: ownerOnly.filter((r) => r.placements.includes(p.id)),
    };
  }), [ownerOnly]);
  const defense = useMemo(() => listDefenseCatalogForOwner(), []);

  const save = async () => {
    if (!draft || saving) return;
    if (!validDrillRoleTags(draft)) { toast({ title: 'Check the drill role tags' }); return; }
    if (draft.placements.includes('hammers_today:conditioning')) {
      const problems = ownerConditioningProblems(draft);
      if (problems.length) { toast({ title: 'Conditioning numbers need fixing', description: `Add ${problems.join(', ')}.` }); return; }
    }
    if (!draft.name.trim() || draft.placements.length === 0) {
      toast({ title: "Name and at least one place to land are required" });
      return;
    }
    const valid = videoFile ? validateVideoFile(videoFile) : { valid: true };
    if (!valid.valid) { toast({ title: "Video not supported", description: valid.error }); return; }
    if (!videoFile && !draft.library_video_id && !isAcceptedDrillVideoUrl(draft.video_url)) {
      toast({ title: "Video link not supported", description: "Upload your own video, or paste a full https link to the video post (YouTube, Vimeo, TikTok, Instagram, X, Facebook or any site)." });
      return;
    }
    setSaving(true);
    try {
    const { id, ...body } = draft;
    let videoUrl = body.video_url;
    if (videoFile) {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Sign in to upload a video.");
      const ext = videoFile.name.split(".").pop()?.toLowerCase() ?? "mp4";
      const path = `${auth.user.id}/library/drills/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("videos").upload(path, videoFile, { upsert: false });
      if (uploadError) throw uploadError;
      videoUrl = supabase.storage.from("videos").getPublicUrl(path).data.publicUrl;
    }
    const payload = {
      ...body,
      steps: body.steps.map((s) => s.trim()).filter(Boolean),
      equipment: body.equipment.map((s) => s.trim()).filter(Boolean),
      level: body.level || null,
      video_url: videoUrl || null,
      library_video_id: videoFile ? null : body.library_video_id ?? null,
    };
    const { data: u } = await supabase.auth.getUser();
    const db = supabase as any;
    const res = id
      ? await db.from("owner_drills").update(payload).eq("id", id)
      : await db.from("owner_drills").insert({ ...payload, created_by: u?.user?.id ?? null });
    if (res.error) throw res.error;
    toast({ title: "Drill saved" });
    setDraft(null);
    setVideoFile(null);
    await load();
    } catch (error) {
      toast({ title: "Couldn't save drill", description: error instanceof Error ? error.message : "Try again." });
    } finally { setSaving(false); }
  };

  const toggleActive = async (row: OwnerDrillRow | undefined, builtIn?: EliteDrill) => {
    const db = supabase as any;
    if (row) await db.from("owner_drills").update({ active: !row.active }).eq("id", row.id);
    else if (builtIn) await db.from("owner_drills").insert({ ...fromBuiltIn(builtIn), active: false });
    void load();
  };

  const submitRequest = async () => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("fault_key_requests").insert({ ...request, requested_by: u?.user?.id ?? null });
    if (error) { toast({ title: "Couldn't send", description: error.message }); return; }
    toast({ title: "Fault request saved for development" });
    setRequestOpen(false);
    setRequest({ analysis: "", description: "" });
  };

  const UsageLine = ({ id }: { id: string }) => {
    const u = usage[id];
    return <span className="text-[11px] text-muted-foreground">Used {u?.completed ?? 0} · Repeated {u?.returned ?? 0}</span>;
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Skill drill builder</h1>
            <p className="text-sm text-muted-foreground">Activity types: baseball and softball hitting, pitching, throwing, fielding and baserunning; Hammers Today skill, warm-up and defense; defensive library.</p>
            <p className="text-sm text-muted-foreground">Create and edit drills for every place they appear. Usage counts show how often drills are used, not whether they work.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BuilderLibraryLink />
            <Button variant="outline" onClick={() => setRequestOpen(true)}>Request a new fault</Button>
            <Button onClick={() => { if (params.get('library') === 'legacy') { const next = new URLSearchParams(params); next.set('library', 'skills'); setParams(next); } setDraft({ ...EMPTY, steps: [""] }); }}><Plus className="mr-1 h-4 w-4" />Create new</Button>
          </div>
        </div>

        <Tabs value={params.get('library') === 'legacy' ? 'legacy' : 'skills'} onValueChange={value => { const next = new URLSearchParams(params); next.set('library', value); setParams(next); }}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="skills">Skill drills</TabsTrigger>
            <TabsTrigger value="legacy">Legacy library & review</TabsTrigger>
          </TabsList>
          <TabsContent value="legacy"><DrillCmsManager /></TabsContent>
          <TabsContent value="skills" className="space-y-6">
        <div className="flex flex-wrap gap-2" aria-label="Search and filter drills">
          <Input aria-label="Search drills" placeholder="Search drills by name" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-44 flex-1" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-64" aria-label="Filter drills"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All drills</SelectItem>
              <SelectItem value="on">Switched on</SelectItem>
              <SelectItem value="off">Switched off</SelectItem>
              {[...ANALYSIS_PLACEMENTS, ...OTHER_PLACEMENTS].map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {groups.map((g) => (
          <Card key={g.id} className="space-y-2 p-4">
            <h2 className="font-semibold">{g.label}</h2>
            {g.owner.filter((r) => matches(r.name, r.active, r.placements)).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{r.name} <Badge variant="secondary" className="ml-1 text-[10px]">Your drill</Badge>{r.pinned && <Badge className="ml-1 text-[10px]">Pinned</Badge>}</div>
                  <div className="text-xs text-muted-foreground">{r.fault_keys.join(", ") || "No fault picked"}</div>
                  <UsageLine id={`owner.${r.id}`} /> <Badge variant="outline">{readiness(r)}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={r.active} onCheckedChange={() => toggleActive(r)} aria-label="Drill on or off" />
                  <Button size="sm" variant="ghost" onClick={() => setPreview(r)} aria-label={`Preview ${r.name}`}><Eye className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setDraft({ ...r })} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            {g.builtIn.filter((d) => matches(overrideById.get(d.id)?.name ?? d.name, overrideById.get(d.id)?.active ?? true, overrideById.get(d.id)?.placements ?? placementsFor(d))).map((d) => {
              const ov = overrideById.get(d.id);
              const view = ov ?? fromBuiltIn(d);
              return (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{ov?.name ?? d.name}{ov && <Badge variant="outline" className="ml-1 text-[10px]">Edited</Badge>}</div>
                    <div className="text-xs text-muted-foreground">{(ov?.fault_keys ?? d.violationKeys).join(", ")}</div>
                    <UsageLine id={d.id} />
                    {d.ownerReview === 'pending_owner_review' && !ov && <Badge variant="secondary">Needs owner review</Badge>}
                    <Badge variant="outline">{readiness(view)}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={ov ? ov.active : true} onCheckedChange={() => toggleActive(ov, d)} aria-label="Drill on or off" />
                    <Button size="sm" variant="ghost" onClick={() => setPreview(view)} aria-label={`Preview ${view.name}`}><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setDraft(ov ? { ...ov } : fromBuiltIn(d))}><Pencil className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })}
          </Card>
        ))}

        <Card className="space-y-2 p-4">
          <h2 className="font-semibold">Hammers Today and defensive library — your drills</h2>
          <p className="text-xs text-muted-foreground">A switched-on drill takes one slot in the block it's filed under (skill, warm-up or defense), taking turns by day with your other drills there. It only shows to athletes whose sport matches and who have the equipment it lists.</p>
          {ownerOnly.filter((r) => r.placements.some((p) => !p.startsWith("analysis:")) && matches(r.name, r.active, r.placements)).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded border p-2">
              <div className="min-w-0">
                <span className="text-sm">{r.name}</span>
                <PlanReadiness row={r} compact />
                <Badge variant="outline">{readiness(r)}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={r.active} onCheckedChange={() => toggleActive(r)} aria-label="Drill on or off" />
                <Button size="sm" variant="ghost" onClick={() => setPreview(r)} aria-label={`Preview ${r.name}`}><Eye className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setDraft({ ...r })} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </Card>

        <Card className="space-y-2 p-4">
          <h2 className="font-semibold">Defensive library (current, view only)</h2>
          {defense.filter((g) => (filter === "all" || filter === "on" || filter === "defensive_library") && (!search.trim() || g.key.toLowerCase().includes(search.toLowerCase()) || g.drills.some((d) => d.name.toLowerCase().includes(search.toLowerCase())))).map((g) => (
            <details key={g.key} className="rounded border p-2">
              <summary className="cursor-pointer text-sm font-medium">{g.key} · {g.drills.length} drills</summary>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {g.drills.filter((d) => !search.trim() || g.key.toLowerCase().includes(search.toLowerCase()) || d.name.toLowerCase().includes(search.toLowerCase())).map((d, i) => <li key={i} className="flex items-center justify-between gap-2"><span><span className="text-foreground">{d.name}</span> — {d.dosage}{d.cue ? ` — ${d.cue}` : ""}</span><Button variant="ghost" size="sm" aria-label={`Preview ${d.name}`} onClick={() => setPreview({ name: d.name, dosage: d.dosage, cue: d.cue ?? "", steps: [], setup: "", feel: "", feel_wrong: "", common_mistake: "", video_url: "" })}><Eye className="h-4 w-4" /></Button></li>)}
              </ul>
            </details>
          ))}
        </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{preview?.name}</DialogTitle></DialogHeader>
          {preview && <div className="space-y-3 text-sm">
            {preview.video_url && <DrillVideo url={preview.video_url} title={preview.name} />}
            {preview.setup && <p><strong>Set-up:</strong> {preview.setup}</p>}
            {preview.steps?.length > 0 && <ol className="list-decimal pl-5">{preview.steps.filter(Boolean).map((step, i) => <li key={i}>{step}</li>)}</ol>}
            {preview.cue && <p><strong>Cue:</strong> {preview.cue}</p>}
            {preview.dosage && <p><strong>Dose:</strong> {preview.dosage}</p>}
            {preview.feel && <p><strong>Feels right:</strong> {preview.feel}</p>}
            {preview.feel_wrong && <p><strong>Feels wrong:</strong> {preview.feel_wrong}</p>}
            {preview.common_mistake && <p><strong>Common mistake:</strong> {preview.common_mistake}</p>}
          </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!draft} onOpenChange={(o) => !o && (setDraft(null), setVideoFile(null))}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{draft?.id || draft?.overrides_drill_id ? "Edit drill" : "New drill"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-4 text-sm">
              <div>
                <Label>Where it lands</Label>
                <div className="mt-1 grid gap-1 sm:grid-cols-2">
                  {[...ANALYSIS_PLACEMENTS, ...OTHER_PLACEMENTS].map((p) => (
                    <label key={p.id} className="flex items-center gap-2">
                      <Checkbox checked={draft.placements.includes(p.id)} onCheckedChange={(c) => {
                        const placements = c ? [...draft.placements, p.id] : draft.placements.filter((x) => x !== p.id);
                        // Gate dependants on the placements: sport follows the
                        // analyses ticked, and faults outside them are dropped.
                        const analysisSports = [...new Set(placements.filter((x) => x.startsWith("analysis:")).map((x) => x.split(":")[1]))];
                        const allowed = new Set(availableFaultKeys(placements));
                        setDraft((d) => d && ({
                          ...d,
                          placements,
                          sports: analysisSports.length ? analysisSports : d.sports,
                          fault_keys: d.fault_keys.filter((k) => allowed.has(k)),
                        }));
                      }} />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Sport</Label>
                {draft.placements.some((x) => x.startsWith("analysis:")) ? (
                  <p className="mt-1 text-xs capitalize text-muted-foreground">{draft.sports.join(" and ")} — set by the analyses ticked above</p>
                ) : (
                  <div className="mt-1 flex gap-4">
                    {["baseball", "softball"].map((s) => (
                      <label key={s} className="flex items-center gap-2 capitalize">
                        <Checkbox checked={draft.sports.includes(s)} onCheckedChange={(c) =>
                          set("sports", c ? [...draft.sports, s] : draft.sports.filter((x) => x !== s))} />{s}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div><Label htmlFor="drill-name">Name</Label><Input id="drill-name" value={draft.name} onChange={(e) => set("name", e.target.value)} /></div>
              <div>
                <Label>Faults it fixes</Label>
                <div className="mt-1 grid max-h-40 gap-1 overflow-y-auto rounded border p-2 sm:grid-cols-2">
                  {availableFaultKeys(draft.placements).length === 0 && (
                    <p className="text-xs text-muted-foreground">Tick an analysis above to see the faults it can find.</p>
                  )}
                  {availableFaultKeys(draft.placements).map((k) => (
                    <label key={k} className="flex items-center gap-2 text-xs">
                      <Checkbox checked={draft.fault_keys.includes(k)} onCheckedChange={(c) =>
                        set("fault_keys", c ? [...draft.fault_keys, k] : draft.fault_keys.filter((x) => x !== k))} />{k.replace(/_/g, " ")}
                    </label>
                  ))}
                </div>
                <button type="button" className="mt-1 text-xs text-primary underline" onClick={() => setRequestOpen(true)}>Fault not listed? Request it</button>
              </div>
              <div><Label>Phase (write the number out, e.g. "Phase 1 — Create Balance")</Label><Input value={draft.phase ?? ""} onChange={(e) => set("phase", e.target.value)} /></div>
              <div>
                <Label>Type</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {LEVELS.map((l) => (
                    <Button key={l} type="button" size="sm" variant={draft.level === l ? "default" : "outline"} className="capitalize" onClick={() => set("level", l)}>{l}</Button>
                  ))}
                </div>
              </div>
              <div><Label>Dose (sets x reps)</Label><Input value={draft.dosage ?? ""} onChange={(e) => set("dosage", e.target.value)} /></div>
              <div><Label>Set-up</Label><Textarea value={draft.setup ?? ""} onChange={(e) => set("setup", e.target.value)} /></div>
              <div>
                <Label>Steps, in order</Label>
                {draft.steps.map((s, i) => (
                  <div key={i} className="mt-1 flex gap-2">
                    <span className="pt-2 text-xs text-muted-foreground">{i + 1}.</span>
                    <Input value={s} onChange={(e) => set("steps", draft.steps.map((x, j) => (j === i ? e.target.value : x)))} />
                    <Button type="button" size="sm" variant="ghost" onClick={() => set("steps", draft.steps.filter((_, j) => j !== i))}>Remove</Button>
                  </div>
                ))}
                <Button type="button" size="sm" variant="outline" className="mt-1" onClick={() => set("steps", [...draft.steps, ""])}>Add step</Button>
              </div>
              <div><Label>The cue</Label><Input value={draft.cue ?? ""} onChange={(e) => set("cue", e.target.value)} /></div>
              <div><Label>What it feels like when it's right</Label><Textarea value={draft.feel ?? ""} onChange={(e) => set("feel", e.target.value)} /></div>
              <div><Label>What it feels like when it's wrong</Label><Textarea value={draft.feel_wrong ?? ""} onChange={(e) => set("feel_wrong", e.target.value)} /></div>
              <div><Label>The common mistake (and how to tell)</Label><Textarea value={draft.common_mistake ?? ""} onChange={(e) => set("common_mistake", e.target.value)} /></div>
              <div><Label>Equipment (comma separated)</Label><Input value={draft.equipment.join(", ")} onChange={(e) => set("equipment", e.target.value.split(","))} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Skill area</Label><Select value={draft.skill_area ?? 'none'} onValueChange={value => setDraft(d => d && ({ ...d, skill_area: value === 'none' ? null : value, bat_speed_kind: value === 'bat_speed' ? d.bat_speed_kind : null }))}><SelectTrigger aria-label="Skill area"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not tagged</SelectItem>{SKILL_AREAS.map(value => <SelectItem key={value} value={value}>{value.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Drill role</Label><Select value={draft.routine_role ?? 'none'} onValueChange={value => set('routine_role', value === 'none' ? null : value)}><SelectTrigger aria-label="Drill role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not tagged</SelectItem>{ROUTINE_ROLES.map(value => <SelectItem key={value} value={value}>{value === 'prep' ? 'Collective preparation' : value.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
                {draft.skill_area === 'bat_speed' && <div><Label>Bat-speed kind</Label><Select value={draft.bat_speed_kind ?? 'none'} onValueChange={value => set('bat_speed_kind', value === 'none' ? null : value)}><SelectTrigger aria-label="Bat-speed kind"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not tagged</SelectItem>{BAT_SPEED_KINDS.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>}
                {draft.placements.includes('hammers_today:bunting') && <div className="grid grid-cols-2 gap-2">
                  <div><Label>Bunt type</Label><Select value={draft.bunt_type ?? 'none'} onValueChange={value => set('bunt_type', value === 'none' ? null : value)}><SelectTrigger aria-label="Bunt type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not tagged</SelectItem>{BUNT_TYPES.map(value => <SelectItem key={value} value={value}>{value.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Bunt side</Label><Select value={draft.bunt_side ?? 'none'} onValueChange={value => set('bunt_side', value === 'none' ? null : value)}><SelectTrigger aria-label="Bunt side"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not tagged</SelectItem><SelectItem value="R">Right-handed</SelectItem><SelectItem value="L">Left-handed</SelectItem></SelectContent></Select></div>
                </div>}
                {draft.placements.includes('hammers_today:conditioning') && <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                  <div className="col-span-2"><Label>Conditioning type</Label><Select value={draft.conditioning_kind ?? 'none'} onValueChange={value => setDraft(d => d && ({ ...d, conditioning_kind: value === 'none' ? null : value, base_distance_feet: value === 'base_route' && d.sports.length === 1 ? (d.sports[0] === 'softball' ? 60 : 90) : d.base_distance_feet }))}><SelectTrigger aria-label="Conditioning type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not set</SelectItem><SelectItem value="run">Run (set distance)</SelectItem><SelectItem value="base_route">Base route</SelectItem></SelectContent></Select></div>
                  <div><Label>Rounds</Label><Input aria-label="Rounds" type="number" inputMode="numeric" value={draft.rounds ?? ''} onChange={e => set('rounds', e.target.value === '' ? null : Math.round(Number(e.target.value)))} /></div>
                  <div><Label>Work time (seconds)</Label><Input aria-label="Work time in seconds" type="number" inputMode="numeric" value={draft.work_seconds ?? ''} onChange={e => set('work_seconds', e.target.value === '' ? null : Math.round(Number(e.target.value)))} /></div>
                  <div><Label>Rest time (seconds)</Label><Input aria-label="Rest time in seconds" type="number" inputMode="numeric" value={draft.rest_seconds ?? ''} onChange={e => set('rest_seconds', e.target.value === '' ? null : Math.round(Number(e.target.value)))} /></div>
                  {draft.conditioning_kind === 'base_route' ? <><div><Label>Bases per rep (1–4)</Label><Input aria-label="Bases per rep" type="number" inputMode="numeric" value={draft.bases_per_rep ?? ''} onChange={e => set('bases_per_rep', e.target.value === '' ? null : Math.round(Number(e.target.value)))} /></div><div><Label>Base distance</Label><Select value={String(draft.base_distance_feet ?? 'none')} onValueChange={value => set('base_distance_feet', value === 'none' ? null : Number(value))}><SelectTrigger aria-label="Base distance"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not set</SelectItem><SelectItem value="90">90 ft (baseball)</SelectItem><SelectItem value="60">60 ft (softball)</SelectItem></SelectContent></Select></div></> : <div><Label>Distance (feet)</Label><Input aria-label="Distance in feet" type="number" inputMode="numeric" value={draft.distance_feet ?? ''} onChange={e => set('distance_feet', e.target.value === '' ? null : Math.round(Number(e.target.value)))} /></div>}
                  <p className="col-span-2 text-xs text-muted-foreground">Safety limits still apply: runs rest at least 1 minute per 10 yards (up to 5 minutes); base routes rest at least 30 seconds and 5 minutes after every 4 bases. Low readiness halves the rounds.</p>
                </div>}
              </div>
              <div className="space-y-2"><Label htmlFor="drill-library-search">Video library</Label><Input id="drill-library-search" placeholder="Search library videos" value={videoSearch} onChange={e => setVideoSearch(e.target.value)} /><div className="max-h-48 space-y-1 overflow-y-auto">{libraryVideos.filter(video => video.video_url).map(video => <Button key={video.id} type="button" variant={draft.library_video_id === video.id ? 'default' : 'outline'} className="h-auto w-full justify-start whitespace-normal break-words text-left" onClick={() => { setDraft(d => d && ({ ...d, library_video_id: video.id, video_url: video.video_url })); setVideoFile(null); }}>{video.title}</Button>)}</div>{videosLoading && <p role="status" className="text-xs text-muted-foreground">Loading videos…</p>}{moreVideos && <Button type="button" variant="ghost" disabled={videosLoading} onClick={loadMoreVideos}>More videos</Button>}</div>
              <div><Label>Video link</Label><Input value={draft.video_url ?? ""} onChange={(e) => setDraft(d => d && ({ ...d, video_url: e.target.value, library_video_id: null }))} placeholder="Paste your drill video link" />{draft.video_url?.trim() ? <p className={`mt-1 text-xs ${isAcceptedDrillVideoUrl(draft.video_url) ? "text-muted-foreground" : "text-destructive"}`}>{isAcceptedDrillVideoUrl(draft.video_url) ? drillVideoLabel(drillVideoFromUrl(draft.video_url)) : "This link can't be used. Paste the full https link to the video post."}</p> : null}</div>
              <div><Label htmlFor="drill-video-file">Or upload a video</Label><Input id="drill-video-file" type="file" accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-m4v" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />{videoFile && <p className="text-xs text-muted-foreground">{videoFile.name} will be attached when you save.</p>}</div>
              {localVideoUrl ? <VideoPlayer videoUrl={localVideoUrl} videoType="upload" title={draft.name || "Drill preview"} /> : draft.video_url ? <DrillVideo url={draft.video_url} title={draft.name || "Drill preview"} /> : null}
              <PlanReadiness row={draft} />
              <div className="flex gap-6">
                <label className="flex items-center gap-2"><Switch checked={draft.active} onCheckedChange={(v) => set("active", v)} />On</label>
                <label className="flex items-center gap-2"><Switch checked={draft.pinned} onCheckedChange={(v) => set("pinned", v)} />Pinned (always include)</label>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => { setDraft(null); setVideoFile(null); }}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save drill"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request a new fault</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div><Label>Which analysis</Label><Input value={request.analysis} onChange={(e) => setRequest((r) => ({ ...r, analysis: e.target.value }))} /></div>
            <div><Label>Describe the fault</Label><Textarea value={request.description} onChange={(e) => setRequest((r) => ({ ...r, description: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={submitRequest} disabled={!request.analysis || !request.description}>Send request</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
