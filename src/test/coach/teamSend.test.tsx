/**
 * Team send (owner request Oct 24): sending one template to several players
 * writes one coach_prescriptions row per player, all sharing one
 * team_send_id, so each player gets their own Today choice and safety check.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSentActivities } from "@/hooks/useSentActivities";
import type { CustomActivityTemplate } from "@/types/customActivity";

const inserts: Record<string, unknown[][]> = {};
vi.mock('@tanstack/react-query', () => ({useQueryClient: () => ({invalidateQueries: vi.fn()})}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "coach-1" } } }) },
    from: (table: string) => ({
      insert: async (rows: unknown[]) => {
        (inserts[table] ??= []).push(rows);
        return { error: null };
      },
    }),
    functions: { invoke: async (_name: string, options: { body: { rows: unknown[] } }) => {
      (inserts["coach_prescriptions"] ??= []).push(options.body.rows);
      return { data: { applied: true }, error: null };
    } },
  },
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const template = {
  id: "tpl-1",
  user_id: "coach-1",
  activity_type: "workout",
  title: "Team lift",
  icon: "dumbbell",
  color: "#ef4444",
  exercises: [{ id: "e1", name: "Squat", type: "strength", sets: 3, reps: 8 }],
  meals: { items: [], vitamins: [], supplements: [] },
  custom_fields: [],
  intervals: [],
  is_favorited: false,
  recurring_days: [],
  recurring_active: false,
  sport: "baseball",
  intensity: "standard",
  created_at: "2026-10-24",
  updated_at: "2026-10-24",
} as unknown as CustomActivityTemplate;

describe("coach team send", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-24T12:00:00Z"));
    for (const k of Object.keys(inserts)) delete inserts[k];
  });
  afterEach(() => vi.useRealTimers());

  it("writes one coach_prescriptions row per player with a shared team_send_id", async () => {
    const { result } = renderHook(() => useSentActivities());
    const ok = await result.current.sendActivityToPlayers(
      template,
      ["p1", "p2", "p3"],
      [],
      undefined,
      { category: "lift", planDate: "2026-10-24" },
    );
    expect(ok).toBe(true);
    const rows = inserts["coach_prescriptions"]?.[0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.recipient_id)).toEqual(["p1", "p2", "p3"]);
    expect(rows.every((r) => r.category === "lift" && r.plan_date === "2026-10-24")).toBe(true);
    expect(rows.every((r) => r.team_send_id === rows[0].team_send_id && r.team_send_id)).toBe(true);
    expect(rows.every((r) => (r.safety_result as any).intensity === "standard")).toBe(true);
    expect(inserts["sent_activity_templates"]).toBeUndefined();
  });

  it("a single-player send has no team_send_id", async () => {
    const { result } = renderHook(() => useSentActivities());
    await result.current.sendActivityToPlayers(template, ["p1"], [], undefined, { category: "hitting", planDate: "2026-10-24" });
    const rows = inserts["coach_prescriptions"]?.[0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0].team_send_id).toBeNull();
  });
  it('keeps the player note and locked controls on the canonical prescription', async () => {
    const { result } = renderHook(() => useSentActivities());
    await result.current.sendActivityToPlayers(template, ['p1'], ['exercises'], 'Keep this light', {category:'hitting',planDate:'2026-10-24'});
    const rows = inserts['coach_prescriptions']?.[0] as Array<Record<string, unknown>>;
    expect(rows[0].coach_message).toBe('Keep this light');
    expect(rows[0].locked_fields).toEqual(['exercises']);
  });

  it("an invalid recurring schedule leaves no invitation or prescription behind", async () => {
    const { result } = renderHook(() => useSentActivities());
    const ok = await result.current.sendActivityToPlayers(template, ["p1"], [], undefined, {
      category: "hitting", planDate: "2026-10-24",
      schedule: { type: "recurring", startDate: "2026-10-24", weekdays: [], count: 12 },
    });
    expect(ok).toBe(false);
    expect(Object.keys(inserts)).toEqual([]);
  });
});
