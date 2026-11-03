import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Brain, Plus, Sparkles } from "lucide-react";
import { useMindContentRows } from "@/hooks/useMindContent";
import {
  ADVICE_CATEGORIES, BUILTIN_SITUATION, LEVEL_OPTIONS, POSITION_OPTIONS, PROGRAM_OPTIONS, SEASON_PHASES, SITUATION_TYPES,
  builtinAdvice, mergeContent, type MindContentKind, type MindContentRow,
} from "@/lib/hammer/mindContent";

const PHASE_LABEL: Record<string, string> = { preseason: "Preseason", in_season: "In-season", post_season: "Post-season", off_season: "Off-season" };

function Chips({ label, options, value, onChange, labels }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void; labels?: Record<string, string> }) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-3">
        {options.map((o) => (
          <label key={o} className="flex items-center gap-1.5 text-sm">
            <Checkbox checked={value.includes(o)} onCheckedChange={(c) => onChange(c ? [...value, o] : value.filter((x) => x !== o))} />
            {labels?.[o] ?? o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const tagSummary = (r: MindContentRow) => {
  const parts = [r.sports.join("/"), r.positions.join("/"), r.levels.join("/"), r.programs.join("/")].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Everyone";
};

/** Owner editor for one kind: edit built-ins (saved as an override), create new, tag and preview. */
export function MindContentEditor({ kind }: { kind: MindContentKind }) {
  const qc = useQueryClient();
  const { data: rows, isLoading } = useMindContentRows();
  const [draft, setDraft] = useState<MindContentRow | null>(null);
  const [saving, setSaving] = useState(false);
  const builtins = kind === "advice" ? builtinAdvice() : [BUILTIN_SITUATION];
  const items = useMemo(() => mergeContent(builtins, (rows ?? []).filter((r) => r.kind === kind)), [rows, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const blank: MindContentRow = {
    kind, builtin_key: null, title: "", body: "", category: kind === "advice" ? "mind" : null,
    season_phases: kind === "advice" ? ["in_season"] : [], situation_type: kind === "situation" ? "general" : null,
    sports: [], positions: [], levels: [], programs: [], active: true,
  };
  const set = <K extends keyof MindContentRow>(k: K, v: MindContentRow[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const problems = draft ? [
    !draft.title.trim() && "a title",
    !draft.body.trim() && "the text",
    kind === "advice" && draft.season_phases.length === 0 && "at least one season",
  ].filter(Boolean) : [];

  const save = async () => {
    if (!draft || problems.length) return;
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const payload = {
      kind, builtin_key: draft.builtin_key, title: draft.title.trim(), body: draft.body.trim(), category: draft.category,
      season_phases: draft.season_phases, situation_type: draft.situation_type, sports: draft.sports, positions: draft.positions,
      levels: draft.levels, programs: draft.programs, active: draft.active, updated_by: auth.user?.id ?? null, updated_at: new Date().toISOString(),
    };
    const { error } = draft.id
      ? await supabase.from("plan_mind_content").update(payload).eq("id", draft.id)
      : await supabase.from("plan_mind_content").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "That didn't save", description: "Try Save again.", variant: "destructive" }); return; }
    await qc.invalidateQueries({ queryKey: ["plan-mind-content"] });
    toast({ title: "Saved", description: "Players get it the next time their plan loads." });
    setDraft(null);
  };

  const title = kind === "advice" ? "Coach's advice" : "Game situations (Mind)";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">
          {kind === "advice"
            ? "Shown at the top of Hammers Today. Picked by season, rotating each day. Tags are optional: untagged advice shows to everyone; tagged advice shows only to matching players."
            : "Shown on game-situation days in the Mind item (no physical work). Rotates each day among the situations that match the player."}
        </p>
        <Button onClick={() => setDraft(blank)}><Plus className="mr-1 h-4 w-4" />Create new</Button>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="grid gap-2">
          {items.map((r) => (
            <Card key={r.id ?? r.builtin_key} className="flex flex-wrap items-start justify-between gap-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.title}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{r.body}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {kind === "advice" && <Badge variant="secondary">{r.category}</Badge>}
                  {kind === "advice" && r.season_phases.map((p) => <Badge key={p} variant="outline">{PHASE_LABEL[p] ?? p}</Badge>)}
                  {kind === "situation" && r.situation_type && <Badge variant="secondary">{r.situation_type}</Badge>}
                  <Badge variant="outline">{tagSummary(r)}</Badge>
                  {r.builtin_key && <Badge variant="outline">{r.id ? "Built-in, edited" : "Built-in"}</Badge>}
                  {!r.active && <Badge variant="destructive">Switched off</Badge>}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setDraft({ ...r })}>Edit</Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{draft?.id || draft?.builtin_key ? `Edit ${title}` : `New — ${title}`}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div><Label htmlFor="mc-title">Title</Label><Input id="mc-title" value={draft.title} onChange={(e) => set("title", e.target.value)} /></div>
              <div><Label htmlFor="mc-body">{kind === "advice" ? "Advice" : "What the player does"}</Label><Textarea id="mc-body" value={draft.body} onChange={(e) => set("body", e.target.value)} /></div>
              {kind === "advice" ? (
                <>
                  <Chips label="Category" options={ADVICE_CATEGORIES} value={draft.category ? [draft.category] : []} onChange={(v) => set("category", v[v.length - 1] ?? draft.category)} />
                  <Chips label="Season (needed)" options={SEASON_PHASES} labels={PHASE_LABEL} value={draft.season_phases} onChange={(v) => set("season_phases", v)} />
                </>
              ) : (
                <Chips label="Situation type" options={SITUATION_TYPES} value={draft.situation_type ? [draft.situation_type] : []} onChange={(v) => set("situation_type", v[v.length - 1] ?? null)} />
              )}
              <p className="text-xs text-muted-foreground">Leave a tag group empty to fit everyone.</p>
              <Chips label="Sport" options={["baseball", "softball"]} value={draft.sports} onChange={(v) => set("sports", v)} />
              <Chips label="Position" options={POSITION_OPTIONS} value={draft.positions} onChange={(v) => set("positions", v)} />
              <Chips label="Level" options={LEVEL_OPTIONS} value={draft.levels} onChange={(v) => set("levels", v)} />
              <Chips label="Program" options={PROGRAM_OPTIONS} value={draft.programs} onChange={(v) => set("programs", v)} />
              <label className="flex items-center gap-2 text-sm"><Switch checked={draft.active} onCheckedChange={(c) => set("active", c)} />Switched on</label>
              <div aria-label="Preview" className="rounded-md border p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Preview — what players see</p>
                {kind === "advice" ? (
                  <>
                    <div className="flex items-center gap-2 text-xs font-medium"><Sparkles className="h-3.5 w-3.5 text-primary" />Today's coach advice · {draft.category}</div>
                    <div className="mt-1 text-sm font-semibold">{draft.title || "Title"}</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{draft.body || "Advice text"}</p>
                  </>
                ) : (
                  <div className="flex gap-3">
                    <Brain className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mind · no physical work</p>
                      <p className="font-semibold">{draft.title || "Title"}</p>
                      <p className="text-sm text-muted-foreground">{draft.body || "What the player does"}</p>
                    </div>
                  </div>
                )}
              </div>
              {problems.length > 0 && <p className="text-sm text-destructive">Still needs {problems.join(", ")}.</p>}
            </div>
          )}
          <DialogFooter><Button onClick={save} disabled={saving || problems.length > 0}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
