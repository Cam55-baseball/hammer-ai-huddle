/**
 * Pre-release access gate for the single-camera pitch velocity pipeline.
 *
 * The hosted Roboflow inference path bills real credits per frame and is not
 * yet accuracy-validated (see docs/asb/on-device-ball-detector.md). Until it
 * ships, ONLY `owner` and `admin` roles may reach `pitch-velocity-prep` or
 * `pitch-velocity-measure`. UI gating alone is insufficient because edge
 * functions are directly invocable by any authenticated client.
 *
 * Flip this off only when the pipeline is validated AND cost controls are
 * approved for general release.
 */
export const PITCH_VELOCITY_RESTRICTED_TO_STAFF = true;

type MinimalClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        in: (col: string, vals: string[]) => {
          limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }>;
        };
      };
    };
  };
};

/**
 * Returns null when the caller may proceed, or an error message when blocked.
 * Fails closed: any lookup error denies access.
 */
export async function assertPitchVelocityAccess(
  serviceClient: MinimalClient,
  userId: string,
): Promise<string | null> {
  if (!PITCH_VELOCITY_RESTRICTED_TO_STAFF) return null;

  const { data, error } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .limit(1);

  if (error) {
    console.error("[pitchVelocityAccess] role lookup failed", error);
    return "Could not verify access";
  }
  if (!data || data.length === 0) {
    return "Pitch velocity measurement is not available yet";
  }
  return null;
}
