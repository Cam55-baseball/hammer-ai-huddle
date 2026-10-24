import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkoutActuals } from "@/components/hammer/WorkoutActuals";
import { useSaveExerciseLog } from "@/hooks/useExerciseLog";
import { Button } from "@/components/ui/button";
import { CoachPrescriptionStatus } from "@/components/coach/CoachPrescriptionStatus";
import { CoachPlanActuals } from "@/components/coach/CoachPlanActuals";
import { prescriptionResults } from "../../../supabase/functions/_shared/coach/prescriptionResults";

const store = vi.hoisted(() => ({ user: "player-one", rows: [] as Record<string, any>[], deleteFailure: false, inserts: 0 }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: store.user } }) }));
vi.mock("@/hooks/useCoachPrescriptions", () => ({ useManageSentWorkouts: () => {
  const query = useQuery({ queryKey: ["coach-rx-manage"], queryFn: async () => {
    const send = { id: "coach-rx", recipient_id: "player-one" };
    const prescription = { id: "coach-row", user_id: "player-one", plan_date: "2026-10-24", movement_slug: "timing", movement_name: "Coach timing", dosage_unit: "seconds", slot: "warmup", why_payload: { coach_rx: "coach-rx" } };
    return [{ ...send, title: "Coach timing", category: "warmup", recipient_name: "Player", status: "added_alongside", plan_date: "2026-10-24", results: prescriptionResults([send], [prescription], store.rows)[send.id] ?? [] }];
  } });
  return { rows: query.data ?? [], isLoading: query.isLoading, error: query.error, acting: false };
} }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    let action = "read", inserted: Record<string, any> | undefined;
    const filters: Array<[string, unknown]> = [];
    const chain: Record<string, any> = {};
    chain.select = () => chain;
    chain.order = () => chain;
    chain.limit = () => chain;
    chain.eq = (key: string, value: unknown) => { filters.push([key, value]); return chain; };
    chain.delete = () => { action = "delete"; return chain; };
    chain.insert = (row: Record<string, any>) => { action = "insert"; inserted = row; return chain; };
    const execute = () => {
      if (table !== "wk_session_logs") throw new Error(`Unexpected table ${table}`);
      if (action === "delete") {
        if (store.deleteFailure) return { data: null, error: new Error("delete refused") };
        store.rows = store.rows.filter(row => !filters.every(([key, value]) => row[key] === value));
        return { data: null, error: null };
      }
      if (action === "insert" && inserted) {
        const row = { ...inserted, id: "entered-log", prescription: { movement_name: "Coach timing", slot: "warmup", dosage_unit: "seconds" } };
        store.rows.push(row); store.inserts++;
        return { data: row, error: null };
      }
      return { data: store.rows.filter(row => filters.every(([key, value]) => row[key] === value)), error: null };
    };
    chain.single = async () => execute();
    chain.then = (resolve: (value: unknown) => void) => Promise.resolve(execute()).then(resolve);
    return chain;
  },
} }));

function LogAndRead() {
  const save = useSaveExerciseLog();
  return <><Button onClick={() => save.mutate({ prescription_id: "coach-row", movement_slug: "timing", plan_date: "2026-10-24", rounds: [{ time: 1.47 }] })}>Save entered work</Button>
    {save.error && <p role="alert">Save failed</p>}<WorkoutActuals /></>;
}
function mount(child: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { client, ...render(<QueryClientProvider client={client}>{child}</QueryClientProvider>) };
}
beforeEach(() => { store.user = "player-one"; store.rows = []; store.inserts = 0; store.deleteFailure = false; });
afterEach(cleanup);
describe("row 3 canonical write and displayed readback", () => {
  it("coach plan actuals reads the saved occurrence and excludes another player and date", async () => {
    const first = mount(<LogAndRead />);
    fireEvent.click(screen.getByRole("button", { name: "Save entered work" }));
    await waitFor(() => expect(store.inserts).toBe(1));
    first.unmount(); first.client.clear();
    store.rows.push({ ...store.rows[0], id: "other-date", plan_date: "2026-10-25", duration_seconds_precise: 9.99 });
    const second = mount(<CoachPlanActuals athleteId="player-one" planDate="2026-10-24" />);
    expect(await screen.findByText(/Time: 1\.47 s/)).toBeTruthy();
    expect(screen.queryByText(/9\.99/)).toBeNull();
    second.unmount(); second.client.clear();
    mount(<CoachPlanActuals athleteId="unrelated-player" planDate="2026-10-24" />);
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    expect(screen.queryByText(/1\.47/)).toBeNull();
  });
  it("Sent workouts reads the canonical saved occurrence after logging and remount", async () => {
    const first = mount(<LogAndRead />);
    fireEvent.click(screen.getByRole("button", { name: "Save entered work" }));
    await waitFor(() => expect(store.inserts).toBe(1));
    first.unmount(); first.client.clear();
    const second = mount(<CoachPrescriptionStatus />);
    expect(await screen.findByText(/Time: 1\.47 s/)).toBeTruthy();
    second.unmount(); second.client.clear();
    store.rows.push({ ...store.rows[0], id: "other-date", plan_date: "2026-10-25", duration_seconds_precise: 9.99 });
    mount(<CoachPrescriptionStatus />);
    expect(await screen.findByText(/Time: 1\.47 s/)).toBeTruthy();
    expect(screen.queryByText(/Time: 9\.99 s/)).toBeNull();
  });
  for (const surface of ["History", "Vault My Drill Work", "The General"]) {
    it(`${surface} shared reader shows entered 1.47 after save and remount`, async () => {
      const first = mount(<LogAndRead />);
      fireEvent.click(screen.getByRole("button", { name: "Logged workouts" }));
      fireEvent.click(screen.getByRole("button", { name: "Save entered work" }));
      await waitFor(() => expect(store.inserts).toBe(1));
      await waitFor(() => expect(screen.getByText(/Time: 1\.47 s/)).toBeTruthy());
      first.unmount(); first.client.clear();
      mount(<WorkoutActuals />);
      fireEvent.click(screen.getByRole("button", { name: "Logged workouts" }));
      expect(await screen.findByText(/Time: 1\.47 s/)).toBeTruthy();
      expect(store.rows[0].duration_seconds_precise).toBe(1.47);
    });
  }
  it("does not write or report success after failed prior-log removal", async () => {
    store.deleteFailure = true;
    mount(<LogAndRead />);
    fireEvent.click(screen.getByRole("button", { name: "Save entered work" }));
    await screen.findByRole("alert");
    expect(store.inserts).toBe(0);
  });
  it("changing viewer never reads the previous player's work", async () => {
    const first = mount(<LogAndRead />);
    fireEvent.click(screen.getByRole("button", { name: "Save entered work" }));
    await waitFor(() => expect(store.inserts).toBe(1));
    first.unmount(); first.client.clear(); store.user = "unrelated-player";
    mount(<WorkoutActuals />);
    fireEvent.click(screen.getByRole("button", { name: "Logged workouts" }));
    await screen.findByText("No logged workouts yet.");
    expect(screen.queryByText(/Time: 1\.47/)).toBeNull();
  });
});