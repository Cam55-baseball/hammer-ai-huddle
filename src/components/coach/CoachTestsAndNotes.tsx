import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { testResults } from "@/lib/coach/testRows";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

export const TAG_INSTRUCTIONS = "Tagging an issue adds a card to this player's Before you start, with your reason. The player never sees your note.";

/** Owner Nov 6: the one note form (Coach View Notes + Player week day view). */
export function AddCoachNoteDialog({ athleteId, triggerLabel = "Add a note", big = false, contextLine }: { athleteId: string; triggerLabel?: string; big?: boolean; contextLine?: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(contextLine ? `${contextLine}: ` : "");
  const [area, setArea] = useState<IssueArea | null>(null);
  const [label, setLabel] = useState("");
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coach_private_notes").insert({ athlete_id: athleteId, body: body.trim(), ...noteTag(area, label) });
      if (error) throw error;
    },
    onSuccess: () => { setBody(""); setArea(null); setLabel(""); setOpen(false); toast.success(area ? "Note saved. The tag adds a card to their Before you start." : "Note saved."); qc.invalidateQueries({ queryKey: ["coach-private-notes", athleteId] }); },
    onError: () => toast.error("Couldn't save the note. You can only write notes about players you coach."),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o && contextLine && !body) setBody(`${contextLine}: `); }}>
      <DialogTrigger asChild>
        <Button size={big ? "lg" : "sm"} variant={big ? "default" : "outline"} className={big ? "w-full h-12 text-base" : ""}><Plus className="h-4 w-4" />{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" data-testid="coach-note-form">
        <DialogHeader>
          <DialogTitle>Add a note</DialogTitle>
          <DialogDescription>Only you can see your note. The player, parents and other coaches cannot.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="coach-note-body">Your note</Label>
            <Textarea id="coach-note-body" value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} placeholder="Write a note for yourself…" rows={4} />
          </div>
          <fieldset className="space-y-2 rounded-md border p-3" data-testid="note-issue-tag">
            <legend className="px-1 text-sm font-semibold">Tag an issue (optional)</legend>
            <p className="text-xs text-muted-foreground">{TAG_INSTRUCTIONS}</p>
            <div className="grid grid-cols-2 gap-2">
              {ISSUE_AREAS.map((a) => (
                <Button key={a.id} type="button" variant={area === a.id ? "default" : "outline"} className="h-11"
                  aria-pressed={area === a.id} onClick={() => setArea(area === a.id ? null : a.id)}>{a.label}</Button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coach-note-label">Short issue label</Label>
              <Input id="coach-note-label" value={label} maxLength={120} disabled={!area} onChange={(e) => setLabel(e.target.value)}
                placeholder={area ? "e.g. throwing errors on backhand plays" : "Pick a tag first"} />
              <p className="text-xs text-muted-foreground">The player sees the tag and this label as your reason.</p>
            </div>
          </fieldset>
        </div>
        <DialogFooter>
          <Button className="w-full h-11" disabled={!body.trim() || add.isPending} onClick={() => add.mutate()}>Save note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CoachPrivateNotes({ athleteId }: { athleteId: string }) {
  const qc = useQueryClient();
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
        <CardTitle className="text-base">Notes</CardTitle>
        <p className="text-xs text-muted-foreground">Private to you. Add a note any time, and tag an issue to put help in this player's Before you start.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <AddCoachNoteDialog athleteId={athleteId} big />
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
