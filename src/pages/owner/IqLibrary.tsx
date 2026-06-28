import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Brain, CheckCircle2, AlertTriangle, BookOpen, Library } from "lucide-react";
import { IqDiamond } from "@/components/iq/IqDiamond";
import { validateThreeBs } from "@/lib/iq/threeBs";
import {
  DEFENSIVE_ROLES, OFFENSIVE_ROLES, ROLE_LABELS, ASSIGNMENT_LABELS,
  type IqActor, type IqActorRole, type IqAssignment, type IqSport, type IqLens, type IqDifficulty, type IqStatus,
} from "@/lib/iq/types";

const ALL_ROLES: IqActorRole[] = [...DEFENSIVE_ROLES, ...OFFENSIVE_ROLES];
const ASSIGNMENTS: IqAssignment[] = ["ball","bag","backup","read","execute","idle"];

interface SituationRow {
  id: string;
  sport: IqSport;
  slug: string;
  title: string;
  summary: string;
  lens_tags: IqLens[];
  difficulty: IqDifficulty;
  status: IqStatus;
  triple_check_count: number;
  canonical_order: number;
  sources: { label: string; ref?: string }[];
}

function blankActor(role: IqActorRole): Omit<IqActor, "id" | "situation_id"> {
  return {
    role,
    assignment: "idle",
    primary_path: [],
    secondary_read: "",
    communication_call: "",
    coaching_note: "",
    common_mistake: "",
    elite_cue: "",
  };
}

