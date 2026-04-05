export type EliteInput = {
  overall: number | null;
  tools: {
    hit: number | null;
    power: number | null;
    run: number | null;
    field: number | null;
    arm: number | null;
  };
};

export function computeEliteScore(input: EliteInput): number | null {
  const { overall, tools } = input;
  if (overall === null) return null;
  if (overall < 40) return overall;

  const toolValues = Object.values(tools).filter((t): t is number => t !== null);
  if (toolValues.length === 0) return overall;

  const topTool = Math.max(...toolValues);

  const ceilingBoost =
    topTool >= 75 ? (topTool - 70) * 0.6 :
    topTool >= 70 ? (topTool - 68) * 0.4 :
    0;

  const plusTools = toolValues.filter(t => t >= 65).length;

  const synergyBoost =
    plusTools >= 4 ? 4 :
    plusTools === 3 ? 2 :
    0;

  const variance =
    toolValues.reduce((acc, t) => acc + Math.pow(t - overall, 2), 0) / toolValues.length;

  const stdDev = Math.sqrt(variance);

  const rarityBoost =
    stdDev >= 8 ? 3 :
    stdDev >= 6 ? 1.5 :
    0;

  let eliteScore =
    overall +
    ceilingBoost +
    synergyBoost +
    rarityBoost;

  eliteScore = Math.min(80, eliteScore);

  return Math.round(eliteScore);
}
