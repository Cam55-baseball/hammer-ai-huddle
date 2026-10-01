/**
 * Tile copy for the pitching, throwing and windmill measured clip cards,
 * adapted ONLY from copy already sourced in the repo:
 *  - baseball pitching: pitchingCopy.ts (owner's pitching standards, restated)
 *  - throwing: throwingCopy.ts (owner doctrine + cited arm-care research)
 *  - softball windmill: softballPitchingCopy.ts (docs/SOFTBALL-PITCHING-DOCTRINE.md,
 *    every standard carries its SOURCED / PROPOSED label)
 * A tile with no sourced line keeps an empty field — listed for the owner.
 */
import { PITCHING_COPY } from "./pitchingCopy";
import { SOFTBALL_PITCHING_COPY, SP_BASIS_LABEL } from "./softballPitchingCopy";
import { SP_STANDARDS } from "../biomech/metrics/softballPitchingTiles";
import { throwingFacingTile } from "./throwingCopy";
import type { ReportCardTileSpec } from "./types";

export type ClipCopy = { standard: string; whatWhy: string; howToImprove: string; encouragement: string };
const EMPTY: ClipCopy = { standard: "", whatWhy: "", howToImprove: "", encouragement: "" };

const SP_ALIAS: Record<string, string> = { stride_profile_sfc: "stride_profile", stride_profile_release: "stride_profile" };

export function otherClipCopy(card: string, sport: string | undefined, tileKey: string): ClipCopy {
  if (card === "pitching_baseball") {
    const c = (PITCHING_COPY as Record<string, { pass: string; fail: string }>)[tileKey];
    return c ? { standard: c.pass, whatWhy: "", howToImprove: c.fail, encouragement: "" } : EMPTY;
  }
  if (card === "pitching_softball_windmill") {
    const key = SP_ALIAS[tileKey] ?? tileKey;
    const c = (SOFTBALL_PITCHING_COPY as Record<string, { standard: string; coach: string }>)[key];
    if (!c) return EMPTY;
    const basis = (SP_STANDARDS as Record<string, { basis?: keyof typeof SP_BASIS_LABEL }>)[key]?.basis;
    return { standard: basis ? `${SP_BASIS_LABEL[basis]}. ${c.standard}` : c.standard, whatWhy: "", howToImprove: c.coach, encouragement: "" };
  }
  if (card === "throwing") {
    const probe = { key: tileKey, standard: "", explainer: { whatWhy: "", howToImprove: "", encouragement: "" }, compute: () => ({ status: "missing" }) } as unknown as ReportCardTileSpec;
    const t = throwingFacingTile(probe, sport === "softball" ? "softball" : "baseball");
    if (t === probe) return EMPTY;
    return { standard: t.standard ?? "", whatWhy: t.explainer.whatWhy, howToImprove: t.explainer.howToImprove, encouragement: "" };
  }
  return EMPTY;
}
