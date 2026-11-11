import { it, expect, vi } from "vitest";
vi.mock("https://deno.land/std@0.224.0/http/server.ts", () => ({ serve: vi.fn() }));
vi.mock("https://esm.sh/@supabase/supabase-js@2.49.1", () => ({ createClient: vi.fn() }));
it("loads", async () => {
  const m: any = await import("../../../supabase/functions/compute-hammer-state/index.ts");
  expect(m).toBeTruthy();
});
