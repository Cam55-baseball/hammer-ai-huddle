/**
 * Apple Guideline 1.2 — user blocking, enforced in the data layer.
 *
 * Every place that resolves linked users, shared content, or invites must run
 * its candidate ids through here. A block is symmetric: neither side sees the
 * other, and neither side can open a new link or invite to the other.
 */
import { supabase } from "@/integrations/supabase/client";

export interface BlockRecord {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

/**
 * Every user id the signed-in user has blocked, or who has blocked them.
 *
 * Reads through the SECURITY DEFINER `blocked_user_ids()` function, not the
 * table: the SELECT policy on `user_blocks` only exposes rows to the blocker,
 * so a direct read would silently drop the "someone blocked me" direction and
 * quietly stop hiding their content.
 */
export async function fetchBlockedUserIds(userId: string): Promise<Set<string>> {
  if (!userId) return new Set();
  const { data, error } = await supabase.rpc("blocked_user_ids");

  if (error) {
    console.warn("[safety] block lookup failed", error);
    return new Set();
  }

  const ids = new Set<string>();
  for (const id of (data ?? []) as string[]) {
    if (id) ids.add(id);
  }
  return ids;
}


/** Blocks the signed-in user created, for the "Blocked users" list. */
export async function fetchMyBlocks(userId: string): Promise<BlockRecord[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("user_blocks")
    .select("id, blocker_id, blocked_id, created_at")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[safety] my-blocks lookup failed", error);
    return [];
  }
  return (data ?? []) as BlockRecord[];
}

/** True when the two users may not see each other or link to each other. */
export async function isBlockedPair(a: string, b: string): Promise<boolean> {
  if (!a || !b || a === b) return false;
  const { data, error } = await supabase.rpc("is_blocked_pair", { _a: a, _b: b });
  if (error) {
    console.warn("[safety] block pair check failed", error);
    return false;
  }
  return Boolean(data);
}

/**
 * Block a user. Any existing link between the two is revoked first, so a block
 * is a real severing and not just a hidden button.
 */
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (!blockerId || !blockedId || blockerId === blockedId) {
    throw new Error("Invalid block request");
  }

  await revokeLinksBetween(blockerId, blockedId);

  const { error } = await supabase
    .from("user_blocks")
    .upsert(
      { blocker_id: blockerId, blocked_id: blockedId },
      { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw error;
}

/**
 * Ending the links is done in the data layer by the `apply_block_severance`
 * trigger on `user_blocks`: neither side of a pair is allowed to delete the
 * other's relationship rows directly, so doing it from the client silently
 * failed. This helper only clears the rows the caller genuinely owns, as a
 * best effort; the trigger is the guarantee.
 */
async function revokeLinksBetween(a: string, b: string): Promise<void> {
  const attempts: PromiseLike<unknown>[] = [
    supabase
      .from("parent_athlete_links")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .or(
        `and(parent_user_id.eq.${a},athlete_user_id.eq.${b}),and(parent_user_id.eq.${b},athlete_user_id.eq.${a})`,
      )
      .is("revoked_at", null),
  ];

  await Promise.allSettled(attempts);
}

/** Filter any list of records down to the ones not involving a blocked user. */
export function excludeBlocked<T>(
  rows: T[],
  blockedIds: Set<string>,
  getUserId: (row: T) => string | null | undefined,
): T[] {
  if (blockedIds.size === 0) return rows;
  return rows.filter((row) => {
    const id = getUserId(row);
    return !id || !blockedIds.has(id);
  });
}
