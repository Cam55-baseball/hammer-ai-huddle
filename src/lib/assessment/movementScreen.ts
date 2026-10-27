/** Observations only: no normative angles, diagnosis or inferred painless results. */
export type MovementStatus = "controlled" | "limited" | "pain";
export type MovementObservation = { left?: string; right?: string; leftStatus?: MovementStatus; rightStatus?: MovementStatus };
export type MovementScreen = Record<string, unknown> & { observations?: Record<string, MovementObservation>; history?: Record<string, string>; version?: number };
export const movementGroups = [
  { name: "Joint range", items: [
    { key: "shoulder_ir", name: "Shoulder inward rotation", unit: "degrees", how: "With a helper, lie on your back with your upper arm supported at shoulder height and elbow bent. Rotate the forearm toward your feet without lifting the shoulder. Only enter an angle measured by a trained helper.", legacy: "shoulder" },
    { key: "shoulder_er", name: "Shoulder outward rotation", unit: "degrees", how: "In the same supported position, rotate the forearm toward your head. Stop before the shoulder lifts or you feel pain. A trained helper measures the angle.", legacy: "shoulder" },
    { key: "hip_ir", name: "Hip inward rotation", unit: "degrees", how: "Sit tall with knees bent at 90°. Keep your thigh still and move your foot outward. A helper measures the rotation; do not force the range.", legacy: "hip" },
    { key: "hip_er", name: "Hip outward rotation", unit: "degrees", how: "In the same seated position, keep your thigh still and move your foot inward. Keep your hips level; a helper measures the rotation.", legacy: "hip" },
    { key: "thoracic", name: "Upper-back rotation", unit: "degrees", how: "Sit tall, knees together and arms crossed. Turn your chest each way without moving your hips. Enter a measured angle only.", legacy: undefined },
    { key: "ankle_wall", name: "Ankle knee-to-wall reach", unit: "cm", how: "Face a wall, heel flat. Touch your knee to the wall over your toes. Move the foot back until you reach the furthest comfortable heel-down position. Measure big toe to wall.", legacy: "ankle" },
  ] },
  { name: "Stability & control", items: [
    { key: "single_squat", name: "Single-leg squat control", unit: "controlled reps / 5", how: "Stand beside a support. Make five shallow single-leg squats each side. Count only reps with a level pelvis, steady knee and no loss of balance.", legacy: "balance" },
    { key: "reach", name: "Three-direction balance reach", unit: "cm (front / back-in / back-out)", how: "Stand on one leg beside a support. Reach the other foot lightly forward, back-in and back-out without shifting the standing foot. Record each reach separately, separated by slashes.", legacy: "balance" },
    { key: "trunk", name: "Trunk control", unit: "controlled reps / 5", how: "From hands and knees, slowly reach one arm and the opposite leg five times. Compare the two arm-leg pairs. Count reps without trunk rotation or back arching.", legacy: undefined },
  ] },
  { name: "Movement patterns", items: [
    { key: "overhead_squat", name: "Overhead squat", unit: "controlled reps / 5", how: "Without weight, raise both arms and make five comfortable squats. Compare each side for heel lift, knee drift or trunk shift. Never force depth.", legacy: undefined },
    { key: "split_squat", name: "Split squat / lunge", unit: "controlled reps / 5", how: "Use a split stance beside a support. Lower slowly five times each side. Count stable reps with the knee tracking over the foot and no trunk shift.", legacy: undefined },
    { key: "step_over", name: "Step-over control", unit: "controlled reps / 5", how: "Step over a low marker five times each side, then return. Count reps with a steady pelvis, upright trunk and no loss of balance. Use a safe low height.", legacy: undefined },
  ] },
  { name: "Rotation & strength", items: [
    { key: "separation", name: "Hip and trunk turn control", unit: "measured degrees (optional)", how: "Stand with soft knees and arms crossed. Keep the chest facing forward while gently turning the hips, then reverse. Compare directions. Record only measured angles; there is no ideal angle for everyone.", legacy: undefined },
    { key: "calf", name: "Single-leg calf raise", unit: "controlled reps / 10", how: "Hold a support lightly. Make up to ten slow heel raises per leg at the same pace. Count full comfortable rises without bouncing; stop at pain.", legacy: undefined },
    { key: "side_hold", name: "Side-support hold", unit: "seconds", how: "From your knees and forearm, lift the hips into a straight line. Hold comfortably each side; stop when alignment is lost or pain appears. Record time, not a maximum-effort challenge.", legacy: undefined },
  ] },
] as const;

export function movementHasPain(screen: MovementScreen): boolean {
  return Object.values(screen).includes("pain") || Object.values(screen.observations ?? {}).some(o => o.leftStatus === "pain" || o.rightStatus === "pain") || screen.history?.current_pain === "yes";
}
export function setMovementObservation(screen: MovementScreen, key: string, observation: MovementObservation): MovementScreen {
  const next: MovementScreen = { ...screen, version: 2, observations: { ...screen.observations, [key]: observation } };
  // Retain the existing four-field contract for old safety readers, never default missing to easy.
  const item = movementGroups.flatMap(g => [...g.items]).find(i => i.key === key);
  if (item?.legacy) {
    const related = movementGroups.flatMap(g => [...g.items]).filter(i => i.legacy === item.legacy);
    const statuses = related.flatMap(i => [next.observations?.[i.key]?.leftStatus, next.observations?.[i.key]?.rightStatus]).filter(Boolean);
    if (statuses.length) next[item.legacy] = statuses.includes("pain") ? "pain" : statuses.includes("limited") ? "hard" : "easy";
  }
  return next;
}
export function movementScreenComplete(screen: MovementScreen): boolean {
  return movementGroups.every(g => g.items.every(i => screen.observations?.[i.key]?.leftStatus && screen.observations?.[i.key]?.rightStatus));
}
export function measuredTotalArc(ir?: string, er?: string): number | null {
  if (!ir?.trim() || !er?.trim()) return null;
  const values = [Number(ir), Number(er)];
  return values.every(v => Number.isFinite(v) && v >= 0) ? values[0] + values[1] : null;
}
export function movementScore(status?: MovementStatus): number | null {
  return status === "pain" ? 0 : status === "limited" ? 1 : status === "controlled" ? 2 : null;
}