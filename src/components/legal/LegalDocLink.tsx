/**
 * Opens a legal document in a pop-up over the current screen (checkout, sign-up,
 * agreements). No new tab and no page change, so Close/"I've read this" returns
 * the person exactly where they were, still signed in, with their choices kept.
 */
import { useEffect, useId, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { displayBody, fetchLatestDoc, recordConsent, type LegalDoc } from "@/lib/legal/legalV2";
import { LegalMarkdown } from "@/components/legal/LegalMarkdown";
import { useOptionalAuth } from "@/hooks/useAuth";
import { closeLegalOverlay, LEGAL_OVERLAY_KEY, openLegalOverlay } from "@/lib/legal/overlayHistory";

export function LegalDocLink({ slug, children, className }: { slug: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const [doc, setDoc] = useState<LegalDoc | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const id = useId();
  const dismiss = () => { closeLegalOverlay(id); setOpen(false); };
  const { user } = (useOptionalAuth() as any) ?? {};
  useEffect(() => { if (open && doc === undefined) fetchLatestDoc(slug).then(setDoc).catch(() => setDoc(null)); }, [open, slug, doc]);
  useEffect(() => {
    if (!open) return;
    const back = () => { if (window.history.state?.[LEGAL_OVERLAY_KEY] !== id) setOpen(false); };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [open, id]);

  const confirm = async () => {
    if (!user || !doc) { dismiss(); return; }
    setSaving(true);
    try { await recordConsent({ slug: doc.slug, version: doc.version, choice: "accepted", method: "read_confirmation" }); }
    catch { /* already saved for this version, or offline — reading still counts locally */ }
    finally { setSaving(false); dismiss(); }
  };

  return (
    <>
      <Button type="button" variant="link" className={`inline h-auto whitespace-normal p-0 align-baseline ${className ?? "text-primary underline"}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openLegalOverlay(id); setOpen(true); }}>
        {children}
      </Button>
      <Dialog open={open} onOpenChange={(next) => { if (!next) dismiss(); }}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-x-hidden overflow-y-auto break-words [&>*]:min-w-0">
          <DialogHeader><DialogTitle>{doc?.title ?? "Loading…"}</DialogTitle></DialogHeader>
          {doc === null && <p className="text-sm text-muted-foreground">This document couldn't load. Please try again.</p>}
          {doc && <>
            <p className="text-xs text-muted-foreground">Version {doc.version}{doc.effective_date ? ` · Effective ${doc.effective_date}` : ""}</p>
            <LegalMarkdown body={displayBody(doc.slug, doc.body)} />
          </>}
          <div className="sticky bottom-0 flex gap-2 bg-background pt-2">
            <Button variant="outline" className="min-h-11 flex-1" onClick={dismiss}>Close</Button>
            {doc && user && <Button className="min-h-11 flex-1" disabled={saving} onClick={confirm}>{saving ? "Saving…" : "I've read this"}</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
