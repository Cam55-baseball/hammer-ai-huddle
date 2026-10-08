/** /legal/:slug — versioned legal document (legal_v2). With the switch OFF it falls back to today's pages. */
import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { fetchLatestDoc, useLegalV2, type LegalDoc } from "@/lib/legal/legalV2";
import { useIsStaff } from "@/lib/legal/useIsStaff";
import { LegalMarkdown } from "@/components/legal/LegalMarkdown";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";
import { Separator } from "@/components/ui/separator";

export default function LegalDocumentPage() {
  const { slug = "" } = useParams();
  const { on, ready } = useLegalV2();
  const staff = useIsStaff();
  const [doc, setDoc] = useState<LegalDoc | null | undefined>(undefined);
  useEffect(() => { if (on) fetchLatestDoc(slug).then(setDoc); }, [on, slug]);

  if (!ready) return null;
  if (!on) return <Navigate to={slug === "privacy" ? "/privacy" : slug === "terms" ? "/terms" : "/"} replace />;
  if (doc === undefined) return null;
  if (doc === null) return <Navigate to="/" replace />;
  return (
    <div className="min-h-screen bg-background pt-safe pb-safe">
      <main className="container mx-auto max-w-3xl px-4 py-10">
        {staff && !doc.approved && (
          <p role="status" className="mb-4 rounded-md border border-destructive bg-destructive/10 p-2 text-sm font-semibold text-destructive">
            DRAFT v{doc.version} — not approved by the lawyer yet. Only owners and admins see this label.
          </p>
        )}
        <h1 className="text-3xl font-bold">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Version {doc.version}{doc.effective_date ? ` · Effective ${doc.effective_date}` : ""}
        </p>
        <div className="mt-6"><LegalMarkdown body={doc.body} /></div>
        <Separator className="my-10" />
        <LegalFooterLinks />
      </main>
    </div>
  );
}
