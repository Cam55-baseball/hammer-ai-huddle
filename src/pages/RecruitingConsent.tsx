/**
 * Athlete-owned recruiting consent (RR-9 / RR-10, v1.1 granular).
 * Four separate choices: profile, metrics, video, contact.
 * Under 18: nothing visible until a guardian's consent (who + when) is on record.
 * One tap stops all sharing immediately. Every change is logged.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRecruitingConsent, useRecruitingConsentAudit } from "@/hooks/useRecruitingConsent";
import { toast } from "@/hooks/use-toast";
import {
  CONSENT_SCOPES, SCOPE_LABEL, scopeColumn, statusLine, guardianCleared, type GranularConsent,
} from "@/lib/recruiting/consentStatus";

const SCOPE_HELP: Record<string, string> = {
  profile: "Name, school, position and grad year.",
  metrics: "Test results such as sprint, jump and velocity.",
  video: "Clips you've uploaded.",
  contact: "Scouts and coaches may message you.",
};

export default function RecruitingConsent() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const athleteId = user?.id;
  const { consent, isLoading, setVisibility, setScope, isSaving } = useRecruitingConsent(athleteId);
  const { data: audit } = useRecruitingConsentAudit(athleteId);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  const fail = () =>
    toast({ title: "That didn't save", description: "Please check your connection and try again.", variant: "destructive" });

  if (loading || isLoading || !consent) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-2xl p-4">
          <div className="h-64 animate-pulse rounded-md bg-muted/40" />
        </div>
      </DashboardLayout>
    );
  }

  const g = consent as unknown as GranularConsent;
  const line = statusLine(g);
  const visibleNow = consent.visibility_enabled && guardianCleared(g);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">Recruiting sharing</h1>
          <p className="text-sm text-muted-foreground">You decide what scouts and coaches can see. Nobody else can change this.</p>
        </header>

        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-start gap-2">
              {visibleNow ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> : <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />}
              <p className="text-sm font-medium" data-testid="consent-status-line">{line}</p>
            </div>
            {consent.is_minor && (
              <p className="text-xs text-muted-foreground">
                {consent.guardian_consented_at
                  ? `Guardian consent given ${new Date(consent.guardian_consented_at).toLocaleDateString()}.`
                  : "Because you're under 18, a parent or guardian has to say yes before anything is shared."}
              </p>
            )}
            <div className="flex min-h-11 items-center justify-between gap-3 rounded border p-3">
              <Label htmlFor="visibility" className="text-sm font-medium">Share with scouts and coaches</Label>
              <Switch id="visibility" className="shrink-0" checked={consent.visibility_enabled} disabled={isSaving}
                onCheckedChange={(v) => setVisibility(v).catch(fail)} />
            </div>
            {consent.visibility_enabled && (
              <Button variant="destructive" className="min-h-11 w-full" disabled={isSaving}
                onClick={() => setVisibility(false).then(() => toast({ title: "Sharing stopped", description: "Nobody can see anything now." })).catch(fail)}>
                Stop sharing everything
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">What to share</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {CONSENT_SCOPES.map((s) => {
              const col = scopeColumn(s);
              return (
                <div key={s} className="flex min-h-11 items-center justify-between gap-3 rounded border p-3">
                  <div className="min-w-0">
                    <Label htmlFor={`scope-${s}`} className="text-sm font-medium">{SCOPE_LABEL[s]}</Label>
                    <p className="text-xs text-muted-foreground">{SCOPE_HELP[s]}</p>
                  </div>
                  <Switch id={`scope-${s}`} className="shrink-0" checked={consent[col]} disabled={isSaving}
                    onCheckedChange={(v) => setScope({ [col]: v }).catch(fail)} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Change history</CardTitle></CardHeader>
          <CardContent>
            {!audit || audit.length === 0 ? (
              <p className="text-xs text-muted-foreground">No changes yet. Every change you or your guardian make will show here with the time.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {audit.map((row) => {
                  const ns = row.new_state as Record<string, boolean>;
                  const on = CONSENT_SCOPES.filter((s) => ns[scopeColumn(s)]).map((s) => SCOPE_LABEL[s]);
                  return (
                    <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                      <span>{row.actor_role === "parent" ? "Guardian: " : ""}{ns.visibility_enabled ? `Sharing on${on.length ? ` (${on.join(", ")})` : ""}` : "Sharing off"}{ns.parent_authorized ? " · guardian yes" : ""}</span>
                      <span className="text-muted-foreground">{new Date(row.changed_at).toLocaleString()}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
