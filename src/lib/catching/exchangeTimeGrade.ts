/**
 * Catcher exchange-time grade — `scale_reference` anchored.
 *
 * Exchange (transfer) time is glove contact → ball release. It is anchored on
 * the `exchange_time_sec` row (sport = baseball, direction = lower_better):
 *
 *   floor  0.85s → grade 20
 *   avg    0.70s → grade 50
 *   record 0.50s → grade 80
 *
 * Provenance for the 80 anchor: documented elite pop-time breakdowns —
 * J.T. Realmuto's 1.80s pop time included a 0.54s transfer, and other current
 * elite catchers track 0.54-0.56s. 0.50s is the practical ceiling, not an
 * invented number.
 *
 * Interpolation is NOT reimplemented here — it routes through the single
 * shared implementation, `gradeFromScaleRow`.
 */

import {
  gradeFromScaleRow,
  type BeatenRunnerResult,
  type ScaleReferenceRow,
} from "@/lib/defense/beatenRunnerGrade";

export const EXCHANGE_TIME_METRIC = "exchange_time_sec";

export function computeExchangeTimeGrade(
  exchangeSec: number | null | undefined,
  scaleRows: readonly ScaleReferenceRow[],
): BeatenRunnerResult {
  return gradeFromScaleRow(
    exchangeSec,
    EXCHANGE_TIME_METRIC,
    scaleRows,
    "no_play_time",
  );
}
