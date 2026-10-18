import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useFeatureSwitches } from "@/hooks/useFeatureSwitches";
import { STAFF_PRICES } from "../../../supabase/functions/_shared/staffPlans";

export function OwnerSettingsOverview() {
  const switches = useFeatureSwitches();
  const settings = useQuery({ queryKey: ["owner-settings-overview"], queryFn: async () => { const { data, error } = await supabase.from("app_settings").select("setting_key, setting_value").order("setting_key"); if (error) throw error; return data ?? []; } });
  return <div className="space-y-6">
    <section className="space-y-3"><h2 className="font-semibold">App switches — read only</h2>{switches.loading ? <p>Loading…</p> : switches.rows.map((r) => <div key={r.feature_key} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm"><span>{r.label}</span><span className="text-muted-foreground">Setting: {r.mode}{r.mode === "allowlist" ? ` · ${r.allowlist?.length ?? 0} allowed accounts` : ""}</span></div>)}</section>
    <section className="space-y-3"><h2 className="font-semibold">App settings — read only</h2>{settings.error ? <p className="text-destructive">Couldn't load settings.</p> : settings.data?.map((r) => <div key={r.setting_key} className="break-words border-b py-2 text-sm">{r.setting_key.replace(/_/g, " ")}: {JSON.stringify(r.setting_value)}</div>)}</section>
    <section className="space-y-3"><h2 className="font-semibold">Billing</h2><div className="flex flex-wrap gap-2">{Object.entries(STAFF_PRICES).map(([key, price]) => <Button asChild variant="outline" key={key}><a href={`https://dashboard.stripe.com/prices/${price}`} target="_blank" rel="noopener noreferrer">{key === "coach" ? "Hammers Coach" : key === "organization" ? "Hammers Organization" : "Extra coach seat"} — Stripe price</a></Button>)}<Button asChild variant="outline"><a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer">Player plans and sponsorships — Stripe products</a></Button></div></section>
    <section className="space-y-3"><h2 className="font-semibold">Cost per analysis</h2><Button asChild variant="outline"><Link to="/owner/ai-costs">Open analysis costs</Link></Button></section>
  </div>;
}