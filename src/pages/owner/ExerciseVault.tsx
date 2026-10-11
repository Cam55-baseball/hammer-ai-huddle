/**
 * Owner Exercise Vault — browse & search every exercise that can appear on a card.
 * Owner/admin only (StaffOnlyRoute + RLS). Editing/drafts land in the next step.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BASIC_HOW_TO } from "@/lib/hammer/prescription/basicHowTo.generated";
import VaultEditor from "./VaultEditor";
import reviewTsv from "../../../docs/owner/exercise-descriptions-needed.tsv?raw";

const NEEDS_REVIEW = new Set(
  reviewTsv.split("\n").slice(1).map((l) => l.split("\t")[0]).filter(Boolean),
);

type Row = {
  slug: string; name: string; category: string | null; sport_scope: string | null;
  position_scope: string[] | null; min_age_years: number | null; season_eligibility: string[] | null;
  equipment: string[] | null; is_active: boolean | null; dosage_unit: string | null;
  default_sets: number | null; default_reps: number | null;
};

const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.filter(Boolean) as string[])].sort();

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="flex flex-col text-xs text-muted-foreground gap-1">
      {label}
      <select className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
      </select>
    </label>
  );
}

export default function ExerciseVault() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["exercise-vault", "catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wk_movement_catalog")
        .select("slug,name,category,sport_scope,position_scope,min_age_years,season_eligibility,equipment,is_active,dosage_unit,default_sets,default_reps")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ card: "", sport: "", position: "", phase: "", equipment: "", status: "", age: "", review: "" });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const opts = useMemo(() => ({
    card: uniq(data.map((r) => r.category)),
    sport: uniq(data.map((r) => r.sport_scope)),
    position: uniq(data.flatMap((r) => r.position_scope ?? [])),
    phase: uniq(data.flatMap((r) => r.season_eligibility ?? [])),
    equipment: uniq(data.flatMap((r) => r.equipment ?? [])),
  }), [data]);

  const rows = data.filter((r) => {
    const s = q.trim().toLowerCase();
    if (s && !`${r.name} ${r.slug}`.toLowerCase().includes(s)) return false;
    if (f.card && r.category !== f.card) return false;
    if (f.sport && r.sport_scope !== f.sport) return false;
    if (f.position && !(r.position_scope ?? []).includes(f.position)) return false;
    if (f.phase && !(r.season_eligibility ?? []).includes(f.phase)) return false;
    if (f.equipment && !(r.equipment ?? []).includes(f.equipment)) return false;
    if (f.status === "live" && r.is_active === false) return false;
    if (f.status === "off" && r.is_active !== false) return false;
    if (f.age && (r.min_age_years ?? 0) > Number(f.age)) return false;
    if (f.review === "yes" && !NEEDS_REVIEW.has(r.slug)) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Exercise Vault</h1>
            <p className="text-sm text-muted-foreground">Every exercise that can appear on a card. Owner and admin only.</p>
          </div>
          <button
            type="button"
            data-vault-add
            className="h-9 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
            onClick={() => { setAdding(true); setSelected(null); }}
          >
            Add new exercise
          </button>
        </div>
        <Input placeholder="Search by name or code" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <Select label="Card type" value={f.card} onChange={set("card")} options={opts.card} />
          <Select label="Sport" value={f.sport} onChange={set("sport")} options={opts.sport} />
          <Select label="Position" value={f.position} onChange={set("position")} options={opts.position} />
          <Select label="Season phase" value={f.phase} onChange={set("phase")} options={opts.phase} />
          <Select label="Equipment" value={f.equipment} onChange={set("equipment")} options={opts.equipment} />
          <Select label="Status" value={f.status} onChange={set("status")} options={["live", "off"]} />
          <Select label="Player age" value={f.age} onChange={set("age")} options={["8", "10", "12", "13", "14", "16", "18"]} />
          <Select label="Needs owner review" value={f.review} onChange={set("review")} options={["yes"]} />
        </div>
        <p className="text-sm text-muted-foreground" data-vault-count>
          {isLoading ? "Loading…" : `Showing ${rows.length} of ${data.length} exercises · ${NEEDS_REVIEW.size} need owner review`}
        </p>
        {adding && (
          <VaultEditor
            isNew
            slug=""
            base={{ name: "", category: null, sport_scope: null, min_age_years: null, season_eligibility: null, equipment: [], default_sets: null, default_reps: null, dosage_unit: null }}
            baseHowTo=""
            onClose={() => setAdding(false)}
          />
        )}
        {selected && (() => {
          const r = data.find((x) => x.slug === selected);
          return r ? (
            <VaultEditor
              slug={r.slug}
              base={r}
              baseHowTo={BASIC_HOW_TO[r.slug] ?? ""}
              onClose={() => setSelected(null)}
            />
          ) : null;
        })()}
        <div className="grid gap-2">
          {rows.slice(0, 200).map((r) => (
            <Card key={r.slug} className="p-3 cursor-pointer hover:border-primary/50" data-vault-row={r.slug} onClick={() => setSelected(r.slug)}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{r.name}</span>
                {r.category && <Badge variant="secondary">Card: {r.category.replace(/_/g, " ")}</Badge>}
                {r.is_active === false && <Badge variant="outline">Status: off</Badge>}
                {NEEDS_REVIEW.has(r.slug) && <Badge variant="destructive">Needs owner review</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-1">How to do one rep: {BASIC_HOW_TO[r.slug] ?? "— not written yet"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Default dose: {r.default_sets ?? "–"} × {r.default_reps ?? "–"} {r.dosage_unit ?? ""} · Minimum age: {r.min_age_years ?? "–"} · Equipment: {(r.equipment ?? []).join(", ") || "none"}
              </p>
            </Card>
          ))}
          {rows.length > 200 && <p className="text-xs text-muted-foreground">Narrow the search to see the remaining {rows.length - 200}.</p>}
        </div>
      </div>
    </DashboardLayout>
  );
}
