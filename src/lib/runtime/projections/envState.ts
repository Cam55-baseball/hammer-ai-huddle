import { memoize } from "./types";

export interface EnvState {
  heatIndex: number | null;
  airQuality: number | null;
  altitudeM: number | null;
  source: string | null;
}

const PREFIXES = ["env."];

export const buildEnvState = memoize<EnvState>((rows) => {
  let heatIndex: number | null = null;
  let airQuality: number | null = null;
  let altitudeM: number | null = null;
  let source: string | null = null;
  for (const r of rows) {
    const p = r.payload as { heat_index?: number; air_quality?: number; altitude_m?: number } | undefined;
    if (!p) continue;
    if (typeof p.heat_index === "number") heatIndex = p.heat_index;
    if (typeof p.air_quality === "number") airQuality = p.air_quality;
    if (typeof p.altitude_m === "number") altitudeM = p.altitude_m;
    source = r.event_id;
  }
  return { heatIndex, airQuality, altitudeM, source };
});

export function envState(rows: Parameters<typeof buildEnvState>[0], scope: Parameters<typeof buildEnvState>[1]) {
  return buildEnvState(rows, scope, PREFIXES);
}
