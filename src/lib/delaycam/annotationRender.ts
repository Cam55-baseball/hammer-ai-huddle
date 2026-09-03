/**
 * Shared drawing for DelayCam markup.
 *
 * The session review player and the burned-in export both draw the same
 * shapes, so the drawing lives here once. If they drifted apart, the exported
 * copy would not match what the athlete saw on screen — which is the whole
 * point of the export.
 *
 * Shapes are stored in normalised 0–1 coordinates, so the same list renders
 * correctly at review size, at full-screen size, and at the recording's own
 * natural pixel size.
 */

/** Normalised 0–1 coordinates, so shapes survive any resize. */
export type Pt = { x: number; y: number };

export type Shape =
  | { kind: "pen"; pts: Pt[]; color: string }
  | { kind: "line"; a: Pt; b: Pt; color: string }
  | { kind: "angle"; a: Pt; v: Pt; b: Pt; color: string };

/**
 * Angle between the two drawn lines, measured in display space so the read-out
 * matches what the user sees rather than what the normalised numbers say.
 */
export function angleDeg(a: Pt, v: Pt, b: Pt, aspect: number): number {
  const a1 = Math.atan2((a.y - v.y) / aspect, a.x - v.x);
  const a2 = Math.atan2((b.y - v.y) / aspect, b.x - v.x);
  let d = Math.abs((a1 - a2) * (180 / Math.PI));
  if (d > 180) d = 360 - d;
  return d;
}

/**
 * Draw a list of shapes onto a 2D context sized `w` x `h` in the context's own
 * units. `scale` thickens strokes and text for large surfaces (the export
 * canvas is the video's natural size, often much bigger than the on-screen
 * review), so the burned-in markup reads the same as it did on screen.
 */
export function drawShapes(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  w: number,
  h: number,
  scale = 1,
): void {
  if (w <= 0 || h <= 0) return;
  const X = (p: Pt) => p.x * w;
  const Y = (p: Pt) => p.y * h;
  const aspect = h / w || 1;

  for (const s of shapes) {
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = 3 * scale;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (s.kind === "pen") {
      ctx.beginPath();
      s.pts.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p), Y(p)) : ctx.lineTo(X(p), Y(p))));
      ctx.stroke();
    } else if (s.kind === "line") {
      ctx.beginPath();
      ctx.moveTo(X(s.a), Y(s.a));
      ctx.lineTo(X(s.b), Y(s.b));
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(X(s.a), Y(s.a));
      ctx.lineTo(X(s.v), Y(s.v));
      ctx.lineTo(X(s.b), Y(s.b));
      ctx.stroke();

      const deg = angleDeg(s.a, s.v, s.b, aspect);
      const fontPx = 15 * scale;
      ctx.font = `600 ${fontPx}px system-ui, sans-serif`;
      const label = `${Math.round(deg)}°`;
      const tx = X(s.v) + 10 * scale;
      const ty = Y(s.v) - 10 * scale;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(
        tx - 4 * scale,
        ty - 16 * scale,
        ctx.measureText(label).width + 8 * scale,
        20 * scale,
      );
      ctx.fillStyle = s.color;
      ctx.fillText(label, tx, ty);
    }
  }
}
