// Hard guard for demo shells. Throws (DEV) or warns (PROD) if a real DB write is attempted in demo mode.
export function assertNotDemo(isDemo: boolean, op: string): void {
  if (!isDemo) return;
  const msg = `[demo-guard] Blocked real write in demo mode: ${op}`;
  if (import.meta.env.DEV) throw new Error(msg);
  console.warn(msg);
}

/**
 * Allowlist of tables that demo subtrees may read from. Anything else returns
 * an empty result so accidental real-PII reads cannot leak through demo UI.
 */
export const DEMO_SAFE_TABLES: ReadonlySet<string> = new Set([
  'demo_registry',
  'demo_progress',
  'demo_events',
  'demo_video_prescriptions',
]);

const BLOCKED_FROM_METHODS = new Set(['insert', 'update', 'upsert', 'delete']);

/**
 * Strict mode flag. When `VITE_DEMO_STRICT=1` AND running in DEV, blocked reads
 * THROW instead of silently returning empty. Production builds always silent-empty.
 */
const STRICT_DEMO = import.meta.env.VITE_DEMO_STRICT === '1';

/**
 * Non-blocking telemetry emitter. Listeners (useDemoTelemetry) persist to demo_events.
 * Exported so any UI surface (CTA buttons, upgrade flow, etc.) can emit funnel events.
 */
export function logDemoEvent(type: string, payload: Record<string, unknown> = {}): void {
  try {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel('demo-events');
    ch.postMessage({ type, payload, ts: Date.now() });
    ch.close();
  } catch {
    /* swallow */
  }
  if (import.meta.env.DEV) {
    console.warn(`[demo-guard] ${type}`, payload);
  }
}

function emptyResult() {
  return Promise.resolve({ data: null, error: { message: 'demo:blocked', name: 'DemoBlocked' } });
}

/**
 * Wrap any supabase-like client. In demo mode:
 *   - writes to ANY table are blocked
 *   - reads to non-allowlisted tables are blocked
 *   - rpc() is blocked
 * Reads to allowlisted tables pass through unchanged.
 */
export function makeDemoSafeClient<T extends Record<string, any>>(client: T, isDemo: () => boolean): T {
  if (typeof Proxy === 'undefined') return client;

  const wrapBlockedQuery = (table: string) => {
    // A thenable that always resolves to empty + an arbitrary chainable surface.
    const handler: ProxyHandler<any> = {
      get(_t, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null, count: 0 });
        }
        return () => new Proxy(function () {}, handler);
      },
      apply() { return new Proxy(function () {}, handler); },
    };
    logDemoEvent('sim_read_blocked', { table });
    if (STRICT_DEMO && import.meta.env.DEV) {
      throw new Error(`[demo-guard] STRICT: blocked read on non-safe table: ${table}`);
    }
    return new Proxy(function () {}, handler);
  };

  const wrapAllowedQuery = (q: any) => new Proxy(q, {
    get(t, prop, recv) {
      const v = Reflect.get(t, prop, recv);
      if (typeof prop === 'string' && BLOCKED_FROM_METHODS.has(prop) && typeof v === 'function') {
        return (...args: unknown[]) => {
          if (isDemo()) {
            logDemoEvent('sim_write_blocked', { method: String(prop) });
            assertNotDemo(true, `supabase.from().${prop}`);
            return emptyResult();
          }
          return v.apply(t, args);
        };
      }
      return typeof v === 'function' ? v.bind(t) : v;
    },
  });

  return new Proxy(client, {
    get(t, prop, recv) {
      const v: any = Reflect.get(t, prop, recv);
      if (prop === 'from' && typeof v === 'function') {
        return (table: string, ...rest: unknown[]) => {
          if (isDemo() && !DEMO_SAFE_TABLES.has(table)) {
            return wrapBlockedQuery(table);
          }
          return wrapAllowedQuery(v.apply(t, [table, ...rest]));
        };
      }
      if (prop === 'rpc' && typeof v === 'function') {
        return (...args: unknown[]) => {
          if (isDemo()) {
            logDemoEvent('sim_rpc_blocked', { fn: String(args[0]) });
            assertNotDemo(true, `supabase.rpc(${String(args[0])})`);
            return emptyResult();
          }
          return v.apply(t, args);
        };
      }
      return typeof v === 'function' ? v.bind(t) : v;
    },
  }) as T;
}
