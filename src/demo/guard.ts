// Hard guard for demo shells. Throws (DEV) or warns (PROD) if a real DB write is attempted in demo mode.
export function assertNotDemo(isDemo: boolean, op: string): void {
  if (!isDemo) return;
  const msg = `[demo-guard] Blocked real write in demo mode: ${op}`;
  if (import.meta.env.DEV) throw new Error(msg);
  console.warn(msg);
}

/**
 * Wrap any supabase-like client to block writes when isDemo === true.
 * Reads pass through. Writes throw (or warn in prod) and return a typed no-op result.
 */
export function makeDemoSafeClient<T extends Record<string, any>>(client: T, isDemo: () => boolean): T {
  if (typeof Proxy === 'undefined') return client;
  const blockedFromMethods = new Set(['insert', 'update', 'upsert', 'delete']);
  const wrapFromQuery = (q: any) => new Proxy(q, {
    get(t, prop, recv) {
      const v = Reflect.get(t, prop, recv);
      if (typeof prop === 'string' && blockedFromMethods.has(prop) && typeof v === 'function') {
        return (...args: unknown[]) => {
          if (isDemo()) {
            assertNotDemo(true, `supabase.from().${prop}`);
            return Promise.resolve({ data: null, error: { message: 'demo:blocked', name: 'DemoBlocked' } });
          }
          return v.apply(t, args);
        };
      }
      return typeof v === 'function' ? v.bind(t) : v;
    },
  });

  return new Proxy(client, {
    get(t, prop, recv) {
      const v = Reflect.get(t, prop, recv);
      if (prop === 'from' && typeof v === 'function') {
        return (...args: unknown[]) => wrapFromQuery(v.apply(t, args));
      }
      if (prop === 'rpc' && typeof v === 'function') {
        return (...args: unknown[]) => {
          if (isDemo()) {
            assertNotDemo(true, `supabase.rpc(${String(args[0])})`);
            return Promise.resolve({ data: null, error: { message: 'demo:blocked', name: 'DemoBlocked' } });
          }
          return v.apply(t, args);
        };
      }
      return typeof v === 'function' ? v.bind(t) : v;
    },
  }) as T;
}
