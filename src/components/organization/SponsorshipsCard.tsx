import { goToStripe } from "@/lib/purchase/goToStripe";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePurchaseAvailability } from "@/hooks/usePurchaseAvailability";
import { Input } from "@/components/ui/input";
import { athletesOnly, searchSponsorOptions, sponsorOptions, type SponsorOption } from "@/lib/organization/orgPeople";

/** Searchable athlete picker: full names, team and position, sorted by name. */
export function SponsorPlayerPicker({ options, value, onChange }: { options: SponsorOption[]; value: string; onChange: (id: string) => void }) {
  const [q, setQ] = useState("");
  const shown = searchSponsorOptions(options, q);
  return (
    <div className="space-y-2">
      <Input aria-label="Search players" placeholder="Search players by name" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul role="listbox" aria-label="Player" className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-1">
        {shown.length === 0 && <li className="p-2 text-sm text-muted-foreground">No matching athletes in your organization.</li>}
        {shown.map((o) => (
          <li key={o.id} role="option" aria-selected={value === o.id}>
            <button type="button" onClick={() => onChange(o.id)} className={`w-full rounded px-2 py-2 text-left text-sm ${value === o.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
              <span className="block font-medium">{o.name}</span>
              {o.detail && <span className="block text-xs opacity-80">{o.detail}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
  const { mode } = usePurchaseAvailability();

  const { data } = useQuery({
    queryKey: ["org-sponsorships", orgId],
    queryFn: async () => {
      // Owner Nov 6 r3: server-checked roster names (org admins can't read private profiles).
      const { data: roster } = await supabase.rpc("list_org_roster", { _organization_id: orgId });
      const ids = athletesOnly((roster ?? []) as any[]).map((r: any) => r.user_id as string);
      const teams: Record<string, string[]> = {};
      const t = await (supabase as any).from("org_teams").select("id,name").eq("organization_id", orgId).is("archived_at", null);
      if (!t.error && t.data?.length) {
        const tn = new Map<string, string>(t.data.map((r: any) => [r.id, r.name]));
        const tm = await (supabase as any).from("org_team_members").select("team_id,user_id").in("team_id", [...tn.keys()]).is("removed_at", null);
        for (const r of (tm.data ?? []) as any[]) (teams[r.user_id] ??= []).push(tn.get(r.team_id) ?? "Team");
      }
      const positions: Record<string, string | null> = {};
      if (ids.length) { const m = await supabase.from("athlete_mpi_settings").select("user_id, primary_position").in("user_id", ids); for (const r of (m.data ?? []) as any[]) positions[r.user_id] = r.primary_position; }
      const options = sponsorOptions((roster ?? []) as any[], teams, positions);
      const { data: rows } = await (supabase as any).from("org_sponsorships").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
      const names = new Map<string, string>(options.map((o) => [o.id, o.name]));
      return { players: options, rows: (rows ?? []) as any[], names };
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
    if (r?.url) goToStripe(r.url, "sponsorship");
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
        {mode === "native-linkout" ? (
          <p className="text-sm">Subscribe on our website to sponsor players.</p>
        ) : (
          <div className="grid gap-2">
            <SponsorPlayerPicker options={(data?.players ?? []).filter((p) => !live.has(p.id))} value={player} onChange={setPlayer} />
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
