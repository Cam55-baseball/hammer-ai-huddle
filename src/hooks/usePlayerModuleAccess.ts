/**
 * usePlayerModuleAccess — is this account entitled to the PLAYER product?
 *
 * The test is purchase, never role. A scout or coach with a purchased player
 * module gets the player Game Plan in ADDITION to their staff plan; a scout or
 * coach without one never sees player surfaces.
 *
 * The answer is computed SERVER-SIDE by public.has_player_module(uuid), a
 * security-definer function reading the subscriptions table, so the client
 * cannot grant itself access by flipping local state.
 *
 * Owners/admins who are not staff keep access so the product stays testable.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useScoutAccess } from "@/hooks/useScoutAccess";

export interface PlayerModuleAccess {
  /** True when the player product may be shown. */
  hasPlayerAccess: boolean;
  /** True when an active purchased player module exists (server-verified). */
  hasPurchasedModule: boolean;
  loading: boolean;
}

export function usePlayerModuleAccess(): PlayerModuleAccess {
  const { user } = useAuth();
  const { isOwner, isAdmin, loading: ownerLoading } = useOwnerAccess() as {
    isOwner: boolean;
    isAdmin?: boolean;
    loading: boolean;
  };
  const { isScout, isCoach, loading: roleLoading } = useScoutAccess();

  const { data, isLoading } = useQuery({
    queryKey: ["has-player-module", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_player_module", {
        _user_id: user!.id,
      });
      if (error) throw error;
      return !!data;
    },
  });

  const hasPurchasedModule = !!data;
  const staff = isScout || isCoach;
  const hasPlayerAccess = hasPurchasedModule || ((isOwner || !!isAdmin) && !staff);

  return {
    hasPlayerAccess,
    hasPurchasedModule,
    loading: ownerLoading || roleLoading || (!!user?.id && isLoading),
  };
}
