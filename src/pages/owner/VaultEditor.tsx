/**
 * Owner Exercise Vault — full card editor for one exercise.
 * Draft → double-check validator → phone-size preview → Make live → Undo.
 * Talks to the owner/admin-only exercise-vault function.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { validateExercise, MEASURE_TYPES, CATALOG_CATEGORIES, type VaultExercise } from "@/lib/vault/validateExercise";
import { ExerciseVideo } from "@/components/hammer/cards/ExerciseVideo";
import { WARMUP_STAGES } from "@/lib/hammer/prescription/warmupStages";
import { defaultWarmupStage, sampleWarmupWith, stageLabel } from "@/lib/vault/warmupStageVault";

const CARD_TYPES = ["lift", "primer", "conditioning", "recovery", "speed", "warmup", "bat_speed", "throwing", "pitching", "windmill", "defense", "baserunning", "cross_sport", "mobility", "arm_care"];
const SPORTS = ["baseball", "softball"];
// Canonical catalog phase codes — the planner matches these exactly.
const PHASES = ["os_q1", "os_q2", "os_q3", "os_q4", "pre_season", "in_season", "post_season"];
const REST_RULES = ["lift_day", "hard_running", "high_jumps", "heavy_bat", "light_bat", "throwing", "none"];
const PRIMER_ROLES = ["none", "primer_lift", "explosive_action"];

type Props = {
  slug: string;
  base: { name: string; category: string | null; sport_scope: string | null; min_age_years: number | null; season_eligibility: string[] | null; equipment: string[] | null; equipment_alternatives?: string[][]; default_sets: number | null; default_reps: number | null; dosage_unit: string | null };
  baseHowTo: string;
  onClose: () => void;
  /** Brand-new exercise: the slug is editable and make_live enters it into the planner's catalog. */
  isNew?: boolean;
};

const toList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const num = (s: string) => (s.trim() === "" ? null : Number(s));

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

