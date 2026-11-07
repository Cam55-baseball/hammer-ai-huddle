// Owner-approved Nov 6: with the generator ready, a paid early recap is made for its block (day 1 → purchase
// date) by the shared generator as kind 'early'; a failure keeps the entitlement for the next visit.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { EARLY_RECAP_GENERATOR_READY, deliverEarlyRecap, generatorAs } from "./server.ts";

function fakeDb() {
  const updates: any[] = [];
  const inserts: any[] = [];
  const db: any = {
    from: (table: string) => ({
      update: (row: any) => ({ eq: (_c: string, id: string) => { updates.push({ table, id, row }); return Promise.resolve({ error: null }); } }),
      insert: (rows: any) => { inserts.push({ table, rows }); return Promise.resolve({ error: null }); },
    }),
  };
  return { db, updates, inserts };
}
const purchase = { id: "p1", user_id: "u1", block_start: "2026-10-01", delivery_status: "awaiting_generator", delivery_attempts: 0, created_at: "2026-10-20T15:00:00Z" };

Deno.test("generator is switched on", () => assertEquals(EARLY_RECAP_GENERATOR_READY, true));

Deno.test("awaiting purchase is delivered: day 1 of the block to the purchase date", async () => {
  const { db, updates, inserts } = fakeDb();
  let asked: any = null;
  const res = await deliverEarlyRecap(db, purchase, async (a) => { asked = a; return { ok: true, recapId: "r1" }; });
  assertEquals(res.status, "delivered");
  assertEquals(asked, { periodStart: "2026-10-01", periodEnd: "2026-10-20" });
  assertEquals(updates[0].row.delivery_status, "delivered");
  assertEquals(updates[0].row.recap_id, "r1");
  assert(inserts.some((i) => i.table === "addon_notices"));
});

Deno.test("a failed generation keeps the entitlement (failed, retried next visit) and never charges", async () => {
  const { db, updates } = fakeDb();
  const res = await deliverEarlyRecap(db, purchase, async () => ({ ok: false, error: "[500] boom" }));
  assertEquals(res.status, "failed");
  assertEquals(updates[0].row.delivery_status, "failed");
  assertEquals(updates[0].row.delivery_attempts, 1);
});

Deno.test("already delivered is never made again", async () => {
  const { db, updates } = fakeDb();
  let called = false;
  const res = await deliverEarlyRecap(db, { ...purchase, delivery_status: "delivered" }, async () => { called = true; return { ok: true, recapId: "x" }; });
  assertEquals(res.status, "delivered");
  assertEquals(called, false);
  assertEquals(updates.length, 0);
});

Deno.test("the player's own session asks the shared generator for kind 'early' and reads recap_id", async () => {
  Deno.env.set("SUPABASE_URL", "http://fake-backend.local");
  Deno.env.set("SUPABASE_ANON_KEY", "anon");
  const real = globalThis.fetch;
  let sent: any = null;
  globalThis.fetch = async (input: any, init?: RequestInit) => {
    sent = { url: String(input), auth: (init?.headers as any)?.Authorization, body: JSON.parse(String(init?.body)) };
    return new Response(JSON.stringify({ success: true, recap_id: "r9", recap_data: {} }), { status: 200 });
  };
  try {
    const res = await generatorAs("Bearer player")({ periodStart: "2026-10-01", periodEnd: "2026-10-20" });
    assertEquals(res, { ok: true, recapId: "r9" });
    assertEquals(sent.url, "http://fake-backend.local/functions/v1/generate-vault-recap");
    assertEquals(sent.auth, "Bearer player");
    assertEquals(sent.body, { periodStart: "2026-10-01", periodEnd: "2026-10-20", kind: "early" });
  } finally {
    globalThis.fetch = real;
  }
});
