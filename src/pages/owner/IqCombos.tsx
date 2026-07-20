/**
 * IqCombos — owner-facing composite alignment presets.
 *
 * A combo = base alignment (from iq_defensive_alignments) + an ordered
 * stack of situational override layers. Layers are stored as jsonb so we
 * can iterate the schema without a migration.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAlignmentPresets, type FieldSport } from "@/hooks/useDefensiveAlignment";

interface ComboLayer {
  label: string;
  note: string;
}
interface Combo {
  id: string;
  name: string;
  sport: FieldSport;
  base_alignment_id: string | null;
  layers: ComboLayer[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function useCombos(sport: FieldSport) {
  return useQuery({
    queryKey: ["iq-alignment-combos", sport],
    queryFn: async (): Promise<Combo[]> => {
      const { data, error } = await supabase
        .from("iq_alignment_combos")
        .select("*")
        .eq("sport", sport)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        layers: Array.isArray(r.layers) ? r.layers : [],
      }));
    },
  });
}

export default function IqCombos() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const [sport, setSport] = useState<FieldSport>("baseball");
  const presetsQ = useAlignmentPresets(sport);
  const combosQ = useCombos(sport);

  const [editing, setEditing] = useState<Combo | null>(null);
  const isNew = editing?.id === "__new__";

  useEffect(() => { setEditing(null); }, [sport]);

  const startNew = () => {
    setEditing({
      id: "__new__",
      name: "",
      sport,
      base_alignment_id: null,
      layers: [],
      notes: "",
      created_at: "",
      updated_at: "",
    });
  };

  const saveMut = useMutation({
    mutationFn: async (c: Combo) => {
      if (!c.name.trim()) throw new Error("Name is required");
      const payload: any = {
        name: c.name.trim(),
        sport: c.sport,
        base_alignment_id: c.base_alignment_id,
        layers: c.layers as any,
        notes: c.notes ?? null,
      };
      if (c.id === "__new__") {
        const { data, error } = await supabase
          .from("iq_alignment_combos")
          .insert(payload)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("iq_alignment_combos")
        .update(payload)
        .eq("id", c.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Combo saved" });
      qc.invalidateQueries({ queryKey: ["iq-alignment-combos", sport] });
      setEditing(null);
    },
    onError: (e: any) => toast({ title: "Save failed", description: e?.message ?? "Unknown error", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("iq_alignment_combos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Deleted" });
      qc.invalidateQueries({ queryKey: ["iq-alignment-combos", sport] });
      setEditing(null);
    },
  });

  const baseName = useMemo(() => {
    const p = presetsQ.data?.find((x) => x.id === editing?.base_alignment_id);
    return p?.preset_key ?? "—";
  }, [presetsQ.data, editing?.base_alignment_id]);

  if (ownerLoading) return <DashboardLayout><div className="p-8">Loading…</div></DashboardLayout>;
  if (!isOwner) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-muted-foreground">Owner access required.</div>
      </DashboardLayout>
    );
  }

  const updateLayer = (idx: number, patch: Partial<ComboLayer>) => {
    if (!editing) return;
    const next = [...editing.layers];
    next[idx] = { ...next[idx], ...patch };
    setEditing({ ...editing, layers: next });
  };
  const move = (idx: number, dir: -1 | 1) => {
    if (!editing) return;
    const next = [...editing.layers];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setEditing({ ...editing, layers: next });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-4 space-y-5">
        <Button variant="ghost" onClick={() => navigate("/iq")} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Game IQ
        </Button>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">Alignment combos</h1>
          <div className="flex items-center gap-2">
            <Select value={sport} onValueChange={(v) => setSport(v as FieldSport)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baseball">Baseball</SelectItem>
                <SelectItem value="softball">Softball</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={startNew}>
              <Plus className="h-4 w-4 mr-1" /> New combo
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          A combo stacks a base alignment with ordered situational overrides.
          Each layer is applied on top of the previous. Use these to codify
          plays like "Base 4-3 → runner on 2B shift → LHH pull shade".
        </p>

        {/* List */}
        <div className="grid gap-3 sm:grid-cols-2">
          {(combosQ.data ?? []).map((c) => (
            <Card key={c.id}
                  onClick={() => setEditing(c)}
                  className="p-4 cursor-pointer hover:bg-accent transition-colors">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold">{c.name}</span>
                <Badge variant="outline" className="capitalize text-[10px]">{c.sport}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {c.layers.length} layer{c.layers.length === 1 ? "" : "s"}
              </div>
            </Card>
          ))}
          {(!combosQ.data || combosQ.data.length === 0) && !combosQ.isLoading && (
            <Card className="p-8 text-center text-muted-foreground text-sm sm:col-span-2">
              No combos yet. Create one to codify layered defensive presets.
            </Card>
          )}
        </div>

        {/* Editor */}
        {editing && (
          <Card className="p-5 space-y-4 border-primary/40">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-bold">{isNew ? "New combo" : `Edit — ${editing.name}`}</h2>
              <div className="flex gap-2">
                {!isNew && (
                  <Button size="sm" variant="outline"
                          onClick={() => window.confirm("Delete this combo?") && deleteMut.mutate(editing.id)}
                          disabled={deleteMut.isPending}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button size="sm" onClick={() => saveMut.mutate(editing)} disabled={saveMut.isPending}>
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="combo-name">Name</Label>
                <Input id="combo-name" value={editing.name}
                       onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                       placeholder="e.g. Runner on 2B, no outs · LHH shift" />
              </div>
              <div className="space-y-1">
                <Label>Base alignment</Label>
                <Select
                  value={editing.base_alignment_id ?? ""}
                  onValueChange={(v) => setEditing({ ...editing, base_alignment_id: v || null })}
                >
                  <SelectTrigger><SelectValue placeholder="Choose base…" /></SelectTrigger>
                  <SelectContent>
                    {(presetsQ.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.preset_key}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Current: {baseName}</p>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2}
                        value={editing.notes ?? ""}
                        onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                        placeholder="When to use this combo…" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Override layers</Label>
                <Button size="sm" variant="outline"
                        onClick={() => setEditing({
                          ...editing,
                          layers: [...editing.layers, { label: "", note: "" }],
                        })}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add layer
                </Button>
              </div>
              {editing.layers.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Add layers to stack overrides on top of the base alignment.
                </p>
              )}
              {editing.layers.map((L, i) => (
                <Card key={i} className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">Layer {i + 1}</Badge>
                    <Input value={L.label}
                           onChange={(e) => updateLayer(i, { label: e.target.value })}
                           placeholder="Layer name (e.g. LHH pull shade)" />
                    <Button size="icon" variant="ghost" onClick={() => move(i, -1)} aria-label="Move up">
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => move(i, 1)} aria-label="Move down">
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost"
                            onClick={() => setEditing({
                              ...editing,
                              layers: editing.layers.filter((_, j) => j !== i),
                            })}
                            aria-label="Remove layer">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea rows={2}
                            value={L.note}
                            onChange={(e) => updateLayer(i, { note: e.target.value })}
                            placeholder="What this layer changes and why…" />
                </Card>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
