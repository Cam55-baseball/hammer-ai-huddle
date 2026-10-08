/** Auto-renewal consent (California ARL): its own unchecked box before checkout; the choice is saved. */
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { AGREEMENT_SLUGS, autoRenewalSentence, fetchLatestVersions, recordConsent } from "@/lib/legal/legalV2";

export function AutoRenewalCheckbox({ checked, onChange, period, price }: { checked: boolean; onChange: (v: boolean) => void; period: string; price: string }) {
  return (
    <div className="mb-3 rounded-lg border p-3">
      <label className="flex min-h-[44px] items-start gap-3 text-sm">
        <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" aria-label="Auto-renewal agreement" />
        <span>{autoRenewalSentence(period, price)} <Link to="/legal/subscription-policy" target="_blank" className="text-primary underline">Renewal & cancellation policy</Link></span>
      </label>
    </div>
  );
}

export async function saveAutoRenewalConsent(period: string, price: string, tier: string) {
  const v = (await fetchLatestVersions([AGREEMENT_SLUGS.autoRenewal]))[AGREEMENT_SLUGS.autoRenewal];
  if (!v) throw new Error("auto-renewal document missing");
  await recordConsent({ slug: AGREEMENT_SLUGS.autoRenewal, version: v, choice: "accepted", method: "checkout_checkbox", details: { period, price, tier, sentence: autoRenewalSentence(period, price) } });
}
