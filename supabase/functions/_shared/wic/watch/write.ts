/**
 * Step 13 Part B — writing the watchdog's notes.
 *
 * Every note lands in public.ti_watch_notes. Anything critical also raises an
 * owner alert straight away, through the same in-app Owner Alert Center the
 * rest of the system already uses.
 *
 * Writing a note must never break the thing it is watching: every call is
 * wrapped so a failure here can only cost us the note, never the card.
 */
import type { WatchNote } from "./rules.ts";

type Admin = {
  from: (table: string) => any;
};

const minuteBucket = () => new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();

export async function writeNotes(admin: Admin, notes: WatchNote[]): Promise<number> {
  if (notes.length === 0) return 0;
  try {
    const rows = notes.map((n) => ({
      severity: n.severity,
      category: n.category,
      user_id: n.user_id ?? null,
      decision_id: n.decision_id ?? null,
      title: n.title,
      detail: n.detail ?? {},
      auto_action: n.auto_action ?? null,
    }));
    await admin.from("ti_watch_notes").insert(rows);

    // Anything critical alerts the owner immediately.
    const criticals = notes.filter((n) => n.severity === "critical");
    if (criticals.length > 0) {
      await admin.from("owner_alerts").insert(
        criticals.map((n) => ({
          alert_key: `ti_watch_${n.category}`,
          severity: "critical",
          title: n.title,
          detail: { ...n.detail, category: n.category, user_id: n.user_id ?? null, auto_action: n.auto_action ?? null },
          minute_bucket: minuteBucket(),
        })),
      );
    }
    return rows.length;
  } catch (err) {
    console.warn("[watchdog] could not write notes", err);
    return 0;
  }
}

export async function writeNote(admin: Admin, note: WatchNote): Promise<number> {
  return await writeNotes(admin, [note]);
}
