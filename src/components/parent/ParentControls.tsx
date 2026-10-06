/** Settings → Parent controls (only on parent-controlled accounts). */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { callParentConsent, TRAINING_OPT_IN_TEXT } from "@/lib/parent/parentConsent";

const STORED = [
  "Child's first name or nickname, birthdate, height and weight",
  "Sport, position and team",
  "Training plans, logs and check-ins (sleep, water, food, recovery, mood)",
  "Training videos and body-movement analysis",
  "Your signed Parent Promise and payment confirmation",
];

export function ParentControls({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["parent-consent-record", userId],
    queryFn: async () => {
      const { data } = await supabase.from("parent_consents" as any).select("*").eq("child_user_id", userId).order("signed_at", { ascending: false }).limit(1).maybeSingle();
      return data as any;
    },
  });
  const c = q.data;
  if (!c) return null;

  const download = async () => {
    const { url } = await callParentConsent<{ url: string | null }>("signature_url");
    const record = {
      parent_full_name: c.parent_full_name, relationship: c.relationship, parent_is_18_or_older: c.parent_is_adult,
      parent_email: c.parent_email, child: c.child_display_name, typed_name: c.typed_name, promise_version: c.promise_version,
      notice_version: c.notice_version, promise: c.promise_text, signed_at: c.signed_at, ip: c.ip, device: c.user_agent,
      stripe_payment_id: c.stripe_payment_id, payment_confirmed_at: c.payment_confirmed_at, withdrawn_at: c.withdrawn_at,
      optional_sharing: c.optional_sharing, signature_image_link_valid_5_minutes: url,
    };
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `parent-promise-${c.signed_at.slice(0, 10)}.json`; a.click();
  };
  const act = async (action: "withdraw" | "delete") => {
    const ok = window.confirm(action === "delete"
      ? "Delete your child's training data? The account locks right away and billing is canceled. This can't be undone."
      : "Take back permission? The account locks right away and billing is canceled.");
    if (!ok) return;
    setBusy(action);
    try {
      const r = await callParentConsent<any>(action);
      setResult(action === "delete" ? "Deleted and locked. Billing canceled." : "Permission taken back. The account is locked and billing is canceled.");
      if (r.billingError) setResult((s) => `${s} We couldn't reach the card processor — contact support so you aren't billed again.`);
      qc.invalidateQueries();
    } catch { setResult("That didn't work. Please try again."); }
    finally { setBusy(null); }
  };
  const training = async (yes: boolean) => {
    setBusy("training");
    try { await callParentConsent("training", { training_opt_in: yes }); await q.refetch(); } finally { setBusy(null); }
  };
  const share = async (yes: boolean) => {
    setBusy("share");
    try { await callParentConsent("sharing", { optional_sharing: yes }); await q.refetch(); } finally { setBusy(null); }
  };

  return (
    <Card className="mb-6 space-y-4 p-5">
      <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Parent controls</h2></div>
      <div className="space-y-1 text-sm">
        <p><span className="text-muted-foreground">Signed by:</span> {c.parent_full_name} ({c.relationship})</p>
        <p><span className="text-muted-foreground">Signed on:</span> {new Date(c.signed_at).toLocaleString()}</p>
        <p><span className="text-muted-foreground">Payment:</span> {c.payment_confirmed_at ? "Confirmed" : "Not confirmed yet"}</p>
        <p><span className="text-muted-foreground">Status:</span> {c.withdrawn_at ? "Permission taken back — account locked" : "Active"}</p>
      </div>
      <details className="rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-medium">Read the signed Parent Promise</summary><p className="mt-2 leading-6">{c.promise_text}</p></details>
      <details className="rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-medium">What's stored about your child</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">{STORED.map((s) => <li key={s}>{s}</li>)}</ul></details>
      <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
        <span>Optional sharing (for example PitchLab)</span>
        <Switch checked={!!c.optional_sharing} disabled={!!c.withdrawn_at || busy === "share"} onCheckedChange={share} aria-label="Optional sharing" />
      </div>
      <div className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm">
        <span className="leading-6">{TRAINING_OPT_IN_TEXT}</span>
        <Switch checked={!!c.training_opt_in} disabled={!!c.withdrawn_at || busy === "training"} onCheckedChange={training} aria-label="Help improve Hammers Modality" />
      </div>
      <Button variant="outline" className="h-11 w-full" onClick={download}>Download the signed record</Button>
      {!c.withdrawn_at && <>
        <Button variant="outline" className="h-11 w-full" disabled={!!busy} onClick={() => act("withdraw")}>Take back permission</Button>
        <Button variant="destructive" className="h-11 w-full" disabled={!!busy} onClick={() => act("delete")}>Delete my child's data</Button>
      </>}
      {result && <p role="status" className="text-sm">{result}</p>}
    </Card>
  );
}
