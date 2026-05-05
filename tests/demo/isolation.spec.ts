import { test, expect } from '@playwright/test';

/**
 * E2E proof that the demo client firewall is enforced at runtime.
 * Requires DEV build (DemoLayout exposes `window.supabase` only when import.meta.env.DEV).
 */
test.describe('Demo Isolation', () => {
  test('blocks reads to non-demo-safe tables', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForFunction(() => !!(window as any).supabase, null, { timeout: 10_000 });

    const result = await page.evaluate(async () => {
      const { supabase } = window as any;
      return await supabase.from('profiles').select('*');
    });

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  test('allows reads to demo-safe tables', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForFunction(() => !!(window as any).supabase, null, { timeout: 10_000 });

    const result = await page.evaluate(async () => {
      const { supabase } = window as any;
      return await supabase.from('demo_registry').select('*');
    });

    expect(result.error).toBeNull();
    expect(Array.isArray(result.data)).toBeTruthy();
  });

  test('blocks rpc calls in demo mode', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForFunction(() => !!(window as any).supabase, null, { timeout: 10_000 });

    const result = await page.evaluate(async () => {
      const { supabase } = window as any;
      return await supabase.rpc('some_sensitive_fn');
    });

    expect(result.data).toBeNull();
  });
});
