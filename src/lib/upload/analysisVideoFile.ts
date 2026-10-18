/** Some phone exports have no MIME type or an application/octet-stream type. */
export function isAnalysisVideoFile(file: Pick<File, "type" | "name">): boolean {
  if (file.type.startsWith("video/")) return true;
  return (!file.type || file.type === "application/octet-stream") && /\.(mp4|mov|m4v|avi|webm|mkv|3gp)$/i.test(file.name);
}