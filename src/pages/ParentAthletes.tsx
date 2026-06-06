/**
 * RR-10 — Parent-facing roster of linked athletes.
 *
 * Reads `parent_athlete_links` via `useParentLinks`. Each active link
 * routes to the parent recruiting-authorization surface for that athlete.
 * Non-active links are shown with their status so the parent understands
 * why no action is available.
 */
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useParentLinks } from "@/hooks/useParentLink";

export default function ParentAthletes() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: links, isLoading } = useParentLinks();

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <header className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Users className="h-6 w-6" /> Linked athletes
          </h1>
          <p className="text-sm text-muted-foreground">
            Athletes you authorize. Recruiting visibility for a minor remains
            hidden until you explicitly authorize it.
          </p>
        </header>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Athletes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !links || links.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You are not yet linked to any athlete. Linking happens through
                the parent invite flow initiated by the athlete or their coach.
              </p>
            ) : (
              <ul className="space-y-2">
                {links.map((link) => (
                  <li
                    key={link.id}
                    className="flex items-center justify-between rounded border p-3"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {link.athlete_full_name ?? link.athlete_user_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {link.relationship} ·{" "}
                        {link.status === "active"
                          ? `linked ${link.accepted_at ? new Date(link.accepted_at).toLocaleDateString() : ""}`
                          : link.status === "pending"
                            ? "invitation pending"
                            : "revoked"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={link.status === "active" ? "default" : "outline"}
                      >
                        {link.status}
                      </Badge>
                      {link.status === "active" && (
                        <Button asChild size="sm" variant="outline">
                          <Link
                            to={`/parent/athletes/${link.athlete_user_id}/recruiting`}
                          >
                            <ShieldCheck className="mr-1 h-4 w-4" /> Recruiting
                          </Link>
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
