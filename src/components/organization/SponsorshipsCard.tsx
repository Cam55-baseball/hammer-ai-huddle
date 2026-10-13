import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isNativeIOS } from "@/lib/sponsorshipUi";

const PLANS = [
  { tier: "pitcher", name: "Complete Pitcher", price: "$200/month" },
  { tier: "5tool", name: "5Tool Player", price: "$300/month" },
  { tier: "golden2way", name: "The Golden 2Way", price: "$400/month" },
];
const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting for payment", scheduled: "Starts when the player's own paid month ends", active: "Active",
  paused: "Paused", canceled: "Ended — 14-day grace", ended: "Ended",
};

/** v3.1 Phase 11 — the organization chooses which players to sponsor. Never automatic. */
export function SponsorshipsCard({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const [player, setPlayer] = useState("");
  const [tier, setTier] = useState("5tool");
  const [sport, setSport] = useState("baseball");
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["org-sponsorships", orgId],
    queryFn: async () => {
      const { data: members } = await supabase.from("organization_members").select("user_id")
        .eq("organization_id", orgId).eq("role_in_org", "player").eq("status", "active").is("removed_at", null);
      const ids = (members ?? []).map((m) => m.user_id);
      const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] as any[] };
      const { data: rows } = await (supabase as any).from("org_sponsorships").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
      const names = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name || "Player"]));
      return { players: ids.map((id) => ({ id, name: names.get(id) ?? "Player" })), rows: (rows ?? []) as any[], names };
    },
  });

  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    const { data: r, error } = await supabase.functions.invoke("org-sponsorship", { body });
    setBusy(false);
    let msg = (r as any)?.error;
    if (error) { try { msg = (await (error as any).context?.json?.())?.error ?? msg; } catch { /* */ } }
    if (error || msg) { toast.error(msg || "Something went wrong."); return null; }
    qc.invalidateQueries({ queryKey: ["org-sponsorships", orgId] });
    return r as any;
  };

  const sponsor = async () => {
    if (!player) return toast.error("Pick a player first.");
    const r = await call({ action: "sponsor", organization_id: orgId, player_id: player, sport, tier });
    if (r?.url) window.location.href = r.url;
  };

  const live = new Set((data?.rows ?? []).filter((r) => ["pending", "scheduled", "active", "paused"].includes(r.status)).map((r) => r.player_id));
  const date = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : "Not set");

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Sponsor players</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          You choose each player. Price: the player's regular monthly plan. If the player already pays, their own plan ends at the end of the month they paid for and your billing starts then — no double charge.
        </p>
        {isNativeIOS() ? (
          <p className="text-sm">Subscribe on our website to sponsor players.</p>
        ) : (
          <div className="grid gap-2">
            <Select value={player} onValueChange={setPlayer}>
              <SelectTrigger aria-label="Player"><SelectValue placeholder="Player" /></SelectTrigger>
              <SelectContent>
                {(data?.players ?? []).filter((p) => !live.has(p.id)).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger aria-label="Plan"><SelectValue /></SelectTrigger>
                <SelectContent>{PLANS.map((p) => <SelectItem key={p.tier} value={p.tier}>{p.name} · {p.price}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger aria-label="Sport"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="baseball">Baseball</SelectItem><SelectItem value="softball">Softball</SelectItem></SelectContent>
              </Select>
            </div>
            <Button onClick={sponsor} disabled={busy}>Sponsor this player</Button>
          </div>
        )}
        <div className="space-y-2">
          {(data?.rows ?? []).length === 0 && <p className="text-sm text-muted-foreground">No sponsored players yet.</p>}
          {(data?.rows ?? []).map((r) => (
            <div key={r.id} className="rounded-lg border p-3 text-sm space-y-1">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{data?.names.get(r.player_id) ?? "Player"}</span>
                <span className="text-muted-foreground">{PLANS.find((p) => p.tier === r.tier)?.name} · {r.sport}</span>
              </div>
              <p>Status: {STATUS_LABEL[r.status] ?? r.status}</p>
              {r.status === "scheduled" && <p className="text-xs text-muted-foreground">Your billing starts: {date(r.player_own_sub_ends_at)}</p>}
              {r.status === "paused" && <p className="text-xs text-muted-foreground">Player's access lasts until: {date(r.paid_through)}</p>}
              {r.status === "canceled" && <p className="text-xs text-muted-foreground">Grace ends: {date(r.grace_until)}</p>}
              <div className="flex gap-2 pt-1">
                {["active", "scheduled"].includes(r.status) && <Button size="sm" variant="outline" disabled={busy} onClick={() => call({ action: "pause", sponsorship_id: r.id })}>Pause</Button>}
                {r.status === "paused" && <Button size="sm" variant="outline" disabled={busy} onClick={() => call({ action: "resume", sponsorship_id: r.id })}>Resume</Button>}
                {["active", "scheduled", "paused"].includes(r.status) && (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => { if (confirm("End this sponsorship? The player keeps access for 14 days.")) call({ action: "cancel", sponsorship_id: r.id }); }}>Cancel</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
