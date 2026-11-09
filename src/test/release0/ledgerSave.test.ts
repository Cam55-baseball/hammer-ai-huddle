// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { judgeMeasurement, withRetries, type DictRow, type IncomingMeasurement, type SaveContext } from "../../../supabase/functions/_shared/ledger/saveRules";
import { OWNED_TABLES } from "../../../supabase/functions/delete-account/ownedTables";
import { mayMeasureMovement, MOVEMENT_CONSENT_TEXT } from "@/lib/legal/movementConsent";

const cmj: DictRow = { metric_key: "cmj_height_cm", unit: "cm", physical_min: 5, physical_max: 110, required_fps: 240, in_app_only: true, privacy_class: "training" };
const sprint: DictRow = { metric_key: "sprint_60yd_s", unit: "s", physical_min: 5.5, physical_max: 15, required_fps: null, in_app_only: false, privacy_class: "training" };
const cam = (o: Partial<IncomingMeasurement> = {}): IncomingMeasurement => ({ metric_key: "cmj_height_cm", value: 42, source_kind: "cv_measured", capture_fps: 240, ...o });
const ios: SaveContext = { platform: "ios", movementConsentOn: true, movementConsentActive: true, attestOn: true, attested: true };

describe("One save path: measurement rules", () => {
  it("a manual web number with a dictionary key saves", () => {
    expect(judgeMeasurement(sprint, { metric_key: "sprint_60yd_s", value: 7.1, source_kind: "manual" }, { ...ios, platform: "web", attested: false })).toEqual({ ok: true, inApp: false });
  });
  it("unknown keys and wrong units are refused", () => {
    expect(judgeMeasurement(undefined, cam(), ios)).toMatchObject({ ok: false, reason: "unknown_metric" });
    expect(judgeMeasurement(cmj, cam({ unit: "in" }), ios)).toMatchObject({ ok: false, reason: "unit_mismatch" });
  });
  it("camera measurements are iPhone-app only", () => {
    expect(judgeMeasurement(cmj, cam(), { ...ios, platform: "web" })).toMatchObject({ ok: false, reason: "iphone_app_only", status: 403 });
  });
  it("with movement_consent_v1 on, no active consent → refused; switch off → not required", () => {
    expect(judgeMeasurement(cmj, cam(), { ...ios, movementConsentActive: false })).toMatchObject({ ok: false, reason: "movement_consent_required" });
    expect(judgeMeasurement(cmj, cam(), { ...ios, movementConsentOn: false, movementConsentActive: false }).ok).toBe(true);
  });
  it("with app_attest_v1 on, an unattested iPhone save is refused; off → allowed (marked unattested)", () => {
    expect(judgeMeasurement(cmj, cam(), { ...ios, attested: false })).toMatchObject({ ok: false, reason: "app_attest_required" });
    expect(judgeMeasurement(cmj, cam(), { ...ios, attestOn: false, attested: false }).ok).toBe(true);
  });
  it("gate 1 at save: missing or too-low counted fps is refused, never defaulted", () => {
    expect(judgeMeasurement(cmj, cam({ capture_fps: null }), ios)).toMatchObject({ reason: "capture_fps_missing" });
    expect(judgeMeasurement(cmj, cam({ capture_fps: 120 }), ios)).toMatchObject({ reason: "capture_fps_below_required" });
  });
  it("gate 3 at save: a physically impossible camera number is refused", () => {
    expect(judgeMeasurement(cmj, cam({ value: 150 }), ios)).toMatchObject({ reason: "physically_impossible" });
  });
  it("clients cannot claim Health or derived sources", () => {
    expect(judgeMeasurement(sprint, { metric_key: "sprint_60yd_s", value: 7, source_kind: "healthkit" }, ios)).toMatchObject({ reason: "not_a_client_source" });
  });
});

describe("No silent drops", () => {
  it("retries a failing save, then reports the failure with the attempt count", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("network down"));
    const r = await withRetries(fn, [1, 1, 1], async () => undefined);
    expect(fn).toHaveBeenCalledTimes(4);
    expect(r).toEqual({ ok: false, error: "network down", attempts: 4 });
  });
  it("a save that succeeds on retry is returned", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("blip")).mockResolvedValue("id-1");
    expect(await withRetries(fn, [1], async () => undefined)).toEqual({ ok: true, value: "id-1", attempts: 2 });
  });
});

