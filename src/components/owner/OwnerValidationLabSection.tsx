import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isSwitchOnFor, type FeatureSwitchRow } from "../../../supabase/functions/_shared/wic/flags/featureSwitches";
import { ValidationLabCard } from "./ValidationLabCard";
import { MeasurementDeletionRequestsCard } from "./MeasurementDeletionRequestsCard";

/** Owner-only, behind validation_lab_v1 (off until the owner opens it). Admins never see it. */
export function OwnerValidationLabSection({ isOwner }: { isOwner: boolean }) {
  const { user } = useAuth();
  const on = useQuery({
    queryKey: ["switch", "validation_lab_v1", user?.id],
    enabled: isOwner && !!user,
    queryFn: async () => {
      const { data } = await supabase.from("wk_feature_switches").select("feature_key, mode, allowlist, updated_by").eq("feature_key", "validation_lab_v1").maybeSingle();
      return isSwitchOnFor(data as FeatureSwitchRow | null, user?.id ?? null);
    },
  });
  if (!isOwner || on.data !== true) return null;
  return (
    <section aria-label="Validation Lab" className="space-y-3">
      <ValidationLabCard />
      <MeasurementDeletionRequestsCard />
    </section>
  );
}