export default function VaultEditor({ slug: baseSlug, base, baseHowTo, onClose, isNew = false }: Props) {
  const qc = useQueryClient();
  const [e, setE] = useState<VaultExercise>({
    slug: baseSlug,
    name: base.name,
    how_to_one_rep: baseHowTo && baseHowTo !== "— not written yet" ? baseHowTo : "",
    setup: "", steps: "", cue: "", why: "", stop_if: "",
    movements: [],
    default_sets: base.default_sets, default_reps: base.default_reps,
    default_seconds: null, default_distance_ft: null, default_load_pct: null,
    measure_type: "reps",
    equipment: base.equipment ?? [],
    equipment_alternatives: base.equipment_alternatives ?? [],
    card_type: base.category ?? "",
    sports: base.sport_scope === "both" || !base.sport_scope ? [...SPORTS] : [base.sport_scope],
    season_phases: base.season_eligibility ?? [...PHASES],
    min_age: base.min_age_years ?? null,
    rest_rule: "none",
    arm_weight: null,
    primer_role: "none",
    video_url: null,
    catalog_category: null,
    warmup_stage: base.category === "warmup" && !isNew ? defaultWarmupStage(baseSlug, base.name) : null,
    warmup_stage_order: null,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const slug = isNew ? e.slug.trim() : baseSlug;

  const problems = useMemo(() => validateExercise(e, { isNew }), [e, isNew]);

  const { data: history } = useQuery({
    queryKey: ["vault-history", slug],
    enabled: !isNew || slug.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("exercise-vault", { body: { action: "list", slug } });
      if (error) throw error;
      return data as { versions: Array<{ version: number; apply_today: boolean; effective_from: string; undone_at: string | null; made_live_at: string }>; drafts: Array<{ status: string; validation: string[]; updated_at: string }> };
    },
  });

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action); setMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("exercise-vault", { body: { action, slug, ...extra } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMsg(action === "save_draft" ? "Draft saved." : action === "make_live" ? "Made live — applies from the next plan." : "Undone — the previous version is live again.");
      qc.invalidateQueries({ queryKey: ["vault-history", slug] });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const set = <K extends keyof VaultExercise>(k: K, v: VaultExercise[K]) => setE((p) => ({ ...p, [k]: v }));
  const live = history?.versions.find((v) => !v.undone_at);

  const uploadVideo = async (file: File) => {
    setMsg(null);
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
      setMsg("The video must be an MP4, WebM or MOV file."); return;
    }
    if (file.size > 200 * 1024 * 1024) { setMsg("The video must be under 200 MB."); return; }
    setBusy("upload");
    try {
      const path = `${slug}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("exercise-videos").upload(path, file, { contentType: file.type });
      if (error) throw error;
      set("video_url", `exercise-videos/${path}`);
      setMsg("Video uploaded — save the draft to keep it.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "The upload failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-4 space-y-4" data-vault-editor={slug}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{isNew ? "Add a new exercise" : `Edit: ${base.name}`}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {isNew && (
          <Field label="Code (lowercase letters, numbers and _)">
            <Input value={e.slug} placeholder="e.g. band_face_pull_slow" onChange={(ev) => set("slug", ev.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
          </Field>
        )}
        <Field label="Full name"><Input value={e.name} onChange={(ev) => set("name", ev.target.value)} /></Field>
        {isNew && (
          <Field label="Planner category (where the plan builder files it)">
            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={e.catalog_category ?? ""} onChange={(ev) => set("catalog_category", ev.target.value || null)}>
              <option value="">Pick…</option>
              {CATALOG_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </select>
          </Field>
        )}
        <Field label="Card type">
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={e.card_type} onChange={(ev) => set("card_type", ev.target.value)}>
            <option value="">Pick…</option>
            {CARD_TYPES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
        </Field>
        {e.card_type === "warmup" && (
          <>
            <Field label="Warm-up stage (required)">
              <select data-vault-warmup-stage className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={e.warmup_stage ?? ""} onChange={(ev) => set("warmup_stage", ev.target.value === "" ? null : Number(ev.target.value))}>
                <option value="">Pick…</option>
                {WARMUP_STAGES.map((st) => <option key={st.stage} value={st.stage}>{st.stage} · {st.name}</option>)}
              </select>
              {e.warmup_stage != null && <span className="text-[11px]">How warm before this: {WARMUP_STAGES[e.warmup_stage]?.warmth}</span>}
            </Field>
            <Field label="Order within stage (optional, 1 = first)">
              <Input inputMode="numeric" data-vault-warmup-order value={e.warmup_stage_order ?? ""} onChange={(ev) => set("warmup_stage_order", num(ev.target.value))} />
            </Field>
          </>
        )}
        <Field label='How to do one rep'><Textarea rows={3} value={e.how_to_one_rep} onChange={(ev) => set("how_to_one_rep", ev.target.value)} /></Field>
        <Field label="Setup"><Textarea rows={3} value={e.setup} onChange={(ev) => set("setup", ev.target.value)} /></Field>
        <Field label="Steps"><Textarea rows={3} value={e.steps} onChange={(ev) => set("steps", ev.target.value)} /></Field>
        <Field label="Key cue"><Input value={e.cue} onChange={(ev) => set("cue", ev.target.value)} /></Field>
        <Field label="Why this movement"><Textarea rows={2} value={e.why} onChange={(ev) => set("why", ev.target.value)} /></Field>
        <Field label="Stop if"><Input value={e.stop_if} onChange={(ev) => set("stop_if", ev.target.value)} /></Field>
        <Field label="Series movements (one per line)"><Textarea rows={4} value={(e.movements ?? []).join("\n")} onChange={(ev) => set("movements", ev.target.value.split("\n"))} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Sets"><Input inputMode="numeric" value={e.default_sets ?? ""} onChange={(ev) => set("default_sets", num(ev.target.value))} /></Field>
          <Field label="Reps"><Input inputMode="numeric" value={e.default_reps ?? ""} onChange={(ev) => set("default_reps", num(ev.target.value))} /></Field>
          <Field label="Seconds"><Input inputMode="numeric" value={e.default_seconds ?? ""} onChange={(ev) => set("default_seconds", num(ev.target.value))} /></Field>
          <Field label="Distance (ft)"><Input inputMode="numeric" value={e.default_distance_ft ?? ""} onChange={(ev) => set("default_distance_ft", num(ev.target.value))} /></Field>
          <Field label="Load %"><Input inputMode="numeric" value={e.default_load_pct ?? ""} onChange={(ev) => set("default_load_pct", num(ev.target.value))} /></Field>
          <Field label="Minimum age"><Input inputMode="numeric" value={e.min_age ?? ""} onChange={(ev) => set("min_age", num(ev.target.value))} /></Field>
        </div>
        <Field label="Measure type">
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={e.measure_type} onChange={(ev) => set("measure_type", ev.target.value)}>
            {MEASURE_TYPES.map((m) => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
          </select>
        </Field>
        <Field label="Equipment (comma-separated, or none)"><Input value={e.equipment.join(", ")} onChange={(ev) => set("equipment", toList(ev.target.value))} /></Field>
        <Field label="Gear options (one complete comma-separated option per line)"><Textarea value={e.equipment_alternatives?.map(group => group.join(", ")).join("\n") ?? ""} onChange={ev => set("equipment_alternatives", ev.target.value.split("\n").filter(line => line.trim()).map(toList))} /></Field>
        <Field label="Sports (comma-separated)"><Input value={e.sports.join(", ")} onChange={(ev) => set("sports", toList(ev.target.value))} /></Field>
        <Field label="Season phases (comma-separated)"><Input value={e.season_phases.join(", ")} onChange={(ev) => set("season_phases", toList(ev.target.value))} /></Field>
        <Field label="Rest-rule category">
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={e.rest_rule} onChange={(ev) => set("rest_rule", ev.target.value)}>
            {REST_RULES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
          </select>
        </Field>
        <Field label="Arm-ledger weight (throws)"><Input inputMode="decimal" value={e.arm_weight ?? ""} onChange={(ev) => set("arm_weight", num(ev.target.value))} /></Field>
        <Field label="Power Primer role">
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={e.primer_role} onChange={(ev) => set("primer_role", ev.target.value as VaultExercise["primer_role"])}>
            {PRIMER_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
          </select>
        </Field>
        <Field label="Video (https link to an MP4/WebM/MOV, or upload)">
          <div className="flex flex-col gap-1">
            <Input value={e.video_url ?? ""} placeholder="https://…/clip.mp4" onChange={(ev) => set("video_url", ev.target.value.trim() || null)} />
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              data-vault-video-upload
              className="text-xs"
              disabled={busy !== null}
              onChange={(ev) => { const f = ev.target.files?.[0]; if (f) void uploadVideo(f); ev.target.value = ""; }}
            />
            {busy === "upload" && <span className="text-xs text-muted-foreground">Uploading…</span>}
          </div>
        </Field>
      </div>

      {/* Double-check validator */}
      <div data-vault-validation>
        <h3 className="text-sm font-semibold">Double-check</h3>
        {problems.length === 0 ? (
          <p className="text-sm text-green-600">All checks pass — ready to make live.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm text-destructive">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
      </div>

      {/* Phone-size preview */}
      <div>
        <h3 className="text-sm font-semibold mb-1">Phone preview</h3>
        <div className="w-[360px] max-w-full rounded-xl border border-border bg-card p-3" data-vault-preview>
          <p className="font-semibold">{e.name || "…"}</p>
          {e.video_url && <div className="mt-2"><ExerciseVideo url={e.video_url} /></div>}
          <p className="text-sm text-muted-foreground mt-1">How to do one rep: {e.how_to_one_rep || "…"}</p>
          {e.setup && <p className="text-sm text-muted-foreground mt-1">Setup: {e.setup}</p>}
          {e.cue && <p className="text-sm mt-1">Cue: {e.cue}</p>}
          {e.stop_if && <p className="text-sm text-destructive mt-1">Stop if: {e.stop_if}</p>}
          {(e.movements ?? []).filter((m) => m.trim()).length > 0 && (
            <ol className="list-decimal pl-5 text-sm mt-1">
              {(e.movements ?? []).filter((m) => m.trim()).map((m, i) => <li key={i}>{m}</li>)}
            </ol>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Default dose: {e.default_sets ?? "–"} × {e.default_reps ?? e.default_seconds ?? e.default_distance_ft ?? "–"} · Measure: {e.measure_type.replace(/_/g, " ")}
          </p>
        </div>
      </div>

      {e.card_type === "warmup" && (
        <div data-vault-warmup-sample>
          <h3 className="text-sm font-semibold mb-1">Where it lands in a sample warm-up</h3>
          {e.warmup_stage == null ? (
            <p className="text-sm text-destructive">Pick a warm-up stage to see where it lands.</p>
          ) : (
            <ol className="w-[360px] max-w-full list-decimal rounded-xl border border-border bg-card p-3 pl-8 text-sm">
              {sampleWarmupWith(slug, e.name, e.warmup_stage, e.warmup_stage_order ?? null).map((r, i) => (
                <li key={i} className={r.self ? "font-bold text-primary" : "text-muted-foreground"}>
                  {r.name} <span className="text-[11px]">— stage {stageLabel(r.stage)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy !== null} onClick={() => call("save_draft", { payload: e, validation: problems, is_new: isNew })}>
          {busy === "save_draft" ? "Saving…" : "Save draft"}
        </Button>
        <Button variant="default" disabled={busy !== null || problems.length > 0} onClick={() => call("make_live")}>
          {busy === "make_live" ? "Making live…" : "Make live (from next plan)"}
        </Button>
        <Button variant="outline" disabled={busy !== null || !live} onClick={() => call("undo")}>
          {busy === "undo" ? "Undoing…" : "Undo last live"}
        </Button>
      </div>
      {msg && <p className="text-sm" data-vault-msg>{msg}</p>}

      {!isNew && <VaultStats slug={slug} />}

      {/* Version history + audit */}
      <div>
        <h3 className="text-sm font-semibold">Version history</h3>
        {live && <Badge variant="secondary">Live: version {live.version} (applies {live.apply_today ? "today" : `from ${live.effective_from}`})</Badge>}
        <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
          {(history?.versions ?? []).map((v) => (
            <li key={v.version}>v{v.version} · {v.undone_at ? "undone" : "live"} · {new Date(v.made_live_at).toLocaleString()}</li>
          ))}
          {(history?.versions ?? []).length === 0 && <li>No live versions yet — the built-in card is in use.</li>}
        </ul>
      </div>
    </Card>
  );
}

function VaultStats({ slug }: { slug: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["vault-stats", slug],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("exercise-vault", { body: { action: "stats", slug } });
      if (error) throw error;
      return data as import("../../../supabase/functions/_shared/vault/exerciseStats").ExerciseStats;
    },
  });
  const fmt = (v: number | null, suffix = "") => (v == null ? "No data yet" : `${v > 0 && suffix === " change" ? "+" : ""}${v}${suffix}`);
  return (
    <div data-vault-stats>
      <h3 className="text-sm font-semibold">Stats</h3>
      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {error && <p className="text-xs text-destructive">Couldn't load stats.</p>}
      {data && (
        <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Times prescribed</dt><dd>{data.timesPrescribed}</dd>
          <dt className="text-muted-foreground">Completion rate</dt><dd>{data.completionRate == null ? "No data yet" : `${data.completionRate}% (${data.completed} done, ${data.missed} missed)`}</dd>
          <dt className="text-muted-foreground">Average effort (1–10)</dt><dd>{fmt(data.averageEffort)}{data.effortLogs ? ` · ${data.effortLogs} logs` : ""}</dd>
          <dt className="text-muted-foreground">Primer quality (1–5)</dt><dd>{fmt(data.averagePrimerQuality)}{data.primerRatings ? ` · ${data.primerRatings} ratings` : ""}</dd>
          <dt className="text-muted-foreground">Performance change, 2 / 4 / 8 weeks</dt><dd>{[data.performanceChange.w2, data.performanceChange.w4, data.performanceChange.w8].map((v) => (v == null ? "—" : v)).join(" / ")}{data.performanceChange.records ? ` · ${data.performanceChange.records} anonymous records` : " · no anonymous records yet"}</dd>
        </dl>
      )}
    </div>
  );
}
