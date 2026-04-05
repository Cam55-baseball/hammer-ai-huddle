/**
 * Shared Field Geometry Engine
 * Single source of truth for all baseball/softball field math.
 * All coordinates computed from home plate origin using real proportional ratios.
 */

export interface Point {
  x: number;
  y: number;
}

export interface FieldGeometry {
  // Canvas
  size: number;
  // Key positions (pixel coords)
  home: Point;
  first: Point;
  second: Point;
  third: Point;
  mound: Point;
  // Distances (pixels)
  baseDist: number;
  moundDist: number;
  outfieldRadius: number;
  warningTrackWidth: number;
  // Foul line endpoints
  foulLeft: Point;
  foulRight: Point;
  // Infield dirt geometry
  dirtRadius: number;
  // Fielder default positions (pixel coords)
  positions: Record<string, Point>;
  // Fielder default positions (normalized 0-1)
  positionsNormalized: Record<string, Point>;
}

// Real-world dimensions (feet)
const FIELD_CONFIG = {
  baseball: {
    baseDist: 90,
    moundDist: 60.5,
    outfieldDist: 330, // avg fence distance
    infieldDirtRadius: 95, // radius of infield dirt arc
  },
  softball: {
    baseDist: 60,
    moundDist: 43,
    outfieldDist: 220,
    infieldDirtRadius: 65,
  },
};

function rotatePoint(origin: Point, pt: Point, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = pt.x - origin.x;
  const dy = pt.y - origin.y;
  return {
    x: origin.x + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: origin.y + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function getFieldGeometry(sport: 'baseball' | 'softball', size: number = 500): FieldGeometry {
  const config = FIELD_CONFIG[sport];

  // Scale: map real feet to pixels
  // Home plate at bottom-center, outfield fills ~75% of canvas height
  const scale = (size * 0.65) / config.outfieldDist;

  const homeX = size / 2;
  const homeY = size * 0.88;
  const home: Point = { x: homeX, y: homeY };

  const basePx = config.baseDist * scale;
  const moundPx = config.moundDist * scale;
  const outfieldPx = config.outfieldDist * scale;
  const dirtPx = config.infieldDirtRadius * scale;

  // Diamond is rotated 45° — bases along diagonals
  const diag = basePx * Math.SQRT1_2;

  const first: Point = { x: homeX + diag, y: homeY - diag };
  const second: Point = { x: homeX, y: homeY - basePx * Math.SQRT2 };
  const third: Point = { x: homeX - diag, y: homeY - diag };

  // Mound position — along the line from home to second base
  const mound: Point = { x: homeX, y: homeY - moundPx * Math.SQRT2 / Math.SQRT2 };
  // Actually mound is on the home→2B line at moundDist from home
  const moundActual: Point = { x: homeX, y: homeY - moundPx };

  // Foul lines extend from home at 45° angles
  const foulLen = outfieldPx * 1.05;
  const foulLeft: Point = {
    x: homeX - foulLen * Math.SQRT1_2,
    y: homeY - foulLen * Math.SQRT1_2,
  };
  const foulRight: Point = {
    x: homeX + foulLen * Math.SQRT1_2,
    y: homeY - foulLen * Math.SQRT1_2,
  };

  const warningTrackWidth = outfieldPx * 0.06;

  // Fielder positions — computed from field geometry
  const diamondCenter = lerp(home, second, 0.5);

  const positions: Record<string, Point> = {
    'P': moundActual,
    'C': { x: homeX, y: homeY + basePx * 0.15 },
    '1B': lerp(first, diamondCenter, -0.25), // slightly past first toward foul line
    '2B': lerp(second, first, 0.35), // between 2nd and 1st, shifted toward home
    'SS': lerp(second, third, 0.35), // between 2nd and 3rd, shifted toward home
    '3B': lerp(third, diamondCenter, -0.25),
    'LF': {
      x: homeX - outfieldPx * 0.45 * Math.SQRT1_2,
      y: homeY - outfieldPx * 0.45 * Math.SQRT1_2 - outfieldPx * 0.12,
    },
    'CF': {
      x: homeX,
      y: homeY - outfieldPx * 0.6,
    },
    'RF': {
      x: homeX + outfieldPx * 0.45 * Math.SQRT1_2,
      y: homeY - outfieldPx * 0.45 * Math.SQRT1_2 - outfieldPx * 0.12,
    },
  };

  // Shift infielders slightly toward home for realism
  for (const pos of ['2B', 'SS']) {
    positions[pos] = lerp(positions[pos], home, 0.08);
  }

  // Normalize all positions to 0-1
  const positionsNormalized: Record<string, Point> = {};
  for (const [key, pt] of Object.entries(positions)) {
    positionsNormalized[key] = { x: pt.x / size, y: pt.y / size };
  }

  return {
    size,
    home,
    first,
    second,
    third,
    mound: moundActual,
    baseDist: basePx,
    moundDist: moundPx,
    outfieldRadius: outfieldPx,
    warningTrackWidth,
    foulLeft,
    foulRight,
    dirtRadius: dirtPx,
    positions,
    positionsNormalized,
  };
}

/**
 * Deterministic jitter based on index — no Math.random() needed.
 */
export function deterministicJitter(index: number, seed: number = 0): { dx: number; dy: number } {
  const hash = ((index * 2654435761 + seed) >>> 0) % 1000;
  const angle = (hash / 1000) * Math.PI * 2;
  const dist = ((hash * 7 + 13) % 100) / 100 * 4;
  return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist };
}
