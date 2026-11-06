/** Dev-only harness for phone screenshots of the coach Notes area and note form. */
import { CoachPrivateNotes } from "@/components/coach/CoachTestsAndNotes";

export default function CoachNotesHarness() {
  return <main className="mx-auto max-w-md space-y-3 bg-background p-4"><CoachPrivateNotes athleteId="00000000-0000-0000-0000-000000000000" /></main>;
}
