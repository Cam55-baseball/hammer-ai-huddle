/** Keep computed coaching intact when persistence fails; retry writes, never inference. */
export async function saveAnalysisReport(
  write: () => PromiseLike<{ error: { message: string } | null }>,
  wait: () => Promise<void> = () => new Promise(resolve => setTimeout(resolve, 750)),
): Promise<{ saved: boolean; error: string | null }> {
  let message: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await write();
      if (!result.error) return { saved: true, error: null };
      message = result.error.message;
    } catch (error) { message = error instanceof Error ? error.message : "Report save failed"; }
    if (attempt === 0) await wait();
  }
  return { saved: false, error: message };
}