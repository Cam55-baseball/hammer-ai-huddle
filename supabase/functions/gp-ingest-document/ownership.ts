export interface ImportDocument {
  user_id: string;
  game_id: string | null;
  file_url: string | null;
}

/** Privileged file access is self-only and pinned to the saved document. */
export function ownsImport(
  userId: string,
  gameId: string,
  bucket: string,
  path: string,
  document: ImportDocument | null,
  game: { user_id: string; deleted_at?: string | null } | null,
): boolean {
  return Boolean(document && game && document.user_id === userId &&
    game.user_id === userId && !game.deleted_at && document.game_id === gameId &&
    bucket === "gp-documents" && path.startsWith(`${userId}/${gameId}/`) &&
    !path.split("/").includes("..") && document.file_url === `${bucket}://${path}`);
}