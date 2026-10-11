/**
 * Plan v3.1 Phase 2 — parent's sharing checklist for a minor.
 * The parent ticks each item a minor may share. Health and academics are separate and start off.
 * Under 13: the parent also runs the main switch and the item switches; contact is never possible.
 * Server rules: resolve_recruiting_scope + guard_recruiting_parent_checklist.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { CONSENT_SCOPES, SCOPE_LABEL, scopeColumn, type ConsentScope } from "@/lib/recruiting/consentStatus";

const HELP: Record<ConsentScope, string> = {
  profile: "Name, school, position and grad year.",
  metrics: "Test results such as sprint, jump and velocity.",
  video: "Clips they've uploaded.",
  health: "Injury and health notes. Kept separate from everything else.",
  academics: "GPA, test scores and transcript.",
  contact: "Scouts and coaches may message them (you get a copy).",
};

type Row = Record<string, any> | null;

export function ParentSharingChecklist({ athleteId }: { athleteId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["parent-checklist", athleteId],
    queryFn: async () => {
      const [{ data: row }, { data: u13 }] = await Promise.all([
        (supabase as any).from("athlete_recruiting_consent").select("*").eq("athlete_id", athleteId).maybeSingle(),
        supabase.rpc("is_under_13" as any, { _user_id: athleteId }),
      ]);
      return { row: (row ?? null) as Row, under13: u13 !== false };
    },
  });
  const save = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      // Send only what changed, so this card can never undo the parent's other switches.
      const db = supabase as any;
      const { data: existing } = await db.from("athlete_recruiting_consent").select("athlete_id").eq("athlete_id", athleteId).maybeSingle();
      const meta = { last_changed_by: user!.id, engine_version: "rr9-1.2.0" };
      const { error } = existing
        ? await db.from("athlete_recruiting_consent").update({ ...patch, ...meta }).eq("athlete_id", athleteId)
        : await db.from("athlete_recruiting_consent").insert({ athlete_id: athleteId, ...patch, ...meta });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parent-checklist", athleteId] });
      qc.invalidateQueries({ queryKey: ["recruiting-consent", athleteId] });
      qc.invalidateQueries({ queryKey: ["recruiting-consent-audit", athleteId] });
    },
    onError: () => toast({ title: "That didn't save", description: "Only a linked parent can change this.", variant: "destructive" }),
  });

  if (!q.data) return null;
  const row = q.data.row ?? {};
  const under13 = q.data.under13;
  const allowed: string[] = row.parent_allowed_scopes ?? [];
  const scopes = CONSENT_SCOPES.filter((s) => !(under13 && s === "contact"));

  const toggle = (s: ConsentScope, on: boolean) => {
    const next = on ? [...new Set([...allowed, s])] : allowed.filter((x) => x !== s);
    const patch: Record<string, unknown> = { parent_allowed_scopes: next };
    // Under 13 the parent runs the account, so the item itself turns on/off too.
    if (under13) patch[scopeColumn(s)] = on;
    save.mutate(patch);
  };

  return (
    <Card data-testid="parent-sharing-checklist">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">What your athlete may share</CardTitle>
        <p className="text-sm text-muted-foreground">
          {under13
            ? "Under 13: you decide everything. Scouts and coaches can never contact your child — only you."
            : "Tick what your athlete is allowed to share. They can still keep any item off."}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {under13 && (
          <div className="flex min-h-11 items-center justify-between gap-3 rounded border p-3">
            <Label htmlFor="pc-visibility" className="text-sm font-medium">Scouting visibility</Label>
            <Switch id="pc-visibility" className="shrink-0" checked={!!row.visibility_enabled} disabled={save.isPending}
              onCheckedChange={(v) => save.mutate({ visibility_enabled: v })} />
          </div>
        )}
        {scopes.map((s) => (
          <div key={s} className="flex min-h-11 items-center justify-between gap-3 rounded border p-3">
            <div className="min-w-0">
              <Label htmlFor={`pc-${s}`} className="text-sm font-medium">{SCOPE_LABEL[s]}</Label>
              <p className="text-xs text-muted-foreground">{HELP[s]}</p>
            </div>
            <Switch id={`pc-${s}`} className="shrink-0" checked={allowed.includes(s)} disabled={save.isPending}
              onCheckedChange={(v) => toggle(s, v)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