export default function IqLibrary() {
  const { isOwner, loading } = useOwnerAccess();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sportFilter, setSportFilter] = useState<"all" | IqSport>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | IqStatus>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SituationRow | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !isOwner) navigate("/dashboard", { replace: true });
  }, [loading, isOwner, navigate]);

  const listQ = useQuery({
    queryKey: ["iq-library", sportFilter, statusFilter],
    queryFn: async () => {
      let q = supabase.from("iq_situations").select("*").order("canonical_order");
      if (sportFilter !== "all") q = q.eq("sport", sportFilter);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as SituationRow[];
    },
    enabled: isOwner,
  });

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (listQ.data ?? []).filter((r) =>
      !s || r.title.toLowerCase().includes(s) || r.slug.includes(s) || r.summary.toLowerCase().includes(s));
  }, [listQ.data, search]);

  const counts = useMemo(() => {
    const all = listQ.data ?? [];
    return {
      total: all.length,
      published: all.filter((r) => r.status === "published").length,
      draft: all.filter((r) => r.status === "draft").length,
      baseball: all.filter((r) => r.sport === "baseball" || r.sport === "both").length,
      softball: all.filter((r) => r.sport === "softball" || r.sport === "both").length,
    };
  }, [listQ.data]);

  if (loading) return <DashboardLayout><div className="p-8">Loading…</div></DashboardLayout>;
  if (!isOwner) return null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/owner")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Owner
            </Button>
            <div className="flex items-center gap-2">
              <Library className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Game IQ Library</h1>
            </div>
          </div>
          <Button onClick={() => setCreating(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New situation
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Stat label="Total" value={counts.total} />
          <Stat label="Published" value={counts.published} />
          <Stat label="Drafts" value={counts.draft} />
          <Stat label="Baseball" value={counts.baseball} />
          <Stat label="Softball" value={counts.softball} />
        </div>

        <Card className="p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs">Search</Label>
            <Input placeholder="Title, slug, summary…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Sport</Label>
            <Select value={sportFilter} onValueChange={(v) => setSportFilter(v as never)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sports</SelectItem>
                <SelectItem value="baseball">Baseball</SelectItem>
                <SelectItem value="softball">Softball</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as never)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <div className="space-y-2">
          {listQ.isLoading ? <div className="p-6 text-muted-foreground">Loading…</div> :
           rows.length === 0 ? <Card className="p-8 text-center text-muted-foreground">No situations match.</Card> :
           rows.map((r) => (
            <Card key={r.id} className="p-4 flex items-center gap-3 hover:bg-muted/30 cursor-pointer" onClick={() => setEditing(r)}>
              <Brain className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold truncate">{r.title}</span>
                  <Badge variant="outline" className="text-[10px]">{r.sport}</Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{r.difficulty}</Badge>
                  {r.lens_tags.map((l) => <Badge key={l} variant="secondary" className="text-[10px]">{l}</Badge>)}
                  <Badge className="text-[10px]" variant={r.status === "published" ? "default" : "secondary"}>{r.status}</Badge>
                  {r.triple_check_count >= 3 && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                </div>
                <div className="text-xs text-muted-foreground truncate">{r.summary}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {(creating || editing) && (
        <SituationEditor
          row={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["iq-library"] }); qc.invalidateQueries({ queryKey: ["iq-situations"] }); }}
        />
      )}
    </DashboardLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3 text-center">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </Card>
  );
}

// ----- Editor / Wizard -----

interface EditorProps {
  row: SituationRow | null;
  onClose: () => void;
  onSaved: () => void;
}

function SituationEditor({ row, onClose, onSaved }: EditorProps) {
  const isNew = !row;
  const [meta, setMeta] = useState<SituationRow>(() => row ?? {
    id: "",
    sport: "both",
    slug: "",
    title: "",
    summary: "",
    lens_tags: ["defense"],
    difficulty: "core",
    status: "draft",
    triple_check_count: 0,
    canonical_order: 999,
    sources: [],
  });
  const [actors, setActors] = useState<Array<Omit<IqActor, "situation_id"> & { id?: string }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row) {
      // pre-fill defense roles for a new situation
      setActors(DEFENSIVE_ROLES.map((r) => ({ ...blankActor(r), id: undefined })));
      return;
    }
    (async () => {
      const { data } = await supabase.from("iq_situation_actors").select("*").eq("situation_id", row.id);
      setActors((data ?? []) as never);
    })();
  }, [row]);

  const validation = useMemo(() => validateThreeBs(actors as unknown as IqActor[]), [actors]);
  const canPublish = validation.ok && meta.sources.length > 0 && actors.filter((a) => a.assignment !== "idle").length >= 6;

  const upsertActor = (role: IqActorRole, patch: Partial<Omit<IqActor, "id" | "situation_id">>) => {
    setActors((prev) => {
      const idx = prev.findIndex((a) => a.role === role);
      if (idx === -1) return [...prev, { ...blankActor(role), ...patch, id: undefined }];
      const copy = [...prev]; copy[idx] = { ...copy[idx], ...patch }; return copy;
    });
  };

  const save = async (publish: boolean) => {
    setSaving(true);
    try {
      const slug = meta.slug.trim() || meta.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!slug || !meta.title.trim()) throw new Error("Title and slug required");
      const payload = {
        sport: meta.sport, slug, title: meta.title, summary: meta.summary,
        lens_tags: meta.lens_tags, difficulty: meta.difficulty, canonical_order: meta.canonical_order,
        sources: meta.sources,
        status: publish ? "published" : meta.status,
        triple_check_count: publish ? Math.max(3, meta.triple_check_count) : meta.triple_check_count,
      };
      let sitId = meta.id;
      if (isNew || !sitId) {
        const { data, error } = await supabase.from("iq_situations").insert(payload as never).select("id").single();
        if (error) throw error;
        sitId = (data as { id: string }).id;
      } else {
        const { error } = await supabase.from("iq_situations").update(payload as never).eq("id", sitId);
        if (error) throw error;
      }
      // wipe + re-insert actors (simple semantics for the wizard)
      await supabase.from("iq_situation_actors").delete().eq("situation_id", sitId);
      const actorRows = actors.map((a) => ({
        situation_id: sitId,
        role: a.role,
        assignment: a.assignment,
        primary_path: a.primary_path ?? [],
        secondary_read: a.secondary_read ?? "",
        communication_call: a.communication_call ?? "",
        coaching_note: a.coaching_note ?? "",
        common_mistake: a.common_mistake ?? "",
        elite_cue: a.elite_cue ?? "",
      }));
      if (actorRows.length) {
        const { error } = await supabase.from("iq_situation_actors").insert(actorRows as never);
        if (error) throw error;
      }
      await supabase.from("iq_owner_review_log").insert({
        situation_id: sitId,
        action: publish ? "publish" : (isNew ? "create" : "update"),
        notes: `Three Bs: ${validation.ballCount}/${validation.bagCount}/${validation.backupCount}`,
      } as never);
      toast({ title: publish ? "Published" : "Saved", description: meta.title });
      onSaved(); onClose();
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : "Save failed";
      toast({ title: "Save failed", description: m, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "New situation" : `Edit · ${meta.title}`}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="meta" className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="meta">Metadata</TabsTrigger>
            <TabsTrigger value="actors">Actor Matrix · Three B's</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="preview">Preview & Publish</TabsTrigger>
          </TabsList>

          <TabsContent value="meta" className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Title</Label><Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={meta.slug} onChange={(e) => setMeta({ ...meta, slug: e.target.value })} placeholder="auto from title" /></div>
              <div>
                <Label>Sport</Label>
                <Select value={meta.sport} onValueChange={(v) => setMeta({ ...meta, sport: v as IqSport })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baseball">Baseball</SelectItem>
                    <SelectItem value="softball">Softball</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select value={meta.difficulty} onValueChange={(v) => setMeta({ ...meta, difficulty: v as IqDifficulty })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["intro","core","advanced","elite"] as IqDifficulty[]).map((d) =>
                      <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Canonical order</Label>
                <Input type="number" value={meta.canonical_order} onChange={(e) => setMeta({ ...meta, canonical_order: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Lens tags (comma)</Label>
                <Input
                  value={meta.lens_tags.join(",")}
                  onChange={(e) => setMeta({ ...meta, lens_tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) as IqLens[] })}
                  placeholder="defense, pitching"
                />
              </div>
            </div>
            <div><Label>Summary</Label>
              <Textarea rows={3} value={meta.summary} onChange={(e) => setMeta({ ...meta, summary: e.target.value })} /></div>
          </TabsContent>

          <TabsContent value="actors" className="space-y-3 pt-4">
            <div className="flex gap-2 text-xs">
              <Badge variant={validation.ok ? "default" : "destructive"}>
                {validation.ok ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Three B's complete</> :
                                  <><AlertTriangle className="h-3 w-3 mr-1" /> Missing: {validation.missingRoles.join(", ") || "—"} · Idle w/o reason: {validation.ungatedIdle.join(", ") || "—"}</>}
              </Badge>
              <Badge variant="outline">{validation.ballCount} ball · {validation.bagCount} bag · {validation.backupCount} backup</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-3">
                <IqDiamond actors={actors as unknown as IqActor[]} mode="teach" />
              </Card>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {ALL_ROLES.map((role) => {
                  const a = actors.find((x) => x.role === role) ?? blankActor(role);
                  return (
                    <Card key={role} className="p-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-bold">{role}</Badge>
                        <span className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</span>
                        <Select value={a.assignment} onValueChange={(v) => upsertActor(role, { assignment: v as IqAssignment })}>
                          <SelectTrigger className="ml-auto w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{ASSIGNMENTS.map((x) => <SelectItem key={x} value={x}>{ASSIGNMENT_LABELS[x]}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Input className="h-7 text-xs" placeholder="Communication call (e.g. 'cut 2!')"
                             value={a.communication_call} onChange={(e) => upsertActor(role, { communication_call: e.target.value })} />
                      <Input className="h-7 text-xs" placeholder="Coaching note (one sentence)"
                             value={a.coaching_note} onChange={(e) => upsertActor(role, { coaching_note: e.target.value })} />
                      <Input className="h-7 text-xs" placeholder="Common mistake"
                             value={a.common_mistake} onChange={(e) => upsertActor(role, { common_mistake: e.target.value })} />
                      <Input className="h-7 text-xs" placeholder="Elite cue (HOF-level differentiator)"
                             value={a.elite_cue} onChange={(e) => upsertActor(role, { elite_cue: e.target.value })} />
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sources" className="space-y-3 pt-4">
            <p className="text-xs text-muted-foreground">Cite at least one canonical source (Polk, Geng, Inmotion, Yost, Cox, MLB/AUSL coaching manuals). One per line: <code>Label | optional-url</code></p>
            <Textarea rows={6} value={meta.sources.map((s) => s.ref ? `${s.label} | ${s.ref}` : s.label).join("\n")}
              onChange={(e) => setMeta({ ...meta, sources: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
                const [label, ref] = l.split("|").map((x) => x.trim()); return ref ? { label, ref } : { label };
              }) })} />
          </TabsContent>

          <TabsContent value="preview" className="space-y-3 pt-4">
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="font-bold">{meta.title || "(untitled)"}</span>
                <Badge variant="outline">{meta.sport}</Badge>
                {meta.lens_tags.map((l) => <Badge key={l} variant="secondary">{l}</Badge>)}
              </div>
              <p className="text-sm text-muted-foreground">{meta.summary}</p>
              <div className="text-xs">Sources: {meta.sources.length === 0 ? <span className="text-destructive">none</span> : meta.sources.map((s) => s.label).join(" · ")}</div>
              <div className="text-xs">Three B's: {validation.ok ? "✓" : "✗"} · Active actors: {actors.filter((a) => a.assignment !== "idle").length}</div>
            </Card>
            {!canPublish && (
              <Card className="p-3 bg-destructive/5 border-destructive/30 text-xs">
                Publishing blocked. Required: complete Three B's, ≥1 source, ≥6 active actors.
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="secondary" onClick={() => save(false)} disabled={saving}>Save draft</Button>
          <Button onClick={() => save(true)} disabled={saving || !canPublish}>Publish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
