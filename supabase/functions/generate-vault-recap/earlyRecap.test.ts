// Owner-approved Nov 6 (docs/owner/early-recap-generator-patch.md): the shared recap generator makes
// Early 6-Week Recaps (day 1 → purchase date, recap_kind 'early', countdown untouched, one per block)
// and a REGULAR day-42 recap is saved exactly as before. Runs the real handler against a stand-in backend.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const FAKE = "http://fake-backend.local";
const USER = { id: "11111111-1111-4111-8111-111111111111", email: "t@example.com", aud: "authenticated", role: "authenticated" };

type Call = { method: string; path: string; params: URLSearchParams; body: any; accept: string };
const calls: Call[] = [];
let existingRecapFor: ((p: URLSearchParams) => boolean) | null = null;

Deno.env.set("SUPABASE_URL", FAKE);
Deno.env.set("SUPABASE_ANON_KEY", "anon");
Deno.env.delete("OPENAI_API_KEY");

const realFetch = globalThis.fetch;
globalThis.fetch = async (input: Request | URL | string, init?: RequestInit) => {
  const req = input instanceof Request ? input : new Request(input, init);
  const url = new URL(req.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return realFetch(input as any, init);
  if (url.origin !== FAKE) return new Response("offline in tests", { status: 503 }); // AI etc. → generator's fallback
  const text = req.method === "GET" || req.method === "HEAD" ? "" : await req.text();
  const accept = req.headers.get("accept") ?? "";
  const call: Call = { method: req.method, path: url.pathname, params: url.searchParams, body: text ? JSON.parse(text) : null, accept };
  calls.push(call);
  const j = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
  if (url.pathname === "/auth/v1/user") return j(USER);
  if (url.pathname === "/rest/v1/vault_recaps" && req.method === "GET") {
    return j(existingRecapFor?.(url.searchParams) ? [{ id: "existing-recap", recap_period_start: "x", recap_period_end: "y" }] : []);
  }
  if (url.pathname === "/rest/v1/vault_recaps" && req.method === "POST") {
    return accept.includes("vnd.pgrst.object") ? j({ id: "new-recap-id" }, 201) : j([{ id: "new-recap-id" }], 201);
  }
  if (accept.includes("vnd.pgrst.object")) return j({ code: "PGRST116", message: "no rows" }, 406);
  if (req.method === "GET") return j([]);
  return j([], 201);
};

// Loading the function starts its server on the default port (8000).
await import("./index.ts");

async function generate(body: unknown) {
  calls.length = 0;
  const r = await realFetch("http://localhost:8000/", {
    method: "POST",
    headers: { Authorization: "Bearer test-token", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json() };
}
const recapInsert = () => calls.find((c) => c.method === "POST" && c.path === "/rest/v1/vault_recaps");
const dupCheck = () => calls.find((c) => c.method === "GET" && c.path === "/rest/v1/vault_recaps");
const dayMinus = (iso: string, days: number) => { const d = new Date(iso); d.setDate(d.getDate() - days); return d.toISOString().split("T")[0]; };
const opts = { sanitizeOps: false, sanitizeResources: false };

Deno.test("early recap covers day 1 to the purchase date and saves recap_kind 'early'", opts, async () => {
  existingRecapFor = null;
  const res = await generate({ kind: "early", periodStart: "2026-10-01", periodEnd: "2026-10-20" });
  assertEquals(res.status, 200);
  assertEquals(res.json.success, true);
  assertEquals(res.json.recap_id, "new-recap-id");
  assert(res.json.recap_data);
  const row = recapInsert()!.body;
  assertEquals(row.recap_period_start, "2026-10-01");
  assertEquals(row.recap_period_end, "2026-10-20");
  assertEquals(row.recap_kind, "early");
});

Deno.test("early recap leaves the regular day-42 countdown alone (unlocked_progress_reports_at empty)", opts, async () => {
  existingRecapFor = null;
  await generate({ kind: "early", periodStart: "2026-10-01", periodEnd: "2026-10-20" });
  assertEquals(recapInsert()!.body.unlocked_progress_reports_at, null);
});

Deno.test("an early recap can't be made twice for the same block", opts, async () => {
  existingRecapFor = (p) => p.get("recap_kind") === "eq.early" && p.getAll("recap_period_start").includes("eq.2026-10-01");
  const res = await generate({ kind: "early", periodStart: "2026-10-01", periodEnd: "2026-10-20" });
  assertEquals(res.status, 409);
  assertEquals(res.json.existing_recap_id, "existing-recap");
  assertEquals(recapInsert(), undefined);
  const p = dupCheck()!.params;
  assertEquals(p.get("recap_kind"), "eq.early");
  assert(p.getAll("recap_period_start").includes("eq.2026-10-01"));
});

Deno.test("a regular early-recap row never blocks a regular day-42 recap (duplicate check is by kind)", opts, async () => {
  existingRecapFor = (p) => p.get("recap_kind") === "eq.early";
  const res = await generate({ periodEnd: "2026-11-12" });
  assertEquals(res.status, 200);
  assertEquals(dupCheck()!.params.get("recap_kind"), "eq.regular");
});

Deno.test("REGULAR day-42 recap generates exactly as before", opts, async () => {
  existingRecapFor = null;
  const res = await generate({ periodEnd: "2026-11-12" });
  assertEquals(res.status, 200);
  assertEquals(res.json.success, true);
  assert(res.json.recap_data);
  const row = recapInsert()!.body;
  assertEquals(row.recap_period_end, "2026-11-12");
  assertEquals(row.recap_period_start, dayMinus("2026-11-12", 42));
  assertEquals(row.recap_kind, "regular");
  assert(typeof row.unlocked_progress_reports_at === "string" && !Number.isNaN(Date.parse(row.unlocked_progress_reports_at)));
  // Same duplicate window as before: start ≥ end−42, end ≤ end; no exact-start condition.
  const p = dupCheck()!.params;
  assertEquals(p.getAll("recap_period_start"), [`gte.${dayMinus("2026-11-12", 42)}`]);
  assertEquals(p.get("recap_period_end"), "lte.2026-11-12");
  // A periodStart without kind 'early' is ignored (regular stays 42 days).
  const again = await generate({ periodEnd: "2026-11-12", periodStart: "2026-11-01" });
  assertEquals(again.status, 200);
  assertEquals(recapInsert()!.body.recap_period_start, dayMinus("2026-11-12", 42));
});

Deno.test("a regular day-42 duplicate is still refused", opts, async () => {
  existingRecapFor = (p) => p.get("recap_kind") === "eq.regular";
  const res = await generate({ periodEnd: "2026-11-12" });
  assertEquals(res.status, 409);
  assertEquals(recapInsert(), undefined);
});
