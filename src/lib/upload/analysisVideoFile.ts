/** Some phone exports have no MIME type or an application/octet-stream type. */
export function isAnalysisVideoFile(file: Pick<File, "type" | "name">): boolean {
  if (file.type.startsWith("video/")) return true;
  return (!file.type || file.type === "application/octet-stream") && /\.(mp4|mov|m4v|avi|webm|mkv|3gp)$/i.test(file.name);
}
/** Video types the private `videos` storage bucket accepts. */
const STORED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"] as const;

/**
 * Upload type for a clip. Some phones and browsers hand over a .MOV with no
 * type (or a generic one), which storage refuses; the extension decides then.
 * The bytes are never changed.
 */
export function analysisVideoContentType(file: Pick<File, "type" | "name">): string {
  if ((STORED_VIDEO_TYPES as readonly string[]).includes(file.type)) return file.type;
  const ext = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (ext === "mov" || ext === "qt") return "video/quicktime";
  if (ext === "webm" || ext === "mkv") return "video/webm";
  if (ext === "avi") return "video/x-msvideo";
  return "video/mp4"; // mp4, m4v, 3gp and other ISO-media phone clips
}

/**
 * The same clip bytes, labelled with an accepted upload type. Storage reads
 * the type from the file itself (an explicit option is ignored for files), so
 * an untyped .MOV must be relabelled, never re-encoded.
 */
export function withAnalysisVideoType(file: File): File {
  const type = analysisVideoContentType(file);
  return file.type === type ? file : new File([file], file.name, { type, lastModified: file.lastModified });
}
