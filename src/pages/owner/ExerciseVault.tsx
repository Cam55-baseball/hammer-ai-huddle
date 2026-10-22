/**
 * Owner Exercise Vault — browse & search every exercise that can appear on a card.
 * Owner/admin only (StaffOnlyRoute + RLS). Editing/drafts land in the next step.
 */
import { LIFT_TAG_REVIEW } from "@/lib/vault/liftTagReview";
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
import howToTsv from "../../../docs/owner/basic-how-to-review.tsv?raw";
import { buildReviewQueue } from "@/lib/vault/reviewQueue";
import { libraryOnlyRows, warmupStageReviewItems } from "@/lib/vault/warmupStageVault";
import { FIELD_RUNNING_DRILLS } from '@/data/drills/fieldRunningDrills';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

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
      const rows = (data ?? []) as Row[];
      // Every warm-up builder movement is taggable, even ones the catalog doesn't list.
      const extra = libraryOnlyRows(new Set(rows.map((r) => r.slug))) as Row[];
      return [...rows, ...extra].sort((a, b) => a.name.localeCompare(b.name));
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

  const { data: cleared, refetch: refetchCleared } = useQuery({
    queryKey: ["vault-reviewed"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("exercise-vault", { body: { action: "reviewed" } });
      if (error) throw error;
      return { slugs: new Set<string>(data?.slugs ?? []), equipmentReview: (data?.equipmentReview ?? []) as Array<{ slug: string; note: string }> };
    },
  });
  const queue = useMemo(() => buildReviewQueue({ flaggedTsv: reviewTsv, howToTsv, catalog: data, cleared: cleared?.slugs ?? new Set(), equipmentReview: cleared?.equipmentReview, warmupStage: warmupStageReviewItems(data), liftTag: LIFT_TAG_REVIEW }), [data, cleared]);
  const reviewBySlug = useMemo(() => new Map(queue.map((i) => [i.slug, i])), [queue]);
  const NEEDS_REVIEW = reviewBySlug;
  const [approving, setApproving] = useState<string | null>(null);
  const approve = async (slug: string) => {
    setApproving(slug);
    const { data: d, error } = await supabase.functions.invoke("exercise-vault", { body: { action: "approve_review", slug } });
    setApproving(null);
    if (!error && !d?.error) void refetchCleared();
  };

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
        <section className="space-y-2 border-b border-border pb-4" aria-label="Fielding and baserunning issue drills">
          <h2 className="font-semibold">Fielding and baserunning issue drills</h2>
          {FIELD_RUNNING_DRILLS.filter(drill => !q.trim() || `${drill.name} ${drill.violationKeys.join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())).map(drill =>
            <div key={drill.id} className="space-y-2 border-b border-border py-3">
              <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{drill.name}</h3><Badge variant="secondary">Needs owner review</Badge></div>
              <p className="text-xs text-muted-foreground">Sport: {drill.sports.join(', ')} · Category: {drill.category} · Issue tags: {drill.violationKeys.join(', ')}</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm">{drill.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
              <Button asChild size="sm" variant="outline"><Link to={`/owner/drill-builder?drill=${encodeURIComponent(drill.id)}`}>Edit drill and issue tags</Link></Button>
            </div>)}
        </section>
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
              {reviewBySlug.get(r.slug) && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs" data-vault-review={r.slug}>
                  <span className="text-muted-foreground">Review reason: {reviewBySlug.get(r.slug)!.reasons.join(", ")}{reviewBySlug.get(r.slug)!.notes.length ? ` — ${reviewBySlug.get(r.slug)!.notes.join("; ")}` : ""}</span>
                  <button type="button" data-vault-approve className="h-7 rounded-md border border-border px-2 font-semibold" disabled={approving === r.slug} onClick={(e) => { e.stopPropagation(); void approve(r.slug); }}>{approving === r.slug ? "Approving…" : "Approve as written"}</button>
                  <button type="button" className="h-7 rounded-md border border-border px-2 font-semibold" onClick={(e) => { e.stopPropagation(); setSelected(r.slug); }}>Edit</button>
                </div>
              )}
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
