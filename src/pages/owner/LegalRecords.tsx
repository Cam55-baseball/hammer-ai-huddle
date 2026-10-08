/** Owner/admin: consent records (view + CSV export) and the privacy-request queue with deadlines. */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsStaff } from "@/lib/legal/useIsStaff";
import { callTeenWaiver } from "@/lib/legal/teenWaiver";

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function LegalRecords() {
  const nav = useNavigate();
  const staff = useIsStaff();
  const consents = useQuery({
    queryKey: ["owner-consent-records"], enabled: staff,
    queryFn: async () => (await supabase.from("consent_records" as any).select("*").order("recorded_at", { ascending: false }).limit(1000)).data ?? [],
  });
  const requests = useQuery({
    queryKey: ["owner-privacy-requests"], enabled: staff,
    queryFn: async () => (await supabase.from("privacy_requests" as any).select("*").order("due_at", { ascending: true }).limit(500)).data ?? [],
  });
  const exportCsv = () => {
    const cols = ["recorded_at", "user_id", "document_slug", "document_version", "choice", "method", "signer_name", "signer_role", "ip", "device", "account_ended_at"];
    const rows = (consents.data as any[]).map((r) => cols.map((c) => csvCell(r[c])).join(","));
    const url = URL.createObjectURL(new Blob([[cols.join(","), ...rows].join("\n")], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `consent-records-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };
  const markDone = async (id: string) => {
    await supabase.from("privacy_requests" as any).update({ status: "done", completed_at: new Date().toISOString() }).eq("id", id);
    requests.refetch();
  };
  const teens = useQuery({
    queryKey: ["owner-teen-waivers"], enabled: staff,
    queryFn: async () => (await callTeenWaiver<{ rows: any[] }>("staff_list")).rows,
  });
  const resendTeen = async (id: string) => {
    try { await callTeenWaiver("staff_resend", { teen_user_id: id }); alert("Link sent again."); } catch { alert("Couldn't send. No parent email yet, or try again."); }
    teens.refetch();
  };
  if (!staff) return <p className="p-6 text-sm text-muted-foreground">Owners and admins only.</p>;
  const now = Date.now();
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <Button variant="ghost" className="min-h-[44px]" onClick={() => nav("/owner")}><ArrowLeft className="mr-1 h-4 w-4" />Owner</Button>
      <h1 className="text-xl font-semibold">Legal records</h1>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Privacy requests</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(requests.data as any[] ?? []).length === 0 && <p className="text-sm text-muted-foreground">No requests.</p>}
          {(requests.data as any[] ?? []).map((r) => {
            const days = Math.ceil((new Date(r.due_at).getTime() - now) / 86_400_000);
            const open = r.status !== "done" && r.status !== "denied";
            return (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm">
                <span>Request: {r.kind} · User: {String(r.user_id).slice(0, 8)}… · Asked: {new Date(r.requested_at).toLocaleDateString()}</span>
                <span className="flex items-center gap-2">
                  <Badge variant={open && days <= 7 ? "destructive" : "outline"}>Status: {r.status}{open ? ` · due in ${days} days` : ""}</Badge>
                  {open && <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => markDone(r.id)}>Mark done</Button>}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Teens waiting for a parent signature ({(teens.data ?? []).length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(teens.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
          {(teens.data ?? []).map((r: any) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-sm">
              <span className="min-w-0 break-words">Player: {r.teen_name || String(r.teen_user_id).slice(0, 8) + "…"} · Parent email: {r.parent_email ?? "not entered yet"} · Links sent: {r.send_count}</span>
              <span className="flex items-center gap-2">
                <Badge variant={r.locked ? "destructive" : "outline"}>Plan: {r.locked ? "locked" : `open until ${new Date(r.grace_until).toLocaleDateString()}`}</Badge>
                <Button size="sm" variant="outline" className="min-h-[44px]" disabled={!r.parent_email} onClick={() => resendTeen(r.teen_user_id)}>Resend link</Button>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Consent records ({(consents.data as any[] ?? []).length})</CardTitle>
          <Button size="sm" variant="outline" className="min-h-[44px]" onClick={exportCsv} disabled={!consents.data?.length}>Export CSV</Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead><tr className="text-muted-foreground"><th className="p-1">When</th><th className="p-1">User</th><th className="p-1">Document</th><th className="p-1">Choice</th><th className="p-1">Method</th><th className="p-1">Signed name</th></tr></thead>
            <tbody>
              {(consents.data as any[] ?? []).map((r) => (
                <tr key={r.id} className="border-t"><td className="p-1">{new Date(r.recorded_at).toLocaleString()}</td><td className="p-1">{String(r.user_id).slice(0, 8)}…</td><td className="p-1">{r.document_slug} v{r.document_version}</td><td className="p-1">{r.choice}</td><td className="p-1">{r.method}</td><td className="p-1">{r.signer_name ?? "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
