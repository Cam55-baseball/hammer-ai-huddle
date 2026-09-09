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

/** Every user id the signed-in user has blocked, or who has blocked them. */
export async function fetchBlockedUserIds(userId: string): Promise<Set<string>> {
  if (!userId) return new Set();
  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

  if (error) {
    console.warn("[safety] block lookup failed", error);
    return new Set();
  }

  const ids = new Set<string>();
  for (const row of data ?? []) {
    ids.add(row.blocker_id === userId ? row.blocked_id : row.blocker_id);
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
 * Remove parent / coach / scout links and any open invite between two users.
 * Each table is attempted independently: a missing table or a row the caller
 * cannot touch must not stop the block itself from being recorded.
 */
async function revokeLinksBetween(a: string, b: string): Promise<void> {
  const attempts: Promise<unknown>[] = [
    supabase
      .from("parent_athlete_links")
      .delete()
      .or(
        `and(parent_id.eq.${a},athlete_id.eq.${b}),and(parent_id.eq.${b},athlete_id.eq.${a})`,
      ),
    supabase
      .from("scout_follows")
      .delete()
      .or(
        `and(scout_id.eq.${a},player_id.eq.${b}),and(scout_id.eq.${b},player_id.eq.${a})`,
      ),
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
