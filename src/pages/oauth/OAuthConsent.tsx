import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// The Supabase OAuth 2.1 authorization-server namespace is in beta and not
// yet in the generated types; declare a tiny local wrapper so we can call the
// three real methods on the installed supabase-js client.
type OAuthResp = {
  data?: { redirect_url?: string; redirect_to?: string; client?: { name?: string }; scope?: string } | null;
  error?: { message: string } | null;
};
type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResp>;
  approveAuthorization: (id: string) => Promise<OAuthResp>;
  denyAuthorization: (id: string) => Promise<OAuthResp>;
};
function oauth(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthResp["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?redirect=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data ?? null);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            Connect {details?.client?.name ?? "an app"} to Hammers Modality
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive">Could not process this request: {error}</p>
          ) : !details ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <p className="text-sm">
                This will let <strong>{details.client?.name ?? "the client"}</strong> use
                Hammers Modality tools as you. It can read your ASB timeline, games, and
                other data your account can access. It cannot bypass app permissions.
              </p>
              <p className="text-xs text-muted-foreground">
                You can revoke this connection at any time from your account settings.
              </p>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
                  Deny
                </Button>
                <Button disabled={busy} onClick={() => decide(true)}>
                  Approve
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
