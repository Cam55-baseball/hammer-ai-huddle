/** Visit-only confirmation survives plan remounts; never a persisted plan or authorization. */
const confirmations = new Map<string, string>();
const key = (userId: string, date: string) => `${userId}:${date}`;
export function rememberChangeConfirmation(userId: string, date: string, message: string) {
  confirmations.set(key(userId, date), message);
}
export function readChangeConfirmation(userId: string | undefined, date: string): string | null {
  return userId ? confirmations.get(key(userId, date)) ?? null : null;
}