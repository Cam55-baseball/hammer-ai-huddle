import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { testResults } from "@/lib/coach/testRows";
import { Input } from "@/components/ui/input";
import { ISSUE_AREAS, noteTag, type IssueArea } from "@/lib/hammer/coachIssueTags";

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export function CoachTestsTab({ athleteId }: { athleteId: string }) {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["coach-athlete-tests", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("coach_athlete_tests", { _athlete: athleteId });
      if (error) throw error;
      return data ?? [];
    },
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading tests…</p>;
  if (isError) return <p className="text-sm text-muted-foreground">Tests are not available.</p>;
  if (data.length === 0) return <p className="text-sm text-muted-foreground" data-testid="coach-tests-empty">No tests yet.</p>;
  return (
    <div className="space-y-3" data-testid="coach-tests">
      {data.map((t) => {
        const rows = testResults(t.results);
        return (
          <Card key={t.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm capitalize">{t.test_type.replace(/_/g, " ")} test · {fmt(t.test_date)}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {(t.results as any)?._verified === "in_person" ? "Source: facility-verified (in person)" : "Source: athlete-entered"}
              </p>
            </CardHeader>
            <CardContent className="divide-y text-sm">
              {rows.length === 0 ? (
                <p className="text-muted-foreground">No results recorded.</p>
              ) : (
                rows.map((r) => (
                  <div key={r.label} className="flex justify-between py-1">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-medium">{r.value}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function CoachPrivateNotes({ athleteId }: { athleteId: string }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [area, setArea] = useState<IssueArea | null>(null);
  const [label, setLabel] = useState("");
  const key = ["coach-private-notes", athleteId];
  const { data = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_private_notes")
        .select("id, body, created_at, issue_area, issue_label")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coach_private_notes").insert({ athlete_id: athleteId, body: body.trim(), ...noteTag(area, label) });
      if (error) throw error;
    },
    onSuccess: () => { setBody(""); setArea(null); setLabel(""); qc.invalidateQueries({ queryKey: key }); },
    onError: () => toast.error("Couldn't save the note. You can only write notes about players you coach."),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coach_private_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  return (
    <Card data-testid="coach-private-notes">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Private notes</CardTitle>
        <p className="text-xs text-muted-foreground">Only you can see these. The player, parents and other coaches cannot. If you tag an issue, the player sees only the tag and your short label, never the note.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} placeholder="Write a note for yourself…" aria-label="New private note" />
        <div className="space-y-2" data-testid="note-issue-tag">
          <p className="text-xs text-muted-foreground">Tag an issue (optional) — adds help to the player's plan</p>
          <div className="flex flex-wrap gap-1.5">
            {ISSUE_AREAS.map((a) => (
              <Button key={a.id} type="button" size="sm" variant={area === a.id ? "default" : "outline"} className="h-7 text-xs"
                aria-pressed={area === a.id} onClick={() => setArea(area === a.id ? null : a.id)}>{a.label}</Button>
            ))}
          </div>
          {area && <Input value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} aria-label="Short issue label"
            placeholder="e.g. throwing errors on backhand plays" />}
        </div>
        <Button size="sm" disabled={!body.trim() || add.isPending} onClick={() => add.mutate()}>Save note</Button>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.map((n) => (
              <li key={n.id} className="rounded-md border p-2">
                <p className="whitespace-pre-wrap">{n.body}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Note · {fmt(n.created_at)}{n.issue_area ? ` · Tagged: ${ISSUE_AREAS.find((a) => a.id === n.issue_area)?.label ?? n.issue_area}${n.issue_label ? ` — ${n.issue_label}` : ""}` : ""}</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => del.mutate(n.id)}>Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
