// Guard that throws (in dev) or warns (in prod) if a demo shell tries to make a real DB write.
export function assertNotDemo(isDemo: boolean, op: string): void {
  if (!isDemo) return;
  const msg = `[demo-guard] Blocked real write in demo mode: ${op}`;
  if (import.meta.env.DEV) {
    throw new Error(msg);
  } else {
    console.warn(msg);
  }
}
