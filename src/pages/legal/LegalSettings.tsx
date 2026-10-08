/**
 * Settings → Legal & privacy (legal_v2). Links, Download my data, Delete my account,
 * consent toggles (withdraw anytime) and online Cancel subscription (click-to-cancel: no retention steps).
 */
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { AGREEMENT_SLUGS, PUBLIC_LEGAL_DOCS, fetchLatestVersions, myConsentStatus, recordConsent, useLegalV2 } from "@/lib/legal/legalV2";

const TOGGLES = [
  { slug: AGREEMENT_SLUGS.healthConsent, label: "Health information", help: "Lets us use sleep, pain, injuries, readiness, nutrition and body measurements to keep your plan safe." },
  { slug: AGREEMENT_SLUGS.healthSharing, label: "Share health information with partners", help: "Only with partners you connect (none connected today). Off means nothing is shared." },
];

export default function LegalSettings() {
  const nav = useNavigate();
  const { user } = useOptionalAuth() as any;
  const { on, ready } = useLegalV2();
  const [status, setStatus] = useState<Record<string, any>>({});
  const [versions, setVersions] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const load = async () => {
    const [s, v] = await Promise.all([myConsentStatus(), fetchLatestVersions([...TOGGLES.map((t) => t.slug), AGREEMENT_SLUGS.cancellation])]);
    setStatus(s); setVersions(v);
  };
  useEffect(() => { if (on && user?.id) void load(); }, [on, user?.id]);

  if (!ready) return null;
  if (!on || !user) return <Navigate to="/dashboard" replace />;

  const toggle = async (slug: string, next: boolean) => {
    if (!versions[slug]) return;
    setBusy(slug);
    try {
      await recordConsent({ slug, version: versions[slug], choice: next ? "accepted" : "withdrawn", method: "toggle" });
      await load();
      toast.success(next ? "Turned on." : "Turned off. We've saved your choice.");
    } catch { toast.error("Couldn't save. Try again."); } finally { setBusy(null); }
  };

  const download = async () => {
    setBusy("export");
    try {
      const { data, error } = await supabase.functions.invoke("legal-consent", { body: { action: "export_my_data" } });
      if (error) throw error;
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a"); a.href = url; a.download = "hammers-modality-my-data.json"; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Couldn't build your download. Try again."); } finally { setBusy(null); }
  };

  const cancel = async () => {
    setBusy("cancel");
    try {
      const { error } = await supabase.functions.invoke("cancel-all-subscriptions", { body: {} });
      if (error) throw error;
      if (versions[AGREEMENT_SLUGS.cancellation]) {
        await recordConsent({ slug: AGREEMENT_SLUGS.cancellation, version: versions[AGREEMENT_SLUGS.cancellation], choice: "cancelled", method: "button" }).catch(() => undefined);
      }
      toast.success("Cancelled. Your plan won't renew. You keep access until the end of the period you paid for.");
    } catch { toast.error("Couldn't cancel online right now. Email hammersmodality@hammersmodality.org and we'll cancel it for you."); }
    finally { setBusy(null); setConfirmCancel(false); }
  };

  const isOn = (slug: string) => status[slug]?.choice === "accepted";

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4 pb-[calc(2rem+var(--safe-bottom,0px))]">
      <Button variant="ghost" className="min-h-[44px]" onClick={() => nav(-1)}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
      <h1 className="text-2xl font-semibold">Legal & privacy</h1>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Subscription</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">Cancel online here. Your plan stays active until the end of the period you already paid for. Bought on iPhone? Cancel in your Apple ID subscriptions.</p>
          <Button variant="destructive" className="h-11 w-full" disabled={busy === "cancel"} onClick={() => setConfirmCancel(true)}>Cancel subscription</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Your choices</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {TOGGLES.map((t) => (
            <div key={t.slug} className="flex min-h-[44px] items-start justify-between gap-3">
              <div><p className="text-sm font-medium">{t.label}</p><p className="text-xs text-muted-foreground">{t.help}</p></div>
              <Switch aria-label={t.label} checked={isOn(t.slug)} disabled={busy === t.slug || !versions[t.slug]} onCheckedChange={(v) => toggle(t.slug, v)} />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Anonymous training data and recruiting visibility have their own switches in your profile.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Your data</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="h-11 w-full" disabled={busy === "export"} onClick={download}><Download className="mr-2 h-4 w-4" />{busy === "export" ? "Building your file…" : "Download my data"}</Button>
          <Button variant="outline" className="h-11 w-full" asChild><Link to="/profile#delete-account">Delete my account</Link></Button>
          <p className="text-xs text-muted-foreground">Questions or another request? Email hammersmodality@hammersmodality.org. We answer within 30 days.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Documents</CardTitle></CardHeader>
        <CardContent>
          <ul>{PUBLIC_LEGAL_DOCS.map((d) => <li key={d.slug}><Link className="inline-flex min-h-[44px] items-center text-sm text-primary underline" to={`/legal/${d.slug}`}>{d.title}</Link></li>)}</ul>
        </CardContent>
      </Card>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>It won't renew. You keep access until the end of the period you paid for.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">Keep my plan</AlertDialogCancel>
            <AlertDialogAction className="min-h-[44px]" onClick={cancel}>Yes, cancel</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
