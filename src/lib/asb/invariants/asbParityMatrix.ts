/**
 * Parity matrix — composes per-subsystem validators into a deterministic
 * cross-system check for a single canonical ASB event.
 *
 * Pure. No I/O. CI/debug only.
 */
import {
  validateDigestParity,
  validateCoachParity,
  validateForecastParity,
  validateSensorForwardCompatibility,
  type AsbEventLike,
  type ProjectionLike,
  type SensorEventLike,
  type ParityResult,
} from "./asbCrossSystemValidators";

export type { ParityResult } from "./asbCrossSystemValidators";

export interface ParityInputs {
  asb: AsbEventLike;
  digest?: ProjectionLike;
  coach?: ProjectionLike;
  forecast?: ProjectionLike;
  sensor?: SensorEventLike;
}

export async function buildParityMatrix(inputs: ParityInputs): Promise<ParityResult[]> {
  const out: ParityResult[] = [];
  if (inputs.digest) out.push(validateDigestParity(inputs.asb, inputs.digest));
  if (inputs.coach) out.push(validateCoachParity(inputs.asb, inputs.coach));
  if (inputs.forecast) out.push(validateForecastParity(inputs.asb, inputs.forecast));
  if (inputs.sensor) out.push(await validateSensorForwardCompatibility(inputs.sensor));
  return out;
}
