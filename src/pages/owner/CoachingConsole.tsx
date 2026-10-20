/** Owner's Coaching Console (Intelligence step 7) — owner/admin only. */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { OWNER_QUESTIONS, questionSituation, currentQuestionAnswer, type OwnerQuestion } from '@/lib/intelligence/ownerQuestions';
import {
  EVIDENCE_LABEL, badgeFor, declaredPrincipleVersion, SMALL_GROUP_NOTE,
  type EvidenceKind, type Principle, type PrincipleStats, type PrincipleVersion,
} from "@/lib/intelligence/principles";

const AREAS = ["results", "mechanics", "mindset", "mental game", "game planning"];
const db = supabase as any;

type Form = {
  body: string; sport: string; area: string; situation: string; applies_when: string;
  not_when: string; connected_work: string; evidence_kind: EvidenceKind; evidence_note: string;
};
const EMPTY: Form = {
  body: "", sport: "both", area: "mechanics", situation: "", applies_when: "", not_when: "",
  connected_work: "", evidence_kind: "experience", evidence_note: "",
};

export default function CoachingConsole() {
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const focus = params.get("principle");
  const [form, setForm] = useState<Form>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["coaching-console"],
    queryFn: async () => {
      const [p, v, s] = await Promise.all([
        db.from("coaching_principles").select("id, active, current_version").order("created_at", { ascending: false }),
        db.from("coaching_principle_versions").select("*").order("version", { ascending: true }),
        db.rpc("owner_principle_population_stats"),
      ]);
      if (p.error) throw p.error;
      if (v.error) throw v.error;
      if (s.error) throw s.error;
      const stats = new Map<string, PrincipleStats>(((s.data ?? []) as any[]).map((r) => [r.principle_id, r]));
      return { principles: (p.data ?? []) as Principle[], versions: (v.data ?? []) as PrincipleVersion[], stats };
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["coaching-console"] });
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setSaving(true); setSaveError(null);
    try {
    const { error } = await db.rpc("owner_save_principle", {
      _principle: editing, _body: form.body, _sport: form.sport, _area: form.area,
      _situation: form.situation || null, _applies_when: form.applies_when || null,
      _not_when: form.not_when || null, _connected_work: form.connected_work || null,
      _evidence_kind: form.evidence_kind, _evidence_note: form.evidence_note || null,
    });
    if (error) throw error;
    await refresh();
    setForm(EMPTY); setEditing(null);
    } catch {
      setSaveError("We couldn't save this principle. Please try again.");
    } finally { setSaving(false); }
  };

  const toggle = async (id: string, active: boolean) => {
    const { error } = await db.from("coaching_principles").update({ active, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) setSaveError("We couldn't change the switch. Please try again.");
    refresh();
  };

  const startEdit = (v: PrincipleVersion) => {
    setEditing(v.principle_id);
    setForm({
      body: v.body, sport: v.sport, area: v.area, situation: v.situation ?? "", applies_when: v.applies_when ?? "",
      not_when: v.not_when ?? "", connected_work: v.connected_work ?? "", evidence_kind: v.evidence_kind,
      evidence_note: v.evidence_note ?? "",
    });
    window.scrollTo({ top: 0 });
  };

  const answerQuestion = (question: OwnerQuestion, answer: string) => {
    const previous = currentQuestionAnswer(question, data?.principles ?? [], data?.versions ?? []);
    setEditing(previous?.principle.id ?? null);
    setForm({ ...EMPTY, body: answer, sport: question.sport, area: question.area,
      situation: questionSituation(question.id),
      applies_when: `${question.subscription}; ages 13–15, 16–17 and adults, as specified in the answer`,
      not_when: 'Never override pain, equipment, subscription, rest, throwing or game-day rules.',
      evidence_note: question.question });
    setSaveError(null);
    document.getElementById('cp-body')?.focus();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-16">
      <h1 className="text-2xl font-bold">Coaching Console</h1>
      <p className="text-sm text-muted-foreground">Teach Hammers what you believe. Edits make a new version; old versions are kept.</p>

      <section className="space-y-3 border-b border-border pb-4" aria-label="Questions for the owner">
        <h2 className="text-lg font-semibold">Questions for the owner</h2>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading saved answers…</p> : isError ?
          <p role="alert" className="text-sm text-destructive">Couldn't check saved answers. Try again later.</p> :
          OWNER_QUESTIONS.map(question => {
            const saved = currentQuestionAnswer(question, data?.principles ?? [], data?.versions ?? []);
            const answer = saved?.version;
            return <div key={question.id} className="space-y-2 border-b border-border py-3">
              <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{question.sport} · {question.subscription}</Badge>
                <Badge variant="secondary">{answer ? `Answered · version ${answer.version} · ${saved?.principle.active ? 'On' : 'Off'}` : 'Needs an answer'}</Badge></div>
              <p className="text-sm font-medium">{question.question}</p>
              {answer && <>
                <p className="break-words text-sm text-muted-foreground">Current answer: {answer.body}</p>
                <p className="text-xs text-muted-foreground">Saved: {Number.isFinite(Date.parse(answer.created_at)) ? new Date(answer.created_at).toLocaleString() : 'Date unavailable'}</p>
                <a className="text-sm text-primary underline" href={`#principle-${saved.principle.id}`}>Review answer and versions</a>
              </>}
              <div className="flex flex-col gap-2">
                {question.options.map(option => <Button key={option} variant="outline" className="h-auto min-h-11 justify-start whitespace-normal text-left" onClick={() => answerQuestion(question, option)}>{option}</Button>)}
                <Button variant="ghost" className="justify-start" onClick={() => answerQuestion(question, answer?.body ?? '')}>Write my answer</Button>
              </div>
            </div>;
          })}
      </section>

      <Card className="space-y-3 p-4" aria-label="Write a principle">
        <h2 className="font-semibold">{editing ? "Edit principle (saves a new version)" : "Write a principle"}</h2>
        <div className="space-y-1"><Label htmlFor="cp-body">Principle</Label>
          <Textarea id="cp-body" value={form.body} onChange={set("body")} placeholder="In plain words" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><Label htmlFor="cp-sport">Sport</Label>
            <select id="cp-sport" className="h-10 w-full rounded-md border bg-background px-2" value={form.sport} onChange={set("sport")}>
              <option value="both">Both</option><option value="baseball">Baseball</option><option value="softball">Softball</option>
            </select></div>
          <div className="space-y-1"><Label htmlFor="cp-area">Area</Label>
            <select id="cp-area" className="h-10 w-full rounded-md border bg-background px-2" value={form.area} onChange={set("area")}>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select></div>
        </div>
        <div className="space-y-1"><Label htmlFor="cp-sit">Situation</Label><Input id="cp-sit" value={form.situation} onChange={set("situation")} /></div>
        <div className="space-y-1"><Label htmlFor="cp-when">When it applies</Label><Input id="cp-when" value={form.applies_when} onChange={set("applies_when")} /></div>
        <div className="space-y-1"><Label htmlFor="cp-not">When it doesn't</Label><Input id="cp-not" value={form.not_when} onChange={set("not_when")} /></div>
        <div className="space-y-1"><Label htmlFor="cp-work">Connected drills or exercises</Label><Input id="cp-work" value={form.connected_work} onChange={set("connected_work")} /></div>
        <div className="space-y-1"><Label htmlFor="cp-ev">Evidence</Label>
          <select id="cp-ev" className="h-10 w-full rounded-md border bg-background px-2" value={form.evidence_kind} onChange={set("evidence_kind")}>
            {(Object.keys(EVIDENCE_LABEL) as EvidenceKind[]).map((k) => <option key={k} value={k}>{EVIDENCE_LABEL[k]}</option>)}
          </select></div>
        <div className="space-y-1"><Label htmlFor="cp-evn">Evidence note</Label><Input id="cp-evn" value={form.evidence_note} onChange={set("evidence_note")} /></div>
        {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving || !form.body.trim()}>{editing ? "Save new version" : "Save principle"}</Button>
          {editing && <Button variant="outline" onClick={() => { setEditing(null); setForm(EMPTY); }}>Cancel</Button>}
        </div>
      </Card>

      {isLoading ? null : isError ? (
        <p role="alert" className="text-sm text-muted-foreground">We couldn't load your principles. Please try again later.</p>
      ) : !data?.principles.length ? (
        <p className="text-sm text-muted-foreground">No principles yet. Write your first one above.</p>
      ) : (
        <section className="space-y-3" aria-label="Your principles">
          {data.principles.map((p) => {
            const history = data.versions.filter((v) => v.principle_id === p.id);
            const cur = declaredPrincipleVersion(p, history);
            if (!cur) return <p key={p.id} role="alert" className="text-sm text-destructive">Couldn't identify the current principle version. Editing is unavailable.</p>;
            const s = data.stats.get(p.id);
            return (
              <Card key={p.id} id={`principle-${p.id}`} className={`space-y-2 p-4 ${focus === p.id ? "ring-2 ring-primary" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{badgeFor(s)}</Badge>
                  <Badge variant="outline">Version {cur.version}</Badge>
                  <Badge variant="outline">{cur.sport} · {cur.area}</Badge>
                </div>
                <p className="text-lg font-semibold">{cur.body}</p>
                <p className="text-sm">Evidence: {EVIDENCE_LABEL[cur.evidence_kind]}{cur.evidence_note ? ` — ${cur.evidence_note}` : ""}</p>
                {cur.applies_when && <p className="text-sm">When it applies: {cur.applies_when}</p>}
                {cur.not_when && <p className="text-sm">When it doesn't: {cur.not_when}</p>}
                <div className="flex items-center gap-2">
                  <Switch id={`on-${p.id}`} checked={p.active} onCheckedChange={(c) => toggle(p.id, c)} aria-label="Hammers uses it" />
                  <Label htmlFor={`on-${p.id}`}>Hammers uses it: {p.active ? "On" : "Off"}</Label>
                </div>
                {s?.hidden_small_group ? (
                  <p className="text-sm text-muted-foreground">{SMALL_GROUP_NOTE}</p>
                ) : (
                  <p className="text-sm">
                    Advice given: {s?.advice ?? 0} · Followed: {s?.followed ?? 0} · Players who followed: {s?.players_followed ?? 0}
                  </p>
                )}
                <p className="text-sm">
                  Results: {s && s.worked != null && s.worked + (s.no_change ?? 0) + (s.got_worse ?? 0) > 0
                    ? `It worked ${s.worked} · No change ${s.no_change} · Got worse ${s.got_worse}`
                    : "Need more data"}
                </p>
                <details>
                  <summary className="cursor-pointer text-sm text-primary">All versions ({history.length})</summary>
                  <ul className="mt-2 space-y-1 text-sm">
                    {[...history].reverse().map((v) => (
                      <li key={v.id}>Version {v.version} ({new Date(v.created_at).toLocaleDateString()}): {v.body}</li>
                    ))}
                  </ul>
                </details>
                <Button size="sm" variant="outline" onClick={() => startEdit(cur)}>Edit</Button>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}
