/** Only the owner-authorized proof administrator; ordinary TEST/demo athletes stay discoverable. */
export const TEST_ADMIN_PROOF_ID = "a3574d4f-0296-4093-9607-c47b7323dd35";
export function excludeTestAdmin<T extends { id?: string; user_id?: string }>(rows: readonly T[]): T[] {
  return rows.filter(row => row.id !== TEST_ADMIN_PROOF_ID && row.user_id !== TEST_ADMIN_PROOF_ID);
}