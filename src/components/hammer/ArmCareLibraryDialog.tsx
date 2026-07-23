import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ArmCareMovement {
  slug: string;
  name: string;
  cue: string | null;
  why_prescribed: string | null;
  source_philosophy: string | null;
  arm_care_category: string | null;
  throwing_phase: string | null;
  sport_scope: string | null;
  position_scope: string[] | null;
  equipment: string[] | null;
  default_sets: number | null;
  default_reps: number | null;
  min_training_age_years: number | null;
}

const FAMILIES: { key: string; label: string }[] = [
  { key: "all", label: "All methods" },
  { key: "jaeger_jband", label: "Jaeger J-Band" },
  { key: "xband", label: "XBand" },
  { key: "jobes", label: "Jobes" },
  { key: "crossover_symmetry", label: "Crossover Symmetry" },
  { key: "cressey", label: "Cressey" },
  { key: "driveline", label: "Driveline PlyoCare" },
  { key: "oates", label: "Oates Shoulder Tube" },
  { key: "isometric", label: "Isometrics" },
  { key: "softball_windmill", label: "Windmill (Softball)" },
  { key: "forearm_wrist", label: "Forearm & Wrist" },
  { key: "recovery", label: "Recovery" },
];

export interface ArmCareLibraryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sport?: "baseball" | "softball";
}

export function ArmCareLibraryDialog({ open, onOpenChange, sport }: ArmCareLibraryDialogProps) {
  const [family, setFamily] = useState<string>("all");
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["arm_care_library", sport ?? "both"],
    enabled: open,
    queryFn: async () => {
      const q = supabase
        .from("wk_movement_catalog")
        .select("slug,name,cue,why_prescribed,source_philosophy,arm_care_category,throwing_phase,sport_scope,position_scope,equipment,default_sets,default_reps,min_training_age_years")
        .eq("category", "arm_care")
        .order("source_philosophy", { ascending: true })
        .order("name", { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ArmCareMovement[];
    },
  });

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (sport) rows = rows.filter((r) => !r.sport_scope || r.sport_scope === "both" || r.sport_scope === sport);
    if (family !== "all") rows = rows.filter((r) => r.source_philosophy === family);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q) || (r.cue ?? "").toLowerCase().includes(q));
    }
    return rows;
  }, [data, family, query, sport]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Arm Care Library</DialogTitle>
          <DialogDescription>
            Elite arm care built from Jaeger, XBand, Jobes, Crossover Symmetry, Cressey, Driveline, and windmill-specific work.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Search movement or cue…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {FAMILIES.map((f) => (
              <Button
                key={f.key}
                type="button"
                size="sm"
                variant={family === f.key ? "default" : "outline"}
                onClick={() => setFamily(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          <ScrollArea className="h-[420px] pr-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground p-4">Loading movements…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">No movements match this filter.</p>
            ) : (
              <ul className="space-y-2">
                {filtered.map((m) => (
                  <li key={m.slug} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{m.name}</p>
                        {m.cue ? <p className="text-sm text-muted-foreground mt-0.5">{m.cue}</p> : null}
                        {m.why_prescribed ? <p className="text-xs text-muted-foreground mt-1 italic">{m.why_prescribed}</p> : null}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {m.default_sets && m.default_reps ? (
                          <Badge variant="secondary" className="text-xs">
                            {m.default_sets} × {m.default_reps}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.throwing_phase ? <Badge variant="outline" className="text-[10px]">{m.throwing_phase.replace(/_/g, " ")}</Badge> : null}
                      {m.arm_care_category ? <Badge variant="outline" className="text-[10px]">{m.arm_care_category}</Badge> : null}
                      {m.sport_scope && m.sport_scope !== "both" ? <Badge variant="outline" className="text-[10px]">{m.sport_scope}</Badge> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ArmCareLibraryDialog;
