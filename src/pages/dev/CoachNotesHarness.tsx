/** Dev-only harness for phone screenshots of the coach Notes areas and note form. */
import { useSearchParams } from "react-router-dom";
import { AddCoachNoteDialog, CoachPrivateNotes, TAG_INSTRUCTIONS } from "@/components/coach/CoachTestsAndNotes";
import { PlayerNotesSection } from "@/components/scout/PlayerNotesSection";

const players = [{ id: "00000000-0000-0000-0000-000000000001", full_name: "Ava Brooks", avatar_url: null }, { id: "00000000-0000-0000-0000-000000000002", full_name: "Zoe Young", avatar_url: null }];
export default function CoachNotesHarness() {
  const [p] = useSearchParams();
  const view = p.get("view");
  if (view === "dashboard") return <main className="mx-auto max-w-md space-y-3 bg-background p-4"><PlayerNotesSection players={players} tagPlayers={players} /></main>;
  if (view === "profile") return <main className="mx-auto max-w-md space-y-3 bg-background p-4"><h1 className="text-xl font-bold">Ava Brooks</h1>
    <section className="space-y-2 rounded-md border p-3" data-testid="coach-view-notes-issues"><AddCoachNoteDialog athleteId={players[0].id} triggerLabel="Notes & issues" big /><p className="text-xs text-muted-foreground">{TAG_INSTRUCTIONS}</p></section>
    <p className="text-sm text-muted-foreground">Overview · Development · Week calendar …</p></main>;
  return <main className="mx-auto max-w-md space-y-3 bg-background p-4"><CoachPrivateNotes athleteId="00000000-0000-0000-0000-000000000000" /></main>;
}
