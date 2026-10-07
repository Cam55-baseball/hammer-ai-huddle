/**
 * Limb sizes (owner, Round 9 item 7b) — collection only. Saved as history in
 * athlete_limb_measurements; no prescription reads them until the owner approves.
 * For under-13 accounts the parent fills these in on the child's account.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export interface LimbValues { wingspan: string; sitting: string; hand: string }
export const emptyLimbs: LimbValues = { wingspan: "", sitting: "", hand: "" };
const num = (s: string) => { const n = Number(s); return Number.isFinite(n) && n > 0 ? n : null; };

export async function saveLimbMeasurements(userId: string, v: LimbValues, standingHeightIn: number | null, source: string) {
  const row = { wingspan_in: num(v.wingspan), sitting_height_in: num(v.sitting), hand_length_in: num(v.hand) };
  if (!Object.values(row).some((x) => x != null)) return;
  await supabase.from("athlete_limb_measurements").insert({ user_id: userId, standing_height_in: standingHeightIn, source, ...row });
}

export function LimbMeasurementsFields({ value, onChange, parentEntry }: { value: LimbValues; onChange: (v: LimbValues) => void; parentEntry?: boolean }) {
  const f = (k: keyof LimbValues, id: string, label: string, hint: string) => (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} type="number" inputMode="decimal" value={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Arm and leg size{parentEntry ? " — parent or guardian, please measure and enter these" : ""}. Optional. We only keep a record for now; your plan doesn't change from these yet.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {f("wingspan", "limb-wingspan", "Arm span (inches)", "Arms straight out to the sides, fingertip to fingertip.")}
        {f("sitting", "limb-sitting", "Sitting height (inches)", "Sit on the floor against a wall; measure floor to top of head. Used to work out leg length.")}
        {f("hand", "limb-hand", "Hand length (inches, optional)", "Wrist crease to the tip of the middle finger.")}
      </div>
    </div>
  );
}
