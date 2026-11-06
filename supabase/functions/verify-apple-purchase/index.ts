// Owner-approved Nov 6: verifies an Apple in-app purchase of the Early 6-Week Recap with Apple's
// App Store Server API before granting anything. Idempotent per Apple transaction id.
import { SignJWT, importPKCS8 } from "npm:jose@5.9.6";
import { z } from "npm:zod@3.23.8";
import { corsHeaders, json, admin, requireUser, purchaseStore, deliverEarlyRecap, generatorAs } from "../_shared/addons/server.ts";
import { checkBuy } from "../_shared/addons/buyCheck.ts";
import { decodeJwsPayload, validateAppleTransaction, recordPurchaseOnce, type AppleTransaction } from "../_shared/addons/apple.ts";
import { EARLY_RECAP } from "../_shared/addons/rules.ts";

const Body = z.object({ transactionId: z.string().min(1).max(64), athleteId: z.string().uuid().optional() });

async function appleToken() {
  const issuer = Deno.env.get("APPLE_IAP_ISSUER_ID"), keyId = Deno.env.get("APPLE_IAP_KEY_ID");
  const pem = Deno.env.get("APPLE_IAP_PRIVATE_KEY"), bid = Deno.env.get("APPLE_BUNDLE_ID");
  if (!issuer || !keyId || !pem || !bid) throw new Error("apple_not_configured");
  const key = await importPKCS8(pem.replace(/\\n/g, "\n"), "ES256");
  return await new SignJWT({ bid })
    .setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT" })
    .setIssuer(issuer).setIssuedAt().setExpirationTime("10m").setAudience("appstoreconnect-v1")
    .sign(key);
}

async function fetchTransaction(id: string): Promise<AppleTransaction | null> {
  const token = await appleToken();
  for (const host of ["https://api.storekit.itunes.apple.com", "https://api.storekit-sandbox.itunes.apple.com"]) {
    const r = await fetch(`${host}/inApps/v1/transactions/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
    const text = await r.text();
    if (r.status === 404) continue;
    if (!r.ok) throw new Error(`Apple [${r.status}]: ${text}`);
    return decodeJwsPayload<AppleTransaction>(JSON.parse(text).signedTransactionInfo);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const me = await requireUser(req);
    if (!me) return json({ error: "Not signed in" }, 401);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const athleteId = parsed.data.athleteId ?? me.user.id;
    const db = admin();
    const store = purchaseStore(db);

    // A transaction already granted is answered without re-checking the block (idempotent).
    const prior = await store.findByExternalId(`apple:${parsed.data.transactionId}`);
    if (prior) return json({ ok: true, status: "already_recorded", purchaseId: prior.id });

    const gate = await checkBuy(db, me.user.id, athleteId, "early_recap");
    if (!gate.ok) return json({ error: gate.error, message: (gate as any).message }, 409);

    const tx = await fetchTransaction(parsed.data.transactionId);
    if (!tx) return json({ error: "invalid_transaction" }, 400);
    const v = validateAppleTransaction(tx, { bundleId: Deno.env.get("APPLE_BUNDLE_ID")!, userId: me.user.id, transactionId: parsed.data.transactionId });
    if (!v.ok) return json({ error: v.reason }, 400);

    const rec = await recordPurchaseOnce(store, {
      user_id: athleteId, payer_user_id: me.user.id, product: "early_recap", channel: "apple",
      external_id: `apple:${tx.transactionId}`, amount_cents: EARLY_RECAP.priceCents, block_start: gate.blockStart,
    });
    if (rec.status === "block_already_bought") return json({ error: "already_bought" }, 409);

    if (athleteId === me.user.id && rec.status === "granted") {
      await deliverEarlyRecap(db, rec.purchase as any, generatorAs(me.auth));
    }
    if (athleteId !== me.user.id) await db.from("addon_parent_requests").update({ status: "paid" }).eq("athlete_user_id", athleteId).eq("parent_user_id", me.user.id).eq("product", "early_recap").eq("status", "pending");
    return json({ ok: true, status: rec.status, purchaseId: rec.purchase.id });
  } catch (e) {
    console.error("verify-apple-purchase", e);
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
