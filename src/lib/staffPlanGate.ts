// Plan 4 D — who may open coach tools. The gate switch (app_settings.staff_plan_gate) starts OFF,
// so existing coaches keep access until the owner turns it on.
export type StaffGateInput = {
  gateOn: boolean;
  isOwnerOrAdmin: boolean;
  hasPlan: boolean;
  needsOrg?: boolean;
  plan?: "coach" | "organization" | null;
};

export function staffGateAllows(i: StaffGateInput): boolean {
  if (!i.gateOn || i.isOwnerOrAdmin) return true;
  if (!i.hasPlan) return false;
  if (i.needsOrg) return i.plan === "organization";
  return true;
}
