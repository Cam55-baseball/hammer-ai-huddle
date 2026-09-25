/**
 * Child safety — shown only to a minor (or their linked parent) who has at
 * least one accepted scout/coach follow but no guardian consent on record.
 * Athlete: plain explanation + link (athletes cannot give guardian consent).
 * Parent: one tap gives guardian consent and turns profile + video sharing
 * back on, restoring what followers could see before. Metrics stay off.
 */
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";

async function needsGuardian(athleteId: string) {
  const db = supabase as any;
  const [{ data: minor }, { count }, { data: c }] = await Promise.all([
    db.rpc("is_minor", { _user_id: athleteId }),
    db.from("scout_follows").select("id", { count: "exact", head: true }).eq("player_id", athleteId).eq("status", "accepted"),
    db.from("athlete_recruiting_consent").select("parent_authorized, guardian_consented_at").eq("athlete_id", athleteId).maybeSingle(),
  ]);
  if (minor !== true || !count) return false;
  return !(c?.parent_authorized && c?.guardian_consented_at);
}

export function GuardianConsentPrompt({ athleteId, asParent = false }: { athleteId?: string; asParent?: boolean }) {
  const { user } = useOptionalAuth();
  const id = athleteId ?? user?.id;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["guardian-needed", id], enabled: !!id, queryFn: () => needsGuardian(id!), staleTime: 60_000 });
  const give = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const { error } = await (supabase as any).from("athlete_recruiting_consent").upsert({
        athlete_id: id, visibility_enabled: true, parent_authorized: true,
        guardian_consented_at: now, guardian_consented_by: user!.id,
        share_profile: true, share_video: true, last_changed_by: user!.id, engine_version: "rr9-1.1.0",
      }, { onConflict: "athlete_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guardian-needed", id] }),
  });
  if (!q.data) return null;
  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm" data-testid="guardian-consent-prompt">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium">
            {asParent ? "Coaches and scouts who follow this athlete can't see anything until you say yes." : "Coaches and scouts who follow you can't see your profile until a parent or guardian says yes."}
          </p>
          {asParent ? (
            <Button size="sm" className="min-h-11" disabled={give.isPending} onClick={() => give.mutate()}>
              Give guardian consent
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="min-h-11">
              <Link to="/athlete/recruiting-consent">Ask for guardian consent</Link>
            </Button>
          )}
          {give.error && <p className="text-xs text-destructive">Couldn't save — only a linked parent or guardian can give consent.</p>}
        </div>
      </div>
    </div>
  );
}
