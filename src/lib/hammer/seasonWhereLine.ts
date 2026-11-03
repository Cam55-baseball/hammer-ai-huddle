/** Owner Nov 2 #11: one plain "where you are now" line for Update Hammer. */
export type SeasonDates = {
  preseason_start_date?: string | null; preseason_end_date?: string | null;
  in_season_start_date?: string | null; in_season_end_date?: string | null;
  post_season_start_date?: string | null; post_season_end_date?: string | null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (iso: string) => { const [, m, d] = iso.split("-").map(Number); return `${MONTHS[m - 1]} ${d}`; };
const future = (iso: string | null | undefined, today: string) => iso && iso >= today ? iso : null;

export function seasonWhereLine(phase: string | null | undefined, dates: SeasonDates | null | undefined, today: string): string {
  const d = dates ?? {};
  if (phase === "in_season") { const end = future(d.in_season_end_date, today); return end ? `In-season — ends ${short(end)}` : "In-season — end date not known yet"; }
  if (phase === "preseason") { const start = future(d.in_season_start_date, today); return start ? `Pre-season — season starts ${short(start)}` : "Pre-season — season start not known yet"; }
  if (phase === "post_season") { const end = future(d.post_season_end_date, today); return end ? `Post-season — ends ${short(end)}` : "Post-season — end date not known yet"; }
  if (phase === "off_season") { const start = future(d.preseason_start_date, today) ?? future(d.in_season_start_date, today); return start ? `Off-season — season starts ${short(start)}` : "Off-season — season dates not known yet"; }
  return "Season dates not known yet";
}
