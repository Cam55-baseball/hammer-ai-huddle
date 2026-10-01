/**
 * Owner Drill Builder — create, edit and switch drills on/off for every place
 * a drill can land. Owner/admin only (route + row-level security).
 * Usage counts are "used / repeated", never "effective".
 */
import { useEffect, useMemo, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil } from "lucide-react";
import { ELITE_DRILL_CATALOG, type EliteDrill } from "@/data/drills/eliteDrillCatalog";
import { listDefenseCatalogForOwner } from "@/lib/hammer/prescription/defenseLibrary";
import { ANALYSIS_PLACEMENTS, OTHER_PLACEMENTS, type OwnerDrillRow } from "@/lib/prescription/ownerDrills";
import { faultKeysFor } from "../../../supabase/functions/analyze-video/constructiveCriticism";

const LEVELS = ["feel", "iso", "constraint", "transfer", "timing"] as const;

type Draft = Omit<OwnerDrillRow, "id" | "created_at"> & { id?: string };

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
  const [rows, setRows] = useState<OwnerDrillRow[]>([]);
  const [usage, setUsage] = useState<Record<string, { completed: number; returned: number }>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [request, setRequest] = useState({ analysis: "", description: "" });

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
  const ownerOnly = rows.filter((r) => !r.overrides_drill_id && !r.placements.includes("retired"));

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
    if (!draft) return;
    if (!draft.name.trim() || draft.placements.length === 0) {
      toast({ title: "Name and at least one place to land are required" });
      return;
    }
    const { id, ...body } = draft;
    const payload = {
      ...body,
      steps: body.steps.map((s) => s.trim()).filter(Boolean),
      equipment: body.equipment.map((s) => s.trim()).filter(Boolean),
      level: body.level || null,
      video_url: body.video_url || null,
    };
    const { data: u } = await supabase.auth.getUser();
    const db = supabase as any;
    const res = id
      ? await db.from("owner_drills").update(payload).eq("id", id)
      : await db.from("owner_drills").insert({ ...payload, created_by: u?.user?.id ?? null });
    if (res.error) { toast({ title: "Couldn't save", description: res.error.message }); return; }
    toast({ title: "Drill saved" });
    setDraft(null);
    void load();
  };

  const toggleActive = async (row: OwnerDrillRow | undefined, builtIn?: EliteDrill) => {
    const db = supabase as any;
    if (row) await db.from("owner_drills").update({ active: !row.active }).eq("id", row.id);
    else if (builtIn) await db.from("owner_drills").insert({ ...fromBuiltIn(builtIn), active: false });
    void load();
  };

  /** Same button, system decides: never given → deleted; given → retired. */
  const removeDrill = async (r: OwnerDrillRow) => {
    if (!window.confirm(`Remove "${r.name}"?`)) return;
    const db = supabase as any;
    const { count } = await db.from("drill_engagement").select("id", { count: "exact", head: true })
      .eq("event", "served").like("drill_id", `owner.${r.id}%`);
    const retire = async (why: string) => {
      await db.from("owner_drills").update({ active: false, placements: [...r.placements, "retired"] }).eq("id", r.id);
      toast({ title: "Retired", description: why });
    };
    if ((count ?? 1) > 0) {
      await retire("Athletes have been given this drill, so it stays in their history. It won't be prescribed again.");
    } else {
      const { data } = await db.from("owner_drills").delete().eq("id", r.id).select("id");
      if (data && data.length) toast({ title: "Deleted", description: "No athlete was ever given this drill." });
      else await retire("No athlete was given it, but full deletion isn't switched on yet, so it was retired instead.");
    }
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
            <h1 className="text-2xl font-bold">Drill Builder</h1>
            <p className="text-sm text-muted-foreground">Create and edit drills for every place they appear. Usage counts show how often drills are used, not whether they work.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRequestOpen(true)}>Request a new fault</Button>
            <Button onClick={() => setDraft({ ...EMPTY, steps: [""] })}><Plus className="mr-1 h-4 w-4" />New drill</Button>
          </div>
        </div>

        {groups.map((g) => (
          <Card key={g.id} className="space-y-2 p-4">
            <h2 className="font-semibold">{g.label}</h2>
            {g.owner.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{r.name} <Badge variant="secondary" className="ml-1 text-[10px]">Your drill</Badge>{r.pinned && <Badge className="ml-1 text-[10px]">Pinned</Badge>}</div>
                  <div className="text-xs text-muted-foreground">{r.fault_keys.join(", ") || "No fault picked"}</div>
                  <UsageLine id={`owner.${r.id}`} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={r.active} onCheckedChange={() => toggleActive(r)} aria-label="Drill on or off" />
                  <Button size="sm" variant="ghost" onClick={() => setDraft({ ...r })} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => removeDrill(r)} aria-label="Delete">Delete</Button>
                </div>
              </div>
            ))}
            {g.builtIn.map((d) => {
              const ov = overrideById.get(d.id);
              return (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{ov?.name ?? d.name}{ov && <Badge variant="outline" className="ml-1 text-[10px]">Edited</Badge>}</div>
                    <div className="text-xs text-muted-foreground">{(ov?.fault_keys ?? d.violationKeys).join(", ")}</div>
                    <UsageLine id={d.id} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={ov ? ov.active : true} onCheckedChange={() => toggleActive(ov, d)} aria-label="Drill on or off" />
                    <Button size="sm" variant="ghost" onClick={() => setDraft(ov ? { ...ov } : fromBuiltIn(d))}><Pencil className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })}
          </Card>
        ))}

        <Card className="space-y-2 p-4">
          <h2 className="font-semibold">Hammers Today and defensive library — your drills</h2>
          <p className="text-xs text-muted-foreground">Defense-block and defensive-library drills appear in the daily defense block when switched on, taking one slot in rotation. Skill-block and warm-up placements are not shown yet.</p>
          {ownerOnly.filter((r) => r.placements.some((p) => !p.startsWith("analysis:"))).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded border p-2">
              <span className="text-sm">{r.name}</span>
              <div className="flex items-center gap-2">
                <Switch checked={r.active} onCheckedChange={() => toggleActive(r)} aria-label="Drill on or off" />
                <Button size="sm" variant="ghost" onClick={() => setDraft({ ...r })} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => removeDrill(r)}>Delete</Button>
              </div>
            </div>
          ))}
        </Card>

        <Card className="space-y-2 p-4">
          <h2 className="font-semibold">Defensive library (current, view only)</h2>
          {defense.map((g) => (
            <details key={g.key} className="rounded border p-2">
              <summary className="cursor-pointer text-sm font-medium">{g.key} · {g.drills.length} drills</summary>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {g.drills.map((d, i) => <li key={i}><span className="text-foreground">{d.name}</span> — {d.dosage}{d.cue ? ` — ${d.cue}` : ""}</li>)}
              </ul>
            </details>
          ))}
        </Card>
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
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
                      <span>{p.label}{!p.id.startsWith("analysis:") && <span className="block text-[10px] text-muted-foreground">Saved, not shown to athletes yet</span>}</span>
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
              <div><Label>Video link</Label><Input value={draft.video_url ?? ""} onChange={(e) => set("video_url", e.target.value)} placeholder="Paste your drill video link" /></div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2"><Switch checked={draft.active} onCheckedChange={(v) => set("active", v)} />On</label>
                <label className="flex items-center gap-2"><Switch checked={draft.pinned} onCheckedChange={(v) => set("pinned", v)} />Pinned (always include)</label>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button><Button onClick={save}>Save drill</Button></DialogFooter>
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