describe("Client save path", () => {
  beforeEach(() => vi.resetModules());
  it("logs a final network failure to the owner's System checks and reports save_failed", async () => {
    const log = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/hammer/planCheckFailures", () => ({ logPlanCheckFailure: log }));
    vi.doMock("@/lib/native/appAttest", () => ({ attestMeasurements: async () => null }));
    vi.doMock("@/lib/native/nativeFlags", () => ({ isNativeIos: () => false }));
    vi.doMock("@/integrations/supabase/client", () => ({ supabase: {} }));
    const { saveMeasurements } = await import("@/lib/ledger/saveMeasurement");
    const invoke = vi.fn().mockResolvedValue({ data: null, error: new Error("Failed to fetch") });
    const r = await saveMeasurements([{ metric_key: "sprint_60yd_s", value: 7.1, source_kind: "manual" }], { invoke });
    expect(r).toEqual({ ok: false, reason: "save_failed" });
    expect(invoke).toHaveBeenCalledTimes(3);
    expect(log).toHaveBeenCalledWith("measurement_save", "Failed to fetch");
  }, 10_000);
  it("a rule refusal (4xx) is returned at once, not retried", async () => {
    vi.doMock("@/lib/hammer/planCheckFailures", () => ({ logPlanCheckFailure: vi.fn() }));
    vi.doMock("@/lib/native/appAttest", () => ({ attestMeasurements: async () => null }));
    vi.doMock("@/lib/native/nativeFlags", () => ({ isNativeIos: () => false }));
    vi.doMock("@/integrations/supabase/client", () => ({ supabase: {} }));
    const { saveMeasurements } = await import("@/lib/ledger/saveMeasurement");
    const error = Object.assign(new Error("403"), { context: { status: 403, json: async () => ({ error: "iphone_app_only" }) } });
    const invoke = vi.fn().mockResolvedValue({ data: null, error });
    expect(await saveMeasurements([{ metric_key: "cmj_height_cm", value: 40, source_kind: "cv_measured", capture_fps: 240 }], { invoke })).toEqual({ ok: false, reason: "iphone_app_only" });
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});

describe("Consent, deletion lists and iPhone project", () => {
  it("only an active consent allows a camera measurement", () => {
    expect(["none", "pending_parent", "declined", "revoked"].map((s) => mayMeasureMovement(s as never))).toEqual([false, false, false, false]);
    expect(mayMeasureMovement("active")).toBe(true);
  });
  it("no consent words are invented: the step is blocked until the lawyer-approved text is supplied", () => {
    expect(MOVEMENT_CONSENT_TEXT).toBeNull();
  });
  it("every Release 0 table is on the delete-account (and so the download-my-data) list", () => {
    const names = OWNED_TABLES.map(([t]) => t);
    for (const t of ["athlete_metric_observations", "athlete_baseline_history", "athlete_metric_baselines", "ledger_write_failures", "movement_consents",
      "measurement_deletion_requests", "app_attest_keys", "app_attest_challenges", "validation_trials"]) expect(names).toContain(t);
  });
  it("the App Attest plugin is compiled and registered next to the storefront plugin; production attest entitlement", () => {
    const pbx = readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
    expect(pbx).toMatch(/AppAttestPlugin\.swift in Sources \*\/,/);
    expect(pbx).toMatch(/StorefrontPlugin\.swift in Sources \*\/,/);
    const bridge = readFileSync("ios/App/App/HammersBridgeViewController.swift", "utf8");
    expect(bridge).toContain("registerPluginInstance(StorefrontPlugin())");
    expect(bridge).toContain("registerPluginInstance(AppAttestPlugin())");
    const ent = readFileSync("ios/App/App/App.entitlements", "utf8");
    expect(ent).toMatch(/appattest-environment<\/key>\s*<string>production<\/string>/);
    expect(ent).toContain("com.apple.developer.applesignin");
    expect(ent).toContain("com.apple.developer.in-app-payments");
  });
});
