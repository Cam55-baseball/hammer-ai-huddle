/** Request dispatch and activation rules shared by the coach-workout handler and tests. */
export function prescriptionMode(mode: unknown): "check" | "choose" | "manage" | "send" | "edit_day" | null {
  return mode === "check" || mode === "choose" || mode === "manage" || mode === "send" || mode === "edit_day" ? mode : null;
}

/** Shelving or declining a workout never consumes/moves its scheduled date. */
export function prescriptionChoiceDate(choice: string, activateToday: boolean, scheduledDate: string, today: string): string {
  return activateToday && (choice === "use_instead" || choice === "add_alongside") ? today : scheduledDate;
}