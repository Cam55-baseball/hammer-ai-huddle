export type DraftFlush = () => Promise<boolean>;
export type RegisterDraftFlush = (flush: DraftFlush | null) => void;
export async function saveBeforeAssessmentNavigation(flush: DraftFlush | null, navigate: () => Promise<void>): Promise<boolean> {
  if (flush && !await flush()) return false;
  await navigate();
  return true;
}