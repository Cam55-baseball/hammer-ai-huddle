import { describe, expect, it } from "vitest";
import { requiredAnalyses } from "../assessment/initialAssessment";
import { practicesDueToday, type PracticePromptSource } from "./calendarPromptRules";

describe("56-day subscribed practice reminder matrix", () => {
  for (const sport of ["baseball", "softball"]) {
    for (const tier of ["5tool", "pitcher", "golden2way"]) {
      it(`${sport} ${tier}: only included practice modules, eight weeks`, () => {
        const allowed = requiredAnalyses([`${sport}_${tier}`]);
        const rows: PracticePromptSource[] = ["hitting", "pitching", "throwing"].map(module => ({
          id: module, scheduled_date: "2026-10-20", status: "scheduled", recurring_active: true,
          recurring_days: [2], sport, session_module: module, title: "TEST practice",
        }));
        let total = 0;
        for (let day = 0; day < 56; day++) {
          const date = new Date("2026-10-20T12:00:00Z"); date.setUTCDate(date.getUTCDate() + day);
          const due = practicesDueToday(rows, date.toISOString().slice(0, 10), sport, allowed);
          expect(due.map(row => row.session_module)).toEqual(day % 7 === 0 ? allowed : []);
          total += due.length;
        }
        expect(total).toBe(8 * allowed.length);
      });
    }
  }
});