import { describe, expect, it } from "vitest";
import { requiredAnalyses } from "../assessment/initialAssessment";
import { practicesDueToday, completedPracticeIds, type PracticePromptSource } from "./calendarPromptRules";

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
      it(`${sport} ${tier}: eight dated saves clear only their occurrence`, () => {
        const allowed = requiredAnalyses([`${sport}_${tier}`]);
        const rows: PracticePromptSource[] = allowed.map(module => ({ id: module, scheduled_date: "2026-10-20", status: "scheduled", recurring_active: true, recurring_days: [2], sport, session_module: module, title: "TEST practice" }));
        for (let week = 0; week < 8; week++) {
          const date = new Date("2026-10-20T12:00:00Z"); date.setUTCDate(date.getUTCDate() + week * 7);
          const today = date.toISOString().slice(0, 10);
          expect(practicesDueToday(rows, today, sport, allowed)).toHaveLength(allowed.length);
          const logs = allowed.map(module => ({ sport, module, session_date: today, deleted_at: null, fatigue_state_at_session: { scheduled_practice: { id: module, date: today, module } } }));
          expect(practicesDueToday(rows, today, sport, allowed, completedPracticeIds(logs, today, sport))).toEqual([]);
          date.setUTCDate(date.getUTCDate() + 7);
          const next = date.toISOString().slice(0, 10);
          expect(practicesDueToday(rows, next, sport, allowed, completedPracticeIds(logs, next, sport))).toHaveLength(allowed.length);
        }
      });
    }
  }
});