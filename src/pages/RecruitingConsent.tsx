/**
 * Athlete-owned recruiting visibility consent surface.
 *
 * Single canonical surface where an athlete can enable or disable
 * their recruiting visibility (RR-9). No coach / recruiter / scout
 * authority. Parent authorization (RR-10) is read-only here and
 * managed separately by the parent relationship surface.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useRecruitingConsent,
  useRecruitingConsentAudit,
} from "@/hooks/useRecruitingConsent";
import { toast } from "@/hooks/use-toast";

export default function RecruitingConsent() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const athleteId = user?.id;

  const { consent, isLoading, setVisibility, isSaving } = useRecruitingConsent(athleteId);
  const { data: audit } = useRecruitingConsentAudit(athleteId);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  const handleToggle = async (next: boolean) => {
    try {
      await setVisibility(next);
      toast({
        title: next ? "Recruiting visibility enabled" : "Recruiting visibility disabled",
        description: next
          ? "Coaches, recruiters, and scouts can now see your recruiting snapshot."
          : "Your recruiting snapshot is now hidden from all viewers.",
      });
    } catch (e) {
      toast({
        title: "Could not update visibility",
        description: (e as Error)?.message ?? "Unknown error",
        variant: "destructive",
      });
    }
  };

  if (loading || isLoading || !consent) {
    return (
      <DashboardLayout>
        <div className="h-64 animate-pulse rounded-md bg-muted/40" />
      </DashboardLayout>
    );
  }

  const minorBlocked = consent.is_minor && !consent.parent_authorized;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">Recruiting Visibility</h1>
          <p className="text-sm text-muted-foreground">
            You control whether your recruiting snapshot is visible to coaches,
            recruiters, and scouts. This setting is yours alone — no viewer can
            change it for you.
          </p>
        </header>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                {consent.resolved_visibility ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                )}
                Current status
              </span>
              <Badge variant={consent.resolved_visibility ? "default" : "outline"}>
                {consent.resolved_visibility ? "Visible to recruiters" : "Hidden"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded border p-3">
              <div>
                <Label htmlFor="visibility" className="text-sm font-medium">
                  Enable recruiting visibility
                </Label>
                <p className="text-xs text-muted-foreground">
                  When on, coaches/recruiters/scouts with an active relationship can
                  view your recruiting snapshot.
                </p>
              </div>
              <Switch
                id="visibility"
                checked={consent.visibility_enabled}
                onCheckedChange={handleToggle}
                disabled={isSaving || minorBlocked}
              />
            </div>

            {minorBlocked && (
              <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <strong>Minor protection (RR-10).</strong> A parent or guardian
                  must authorize recruiting visibility before it can be enabled.
                  Until then, you remain hidden from recruiters regardless of this
                  toggle.
                </div>
              </div>
            )}

            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded border p-2">
                <dt className="text-muted-foreground">Visibility enabled</dt>
                <dd className="font-medium">{consent.visibility_enabled ? "Yes" : "No"}</dd>
              </div>
              <div className="rounded border p-2">
                <dt className="text-muted-foreground">Minor status</dt>
                <dd className="font-medium">{consent.is_minor ? "Minor" : "Adult"}</dd>
              </div>
              <div className="rounded border p-2">
                <dt className="text-muted-foreground">Parent authorization</dt>
                <dd className="font-medium">
                  {consent.parent_authorized ? "Authorized" : "Not authorized"}
                </dd>
              </div>
              <div className="rounded border p-2">
                <dt className="text-muted-foreground">Resolved visibility</dt>
                <dd className="font-medium">
                  {consent.resolved_visibility ? "Shown to recruiters" : "Hidden"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Consequences of enabling visibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>· Coaches, recruiters, and scouts with an active relationship can view your aggregate recruiting snapshot.</p>
            <p>· No raw rep data, no pain correlations, and no comparative ranking against named peers are exposed.</p>
            <p>· You can disable visibility at any time; viewers lose access on the next refresh.</p>
            <p>· Every change to this setting is recorded in your audit history.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent changes</CardTitle>
          </CardHeader>
          <CardContent>
            {!audit || audit.length === 0 ? (
              <p className="text-xs text-muted-foreground">No changes recorded yet.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {audit.map((row) => {
                  const ns = row.new_state as { visibility_enabled?: boolean };
                  return (
                    <li
                      key={row.id}
                      className="flex items-center justify-between rounded border p-2"
                    >
                      <span>
                        Visibility {ns.visibility_enabled ? "enabled" : "disabled"}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(row.changed_at).toLocaleString()}
                      </span>
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
