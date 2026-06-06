/**
 * RR-10 — Parent recruiting authorization surface.
 *
 * Canonical write path for `parent_authorized`. Mount-gated by
 * `useIsAuthorizingParent`; the DB rejects unauthorized writes via
 * `enforce_parent_authorization_authority` regardless.
 */
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAuthorizingParent } from "@/hooks/useParentLink";
import { useParentRecruitingAuthorization } from "@/hooks/useParentRecruitingAuthorization";
import { useRecruitingConsentAudit } from "@/hooks/useRecruitingConsent";
import { toast } from "@/hooks/use-toast";

export default function ParentRecruitingAuthorization() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: isParent, isLoading: linkLoading } = useIsAuthorizingParent(athleteId);
  const { state, isLoading, setParentAuthorized, isSaving } =
    useParentRecruitingAuthorization(athleteId);
  const { data: audit } = useRecruitingConsentAudit(athleteId);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  const handleToggle = async (next: boolean) => {
    try {
      await setParentAuthorized(next);
      toast({
        title: next ? "Recruiting authorization granted" : "Recruiting authorization revoked",
        description: next
          ? "Recruiting visibility may now resolve to visible if the athlete has enabled it."
          : "Recruiting visibility is now hidden until you re-authorize.",
      });
    } catch (e) {
      toast({
        title: "Could not update authorization",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  if (loading || linkLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </DashboardLayout>
    );
  }

  if (!isParent) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-xl p-6">
          <Card>
            <CardContent className="flex items-start gap-3 p-4 text-sm">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <strong>Not authorized.</strong> You are not listed as an
                authorizing parent for this athlete. Recruiting authorization
                can only be granted by a linked parent.
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Recruiting authorization</h1>
          <p className="text-sm text-muted-foreground">
            You control whether this minor athlete may appear on recruiting
            surfaces. This is in addition to the athlete's own visibility
            toggle — both must be on for any recruiter to see them.
          </p>
        </header>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                {state?.parent_authorized ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                )}
                Parent authorization
              </span>
              <Badge variant={state?.parent_authorized ? "default" : "outline"}>
                {state?.parent_authorized ? "Authorized" : "Not authorized"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded border p-3">
              <div>
                <Label htmlFor="parent-auth" className="text-sm font-medium">
                  Authorize recruiting visibility
                </Label>
                <p className="text-xs text-muted-foreground">
                  Required for minors before any recruiter, coach, or scout can
                  view the athlete's recruiting snapshot.
                </p>
              </div>
              <Switch
                id="parent-auth"
                checked={!!state?.parent_authorized}
                onCheckedChange={handleToggle}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                Revoking authorization immediately hides the athlete from all
                recruiting surfaces on the next refresh. You can re-authorize at
                any time.
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded border p-2">
                <dt className="text-muted-foreground">Athlete visibility toggle</dt>
                <dd className="font-medium">
                  {state?.visibility_enabled ? "On" : "Off"}
                </dd>
              </div>
              <div className="rounded border p-2">
                <dt className="text-muted-foreground">Parent authorization</dt>
                <dd className="font-medium">
                  {state?.parent_authorized ? "Granted" : "Not granted"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent changes</CardTitle>
          </CardHeader>
          <CardContent>
            {!audit || audit.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No changes recorded yet.
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {audit.map((row) => {
                  const ns = row.new_state as {
                    visibility_enabled?: boolean;
                    parent_authorized?: boolean;
                  };
                  return (
                    <li
                      key={row.id}
                      className="flex items-center justify-between rounded border p-2"
                    >
                      <span>
                        {row.actor_role === "parent" ? "Parent" : "Athlete"} ·{" "}
                        visibility {ns.visibility_enabled ? "on" : "off"} ·{" "}
                        parent {ns.parent_authorized ? "authorized" : "not authorized"}
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
