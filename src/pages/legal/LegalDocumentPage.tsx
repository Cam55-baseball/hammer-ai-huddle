/** /legal/:slug — versioned legal document (legal_v2). With the switch OFF it falls back to today's pages. */
import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { displayBody, fetchLatestDoc, myConsentStatus, recordConsent, useLegalV2, type LegalDoc } from "@/lib/legal/legalV2";
import { useIsStaff } from "@/lib/legal/useIsStaff";
import { LegalMarkdown } from "@/components/legal/LegalMarkdown";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/common/BackButton";
import { useSmartBack } from "@/hooks/useSmartBack";
import { useOptionalAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function LegalDocumentPage() {
  const { slug = "" } = useParams();
  const { on, ready } = useLegalV2();
  const staff = useIsStaff();
  const { user } = useOptionalAuth() as any;
  const fallback = user ? "/dashboard" : "/";
  const back = useSmartBack(fallback);
  const [doc, setDoc] = useState<LegalDoc | null | undefined>(undefined);
  const [readAt, setReadAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (on) fetchLatestDoc(slug).then(setDoc); }, [on, slug]);
  useEffect(() => {
    if (!user?.id || !doc) return;
    myConsentStatus().then((s) => {
      const st = s[doc.slug];
      setReadAt(st && st.choice === "accepted" && st.document_version >= doc.version ? st.recorded_at : null);
    }).catch(() => undefined);
  }, [user?.id, doc]);

  if (!ready) return null;
  if (!on) return <Navigate to={slug === "privacy" ? "/privacy" : slug === "terms" ? "/terms" : "/"} replace />;
  if (doc === undefined) return null;
  if (doc === null) return <Navigate to="/" replace />;

  /** Records the read once per version, then returns to where the person was. */
  const confirmRead = async () => {
    if (readAt) { back(); return; }
    setSaving(true);
    try {
      await recordConsent({ slug: doc.slug, version: doc.version, choice: "accepted", method: "read_confirmation" });
      toast.success("Thanks — saved. You won't be asked about this version again.");
      back();
    } catch {
      toast.error("Couldn't save that. Please try again.");
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-background pt-safe pb-safe">
      <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-1 backdrop-blur">
        <BackButton fallback={fallback} label="Close" />
      </div>
      <main className="container mx-auto max-w-3xl px-4 py-6">
        {staff && !doc.approved && (
          <p role="status" className="mb-4 rounded-md border border-destructive bg-destructive/10 p-2 text-sm font-semibold text-destructive">
            DRAFT v{doc.version} — not approved by the lawyer yet. Only owners and admins see this label.
          </p>
        )}
        <h1 className="text-3xl font-bold">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Version {doc.version}{doc.effective_date ? ` · Effective ${doc.effective_date}` : ""}
        </p>
        <div className="mt-6"><LegalMarkdown body={displayBody(doc.slug, doc.body)} /></div>
        {user && (
          <div className="mt-8 space-y-2 rounded-lg border p-4">
            {readAt && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />Read on: {new Date(readAt).toLocaleDateString()}
              </p>
            )}
            <Button className="min-h-11 w-full" onClick={confirmRead} disabled={saving}>
              {saving ? "Saving…" : readAt ? "Back to where I was" : "I've read this"}
            </Button>
          </div>
        )}
        <Separator className="my-10" />
        <LegalFooterLinks />
      </main>
    </div>
  );
}
