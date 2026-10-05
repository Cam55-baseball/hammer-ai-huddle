import type { Notice } from "./noticeRouting";

/** Display-only translations. Keep the canonical detail intact for storage, routing and read keys. */
export function athleteNoticeCopy({ reason, detail }: Notice): string {
  const s = detail.trim().toLowerCase();
  if (reason === "sleep" && s.startsWith("only ")) return "You slept less than usual. Today's hard work is lighter; follow the plan shown.";
  if (reason === "cns" && s.startsWith("self-reported cns")) return "You said you feel worn down. Today's hard work is lighter; follow the plan shown.";
  if (reason === "soreness" && s.startsWith("reported soreness")) return "You reported soreness. Some moves are easier today; use the versions shown.";
  if (reason === "learning_loop" && s.startsWith("you chose to take the recovery")) return "The reason you chose a lighter day still applies. Keep today's work easy as shown.";
  if (reason === "practice_load") {
    if (s.startsWith("practice scheduled today")) return "You have practice today. Some skill work is already covered there; do only what's shown here.";
    if (s.startsWith("team practice") || s.startsWith("showcase")) return "You have team practice or a showcase today. Your lift is easier; do the lift shown.";
  }
  if (reason === "day_intent") return "You chose an easier day in your check-in, so the hard work is dialled back.";
  if (reason === "recent_load" && s.includes("lighter to help you recover")) return detail;
  if (reason === "baseline" && s.includes("usual") && s.includes("today is lighter")) return detail;
  if (reason === "travel" && s.startsWith("travel day")) return "You're travelling today. Today's work is easier; focus on the movement work shown.";
  if (reason === "silent_signals") {
    const exact: Record<string, string> = {
      "we set today to match your last few sessions.": "Your last sessions shaped today's work. Do the work shown.",
      "we trimmed the reps to match how the last sessions went.": "Recent reps were hard to finish. Do the shorter version shown.",
      "we kept today steady while things settle.": "Recent work called for a steady day. Follow today's plan.",
      "today is set a touch lighter than your recent best.": "Recent strength work was harder. Use the lighter work shown.",
      "we swapped in a friendlier version of this movement.": "Recent work called for a different move. Do the one shown.",
      "extra single-side work today to even things up.": "Your sides have worked differently. Do the single-side work shown.",
      "we moved this session to a day that fits your schedule better.": "This session moved to fit your schedule. Do it when it appears in your plan.",
      "shorter session today so you can finish it.": "Recent sessions ended early. Do the shorter session shown.",
      "today is set to match your latest test numbers.": "Your latest test changed today's work. Follow the updated plan.",
      "today stays at the planned weight.": "Your recent sessions support today's weight. Keep the work shown.",
    };
    if (exact[s]) return exact[s];
  }
  if (reason === "game_proximity") {
    if (s.includes("games in seven days")) return "You have games close together. Game days get only short preparation; follow the plan shown on other days.";
    if (s.startsWith("lighter today — you have a game")) return "Your next game is close. Do only the short warm-up shown until after the game.";
    if (s.includes("no start time")) return "We don't have your game's start time, so we used an estimated time. Add the real time to update today's work.";
    if (s.startsWith("you marked today a doubleheader")) return "You have two games today. Hard work is lighter; follow today's plan.";
    if (s.startsWith("doubleheader yesterday")) return "You played two games yesterday. Hard work is still lighter today; follow the plan.";
    if (s.includes("starting pitcher today")) return "You're starting today. The lift is off; follow the rest of today's plan.";
    if (s.startsWith("you marked yourself the starting pitcher today")) return "You're starting today. The lift is off; follow the rest of today's plan.";
    if (s.startsWith("pitcher next to a team game")) return "You have a game soon, but haven't marked whether you're starting. Do the short work shown and update your game details.";
    if (s.startsWith("you start ")) return "You're starting tomorrow. Do only the short work shown today.";
    if (s.includes("no start declared")) return "You have a game soon but haven't marked whether you're starting. Do the short work shown, and update your game details if needed.";
    if (s.includes("lift through today's game day")) return "You chose to lift on game day. Follow today's lift; other safety limits still apply.";
    if (s.startsWith("zero-exposure rule:")) return "You haven't lifted recently. A short, easy lift remains today; do only what's shown.";
  }
  if (reason === "tissue_cost") {
    const starts: Array<[string, string]> = [
      ["game day — the lift comes after", "You play today. Lift only after your game."],
      ["tournament day", "You're in a tournament today. Skip the lift."],
      ["doubleheader today", "You have two games today. Skip the lift."],
      ["you're starting today", "You're starting today. Skip the lift."],
      ["you start tomorrow", "You're starting tomorrow. Do only the short work shown."],
      ["you flagged pain", "You reported pain. Skip the weighted work shown as off today."],
      ["easing back in", "You're coming back after time off. Start with the easier work shown."],
      ["your last lift was", "You lifted recently. Rest between lifts; do today's work as shown."],
      ["you played ", "You've played several games lately. Wait until the next planned day for hard lifting."],
      ["load has been piling up", "Recent training has been hard. Do the easier work shown today."],
      ["you're rested", "You're rested. Do the lift shown today."],
      ["we don't have today's date", "We can't place your training day yet. Stick with the recovery and skill work shown."],
      ["your tissues need", "You need more rest before your next lift. Do the recovery work shown."],
      ["standard spacing today", "Today's work is spaced to give you time to recover. Follow the plan."],
    ];
    for (const [prefix, copy] of starts) if (s.startsWith(prefix)) return copy;
    if (/^\d+ lifts already this week/.test(s)) return "You've already lifted this week. Keep today's lift easier as shown.";
    if (/^\d+ hours of practice/.test(s)) return "You've had a lot of practice. Give your legs an easier day; follow the plan.";
    if (s.startsWith("next heavy day:")) return `Your next hard lift is ${detail.split(":")[1]?.trim().replace(/\.$/, "") ?? "in your plan"}. Do today's work as shown.`;
  }
  if (reason === "load_spike") {
    if (s.startsWith("throwing is on hold")) return "Your throwing needs more rest after recent pitches. Skip the hard throws today.";
    if (s.includes("restart easy")) return "You haven't logged this work lately. Start with the easy version shown.";
    if (s.includes(" capped at ")) return "Recent work in this area has been lower. Do only the work shown today.";
  }
  // Unknown future templates must not leak internal language or imply a cause we cannot verify.
  if (import.meta.env.DEV) console.warn("[untranslated-athlete-notice]", { reason, detail });
  return "Today's work may have changed. Follow the plan shown, and ask your coach if the reason isn't clear.";
}