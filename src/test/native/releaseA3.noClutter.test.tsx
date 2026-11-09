import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// Owner Nov 9: with Apple Health switches ON, Today and the cards look and behave exactly the same.
const native = vi.hoisted(() => ({ on: false }));
const toasts = vi.hoisted(() => [] as string[]);
const writer = vi.hoisted(() => ({
  isAvailable: async () => ({ available: true }),
  authorizationStatus: async () => ({ workouts: "authorized", distance: "authorized" }),
  requestAuthorization: async () => ({ workouts: "authorized" }),
  saveWorkout: vi.fn(async () => ({ workoutId: "HK-1", distanceSaved: false })),
  deleteWorkout: vi.fn(async () => ({ deleted: 1 })),
}));
const prefs = vi.hoisted(() => new Map<string, string>());

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native.on, getPlatform: () => (native.on ? "ios" : "web") },
  registerPlugin: () => writer,
}));
vi.mock("@capgo/capacitor-health", () => ({ Health: { isAvailable: async () => ({ available: true }), requestAuthorization: async () => ({}), readSamples: async () => ({ samples: [] }) } }));
vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async ({ key }: any) => ({ value: prefs.get(key) ?? null }),
    set: async ({ key, value }: any) => { prefs.set(key, value); },
    remove: async ({ key }: any) => { prefs.delete(key); },
  },
}));
vi.mock("@/lib/legal/legalV2", () => ({
  AGREEMENT_SLUGS: { healthConsent: "health-data-consent" },
  myConsentStatus: async () => ({ "health-data-consent": { choice: "accepted" } }),
}));
vi.mock("sonner", () => {
  const t: any = (m: string) => { toasts.push(`toast:${m}`); };
  t.success = (m: string) => { toasts.push(`success:${m}`); };
  t.error = (m: string) => { toasts.push(`error:${m}`); };
  return { toast: t };
});
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u" } }) }));
vi.mock("@/contexts/SportThemeContext", () => ({ useSportTheme: () => ({ sport: "baseball" }) }));
vi.mock("@/hooks/useHammerDailyTasks", () => ({
  useHammerDailyTasks: () => ({ bulkSet: async () => {}, isDone: () => false }),
  makeBlockTaskId: (m: string, s: string) => `${m}:${s}`,
}));
vi.mock("@/lib/hammer/prescription/dailyEngagement", () => ({ loadEngagement: () => ({}), todayCompletion: () => null, recordCompletion: () => {}, clearCompletion: () => {} }));
vi.mock("@/lib/videoMoments/bus", () => ({ emitVideoMoment: () => {} }));
vi.mock("@/integrations/supabase/client", () => {
  const b: any = new Proxy({}, { get: (_t, k) => k === "then" ? (res: any) => res({ data: k === "then" ? [{ feature_key: "healthkit_write_v1", mode: "all", allowlist: [] }, { feature_key: "healthkit_read_v1", mode: "all", allowlist: [] }] : null, error: null }) : () => b });
  return { supabase: { from: () => b, auth: { getUser: async () => ({ data: { user: { id: "u" } } }) } } };
});
vi.mock("@/hooks/useOwnerAccess", () => ({ useOwnerAccess: () => ({ isOwner: false }) }));
vi.mock("@/hooks/useAdminAccess", () => ({ useAdminAccess: () => ({ isAdmin: false }) }));
vi.mock("@/hooks/useSubscription", () => ({ useSubscription: () => ({ modules: [] }) }));
vi.mock("@/hooks/useParentLink", () => ({ useParentLinks: () => ({ data: [] }) }));
vi.mock("@/components/account/DeleteAccountSection", () => ({ DeleteAccountSection: () => <div>delete-section</div> }));
vi.mock("@/components/parent/ParentControls", () => ({ ParentControls: () => null }));

import { WkCardCompletion } from "@/components/hammer/WkCardCompletion";
import { BlockCompletionControls } from "@/components/hammer/BlockCompletionControls";
import DeleteAccountSettings from "@/pages/settings/DeleteAccountSettings";
import { clearNativeFlags, loadNativeFlags } from "@/lib/native/nativeFlags";
import { loadHealthWriteSwitch, _resetHealthWorkoutsForTests } from "@/lib/native/healthWorkouts";

const items = [{ id: "rx1", plan_date: "2026-11-09", slot: "lift", movement_name: "Trap bar deadlift", movement_slug: "trap-bar", status: "planned", sets: 3, reps: 5 }] as any;
const drills = [{ slug: "tee", name: "Tee work" }] as any;

function cards() {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>
    <WkCardCompletion modality="lifts" modalityLabel="Lifts" items={items} />
    <BlockCompletionControls modality="hitting" modalityLabel="Hitting" onChanged={() => {}} drills={drills} planDate="2026-11-09" />
  </QueryClientProvider>);
}

async function markBoth() {
  for (const b of screen.getAllByRole("button", { name: "Mark done" })) await act(async () => { fireEvent.click(b); });
  await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
}

beforeEach(() => { toasts.length = 0; prefs.clear(); localStorage.clear(); clearNativeFlags(); _resetHealthWorkoutsForTests(); });
afterEach(() => cleanup());

describe("A3 no clutter: Today cards are identical with the Apple Health switches on", () => {
  it("same markup and the same messages after Mark done, switches off (web) vs on (iPhone)", async () => {
    native.on = false;
    const off = cards();
    const offHtml = off.container.innerHTML;
    await markBoth();
    const offToasts = [...toasts].map((t) => t.replace(/done\. .*/, "done."));
    const offAfter = off.container.innerHTML;
    cleanup(); toasts.length = 0;

    native.on = true;
    prefs.set("hm.health.write.on.u", "1"); prefs.set("hm.health.connected.u", "x");
    await loadNativeFlags("u"); await loadHealthWriteSwitch("u");
    const on = cards();
    expect(on.container.innerHTML).toBe(offHtml);
    await markBoth();
    expect([...toasts].map((t) => t.replace(/done\. .*/, "done."))).toEqual(offToasts);
    expect(on.container.innerHTML).toBe(offAfter);
    expect(document.body.textContent).not.toMatch(/Apple Health/i);
  });

  it("the Apple Health section appears only in Settings, and only in the iPhone app", async () => {
    native.on = false;
    render(<MemoryRouter><DeleteAccountSettings /></MemoryRouter>);
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(screen.queryByTestId("apple-health-settings")).toBeNull();
    cleanup();
    native.on = true;
    render(<MemoryRouter><DeleteAccountSettings /></MemoryRouter>);
    expect(await screen.findByTestId("apple-health-settings")).toBeTruthy();
    expect(screen.getByLabelText("Read my sleep and heart data")).toBeTruthy();
    expect(screen.getByLabelText("Save my Hammers workouts to Apple Health")).toBeTruthy();
    expect(screen.getByText("To remove access completely: iPhone Settings → Health → Data Access & Devices → Hammers.")).toBeTruthy();
  });
});
