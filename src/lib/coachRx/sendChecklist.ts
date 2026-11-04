/** Owner Nov 4 r2 #1: every input a coach must give before Send, in plain words. */
export interface SendChecklistInput {
  title?: string;
  category?: string | null;
  players: number;
  dateValid: boolean;
  exercises: Array<{ name?: string; dosage_unit?: string | null }>;
}

export function sendChecklist(i: SendChecklistInput): string[] {
  const out: string[] = [];
  if (i.players === 0) out.push("Required: pick at least one player");
  if (!i.category || i.category === "all") out.push("Required: pick a category for this workout");
  if (!i.dateValid) out.push("Required: pick a date (today or later)");
  if (i.title !== undefined && !i.title.trim()) out.push("Required: give the workout a name");
  if (i.exercises.length === 0) out.push("Required: add at least one exercise");
  else {
    if (i.exercises.some(e => !e.name?.trim())) out.push("Required: every exercise needs a name");
    if (i.exercises.some(e => !e.dosage_unit)) out.push("Required: every exercise needs a measure (reps, seconds or feet)");
  }
  return out;
}

export function sendButtonHint(missing: string[]): string | null {
  if (!missing.length) return null;
  return `${missing.length} thing${missing.length === 1 ? "" : "s"} left before you can send`;
}
