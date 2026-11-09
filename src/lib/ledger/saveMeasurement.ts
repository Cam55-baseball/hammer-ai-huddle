/**
 * Release 0: the ONE browser/iPhone path for saving a measurement (→ ledger-save → public.ledger_save).
 * Retries network failures; a final failure is logged for the owner's System checks card and
 * reported honestly to the caller (never silently dropped, never pushed).
 */
import { App } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import { isNativeIos } from "@/lib/native/nativeFlags";
import { attestMeasurements } from "@/lib/native/appAttest";
import { logPlanCheckFailure } from "@/lib/hammer/planCheckFailures";
import { withRetries, type IncomingMeasurement } from "../../../supabase/functions/_shared/ledger/saveRules";

export type SaveOutcome =
  | { ok: true; attested: boolean; ids: Array<string | null> }
  | { ok: false; reason: string };

async function appBuild(): Promise<string | null> {
  if (!isNativeIos()) return null;
  try { const i = await App.getInfo(); return `${i.version} (${i.build})`; } catch { return null; }
}

export async function saveMeasurements(measurements: IncomingMeasurement[], deps = { invoke: (body: unknown) => supabase.functions.invoke("ledger-save", { body }) }): Promise<SaveOutcome> {
  if (!measurements.length) return { ok: true, attested: false, ids: [] };
  const platform = isNativeIos() ? "ios" : "web";
  const build = await appBuild();
  const attest = await attestMeasurements(JSON.stringify(measurements), build);
  const body = { platform, app_build: build, measurements, attest };
  const r = await withRetries(async () => {
    const { data, error } = await deps.invoke(body);
    if (error) {
      // A rule refusal (consent, attest, fps, physics) is an answer, not a network failure: don't retry it.
      const ctx = (error as { context?: { status?: number } }).context;
      if (ctx?.status && ctx.status >= 400 && ctx.status < 500) return { refused: true as const, data, error };
      throw error;
    }
    return { refused: false as const, data, error: null };
  }, [400, 1200]);
  if (!r.ok) {
    await logPlanCheckFailure("measurement_save", r.error);
    return { ok: false, reason: "save_failed" };
  }
  if (r.value.refused) {
    let reason = "refused";
    try { reason = (await (r.value.error as { context?: Response }).context?.json?.())?.error ?? reason; } catch { /* keep generic */ }
    return { ok: false, reason };
  }
  const data = r.value.data as { attested?: boolean; results?: Array<{ id: string | null }> } | null;
  return { ok: true, attested: !!data?.attested, ids: (data?.results ?? []).map((x) => x.id) };
}
