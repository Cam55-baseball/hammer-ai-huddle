/**
 * Wave 2 — Boot validation.
 *
 * Verifies runtime invariants at app boot. On failure, runtime surfaces
 * are blocked and the operator is routed to /ops/deployment.
 */
import { ENGINE_VERSION } from "@/lib/asb/engineVersion";

export interface BootValidationResult {
  ok: boolean;
  engineVersion: string;
  checks: Array<{ name: string; pass: boolean; detail?: string }>;
}

export function runBootValidation(): BootValidationResult {
  const checks: BootValidationResult["checks"] = [];

  checks.push({
    name: "engine_version_present",
    pass: typeof ENGINE_VERSION === "string" && ENGINE_VERSION.length > 0,
  });

  checks.push({
    name: "crypto_random_uuid",
    pass:
      typeof crypto !== "undefined" &&
      typeof (crypto as { randomUUID?: unknown }).randomUUID === "function",
  });

  checks.push({
    name: "indexeddb_available",
    pass: typeof indexedDB !== "undefined",
  });

  const ok = checks.every((c) => c.pass);
  return { ok, engineVersion: ENGINE_VERSION, checks };
}
