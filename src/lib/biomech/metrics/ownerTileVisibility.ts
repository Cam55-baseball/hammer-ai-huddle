/**
 * Owner-confirmed evidence for tiles 19 (head_path_through_stride) and 20
 * (back_hip_socket_hold). Kept for provenance, not report-card visibility.
 *
 * Gate 4 passed on ONE owner-confirmed clip (2026-09-27,
 * clip 914cf54c, hitting Left: owner confirmed head drifted forward past COM
 * and back hip opened before P4). One confirmed clip is a strong signal, not
 * validation. A visible tile still refuses when its clip lacks a trustworthy reading.
 *
 * Add a row ONLY when the owner has watched the clip and confirmed the tile's
 * verdict. Never add unconfirmed clips.
 */
export type OwnerTileKey = "head_path_through_stride" | "back_hip_socket_hold";

export interface ConfirmedClip {
  readonly video_id: string;
  readonly batting_side: "L" | "R";
  readonly confirmed_on: string;
  readonly tiles: readonly OwnerTileKey[];
  readonly note: string;
}

export const OWNER_CONFIRMED_CLIPS: readonly ConfirmedClip[] = [
  {
    video_id: "914cf54c-23fd-402a-9e60-564a43bcc258",
    batting_side: "L",
    confirmed_on: "2026-09-27",
    tiles: ["head_path_through_stride", "back_hip_socket_hold"],
    note: "Owner watched back: head drifted forward past COM (tile 19 FAIL); back hip opened before P4 (tile 20 FAIL).",
  },
];

export function confirmedCount(tile: OwnerTileKey) {
  const rows = OWNER_CONFIRMED_CLIPS.filter((c) => c.tiles.includes(tile));
  return { total: rows.length, left: rows.filter((r) => r.batting_side === "L").length, right: rows.filter((r) => r.batting_side === "R").length };
}

