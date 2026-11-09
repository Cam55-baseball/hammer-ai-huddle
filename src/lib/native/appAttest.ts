/**
 * Release 0 (app_attest_v1): proves a measurement save came from the real Hammers iPhone app.
 * iPhone-only; on the web (or with the switch off) nothing here runs and saves stay unattested.
 * The key id is kept on the device (Preferences); the key itself never leaves the Secure Enclave.
 */
import { registerPlugin } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { supabase } from "@/integrations/supabase/client";
import { isNativeIos, nativeFlagOn } from "./nativeFlags";
import { assertionClientData } from "../../../supabase/functions/_shared/appAttest/verify";

interface AppAttestPlugin {
  isSupported(): Promise<{ supported: boolean }>;
  generateKey(): Promise<{ keyId: string }>;
  attestKey(o: { keyId: string; challenge: string }): Promise<{ attestation: string }>;
  generateAssertion(o: { keyId: string; clientData: string }): Promise<{ assertion: string }>;
}
const AppAttest = registerPlugin<AppAttestPlugin>("AppAttest");
const KEY = "hammers.appAttest.keyId";

export interface AttestProof { key_id: string; assertion: string; timestamp_ms: number }

async function ensureKey(appBuild: string | null): Promise<string | null> {
  const saved = (await Preferences.get({ key: KEY })).value;
  if (saved) return saved;
  if (!(await AppAttest.isSupported()).supported) return null;
  const { keyId } = await AppAttest.generateKey();
  const { data: ch, error } = await supabase.functions.invoke("app-attest", { body: { action: "challenge" } });
  if (error || !ch?.challenge) return null;
  const { attestation } = await AppAttest.attestKey({ keyId, challenge: ch.challenge });
  const { error: aErr } = await supabase.functions.invoke("app-attest", { body: { action: "attest", key_id: keyId, attestation, challenge: ch.challenge, app_build: appBuild ?? undefined } });
  if (aErr) return null;
  await Preferences.set({ key: KEY, value: keyId });
  return keyId;
}

/** A per-request proof over the exact measurements being saved, or null (web, switch off, unsupported, failure). */
export async function attestMeasurements(measurementsJson: string, appBuild: string | null): Promise<AttestProof | null> {
  if (!isNativeIos() || !nativeFlagOn("app_attest_v1")) return null;
  try {
    const keyId = await ensureKey(appBuild);
    if (!keyId) return null;
    const timestamp_ms = Date.now();
    const clientData = await assertionClientData(measurementsJson, timestamp_ms);
    const { assertion } = await AppAttest.generateAssertion({ keyId, clientData });
    return { key_id: keyId, assertion, timestamp_ms };
  } catch {
    // A key Apple no longer accepts (reinstall, restore) is replaced on the next save.
    await Preferences.remove({ key: KEY }).catch(() => undefined);
    return null;
  }
}
