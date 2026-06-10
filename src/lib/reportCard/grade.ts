import type { ReportCardTileSpec, TileState } from "./types";

export type LetterGrade = "A" | "B" | "C" | "D" | "F";

export interface GradeResult {
  letter: LetterGrade;
  /** 0..100 numeric score behind the letter. */
  score: number;
  measured: number;
  total: number;
  nonNegotiableFailed: number;
}

/**
 * Letter grade from tile pass/fail with non-negotiable caps and a
 * missingness penalty. Replay-stable: identical tiles → identical letter.
 *
 *  - Each measured tile contributes pass=100 / warn=70 / fail=0.
 *  - Score = average of contributions across MEASURED tiles.
 *  - Any non-negotiable failure caps the score at 60 (D).
 *  - Two or more non-negotiable failures cap at 40 (F).
 *  - Missing tiles do not pull the average down but appear in the
 *    "X of Y measured" chip so the user sees the gap.
 */
export function gradeFromTiles(
  tiles: { spec: ReportCardTileSpec; state: TileState }[],
): GradeResult {
  const total = tiles.length;
  const measured = tiles.filter((t) => t.state.status !== "missing");
  const nnFailed = tiles.filter(
    (t) => t.spec.nonNegotiable && t.state.status === "fail",
  ).length;

  let score = 0;
  if (measured.length > 0) {
    const sum = measured.reduce((acc, t) => {
      if (t.state.status === "pass") return acc + 100;
      if (t.state.status === "warn") return acc + 70;
      return acc; // fail = 0
    }, 0);
    score = Math.round(sum / measured.length);
  }

  if (nnFailed >= 2) score = Math.min(score, 40);
  else if (nnFailed === 1) score = Math.min(score, 60);

  const letter: LetterGrade =
    score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

  return { letter, score, measured: measured.length, total, nonNegotiableFailed: nnFailed };
}
