// Shared Stripe → subscriptions sync, used by stripe-webhook and stripe-reconcile.
// Mapping rules are copied unchanged from the original stripe-webhook
// handleSubscriptionEvent. Do not change them in one caller only.
import Stripe from "https://esm.sh/stripe@18.5.0";

export type ResolvedVia = "metadata" | "client_reference" | "customer_id" | "email";

export interface ResolveInput {
  supabase: any;
  stripe: Stripe;
  customerId: string;
  subscription?: Stripe.Subscription | null;
  session?: Stripe.Checkout.Session | null;
  /** Optional pre-built lowercase email → user_id index (reconcile builds it once). */
  emailIndex?: Map<string, string>;
  /** Optional pre-fetched Stripe customer. */
  customer?: Stripe.Customer | Stripe.DeletedCustomer | null;
}

export interface ResolveResult {
  userId: string | null;
  via: ResolvedVia | null;
  reason?: string;
}

async function userExists(supabase: any, id: unknown): Promise<boolean> {
  if (typeof id !== "string" || id.length < 10) return false;
  try {
    const { data, error } = await supabase.auth.admin.getUserById(id);
    return !error && !!data?.user?.id;
  } catch {
    return false;
  }
}

/** Page through ALL auth users (perPage 200) and build a lowercase email index. */
export async function buildEmailIndex(supabase: any): Promise<Map<string, string>> {
  const index = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers failed on page ${page}: ${error.message}`);
    const users = data?.users ?? [];
    for (const u of users) {
      const e = (u.email ?? "").toLowerCase();
      if (e && !index.has(e)) index.set(e, u.id);
    }
    if (users.length < 200) break;
    if (page > 500) break; // hard safety stop (100k users)
  }
  return index;
}

/** Find the app user behind a Stripe customer, in the agreed priority order. */
export async function resolveUserId(input: ResolveInput): Promise<ResolveResult> {
  const { supabase, stripe, customerId, subscription, session } = input;

  // a. subscription.metadata.user_id
  const metaId = subscription?.metadata?.user_id;
  if (metaId && (await userExists(supabase, metaId))) return { userId: metaId, via: "metadata" };

  // b. checkout session client_reference_id, then session.metadata.user_id
  if (session) {
    if (session.client_reference_id && (await userExists(supabase, session.client_reference_id))) {
      return { userId: session.client_reference_id, via: "client_reference" };
    }
    const sMeta = session.metadata?.user_id;
    if (sMeta && (await userExists(supabase, sMeta))) return { userId: sMeta, via: "client_reference" };
  }

  // c. existing subscriptions row for this Stripe customer
  if (customerId) {
    const { data: rows } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .limit(5);
    for (const r of rows ?? []) {
      if (await userExists(supabase, r.user_id)) return { userId: r.user_id, via: "customer_id" };
    }
  }

  // d. Stripe customer email, case-insensitive, across ALL auth users
  let customer = input.customer ?? null;
  if (!customer && customerId) {
    try {
      customer = await stripe.customers.retrieve(customerId);
    } catch (e) {
      return { userId: null, via: null, reason: `customer_lookup_failed: ${String(e)}` };
    }
  }
  if (!customer || (customer as Stripe.DeletedCustomer).deleted) {
    return { userId: null, via: null, reason: "customer_deleted_or_missing" };
  }
  const email = ((customer as Stripe.Customer).email ?? "").toLowerCase();
  if (!email) return { userId: null, via: null, reason: "customer_has_no_email" };

  const index = input.emailIndex ?? (await buildEmailIndex(supabase));
  const found = index.get(email);
  if (found && (await userExists(supabase, found))) return { userId: found, via: "email" };
  return { userId: null, via: null, reason: "no_user_with_customer_email" };
}

export interface SyncOptions {
  supabase: any;
  stripe: Stripe;
  customerId: string;
  userId: string;
  /** true = return the row only, write nothing, no broadcast. */
  computeOnly?: boolean;
  /** Pre-fetched subscriptions for this customer (same set the default list returns: status != canceled). */
  subscriptions?: Stripe.Subscription[];
  productCache?: Map<string, Stripe.Product>;
  log?: (step: string, details?: unknown) => void;
}

export interface SyncRow {
  user_id: string;
  status: "active" | "inactive";
  subscribed_modules: string[];
  module_subscription_mapping: Record<string, any>;
  has_pending_cancellations: boolean;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  current_period_end: string | null;
  tier: string | null;
}

async function getProduct(stripe: Stripe, id: string, cache?: Map<string, Stripe.Product>) {
  const hit = cache?.get(id);
  if (hit) return hit;
  const p = await stripe.products.retrieve(id);
  cache?.set(id, p);
  return p;
}

/** Build (and unless computeOnly, write + broadcast) the subscriptions row for a customer. */
export async function syncCustomer(opts: SyncOptions): Promise<SyncRow> {
  const { supabase, stripe, customerId, userId, computeOnly, productCache } = opts;
  const log = opts.log ?? (() => {});

  // Same set as before: Stripe's default list (all statuses except canceled).
  let subs: Stripe.Subscription[];
  let preloaded = false;
  if (opts.subscriptions) {
    subs = opts.subscriptions;
    preloaded = true;
  } else {
    const list = await stripe.subscriptions.list({ customer: customerId, limit: 100 });
    subs = list.data;
  }

  const moduleMapping: Record<string, any> = {};
  const activeModules: string[] = [];

  for (const sub of subs) {
    // Skip canceled subscriptions that are past their period end
    if (sub.status === "canceled" && (sub as any).current_period_end * 1000 < Date.now()) continue;

    const fullSub = preloaded ? sub : await stripe.subscriptions.retrieve(sub.id);
    const subPeriodEnd = (fullSub as any).current_period_end;

    for (const item of fullSub.items.data) {
      const productId = typeof item.price.product === "string" ? item.price.product : item.price.product.id;
      const product = await getProduct(stripe, productId, productCache);

      let tier = product.metadata?.tier?.toLowerCase();
      let sport = product.metadata?.sport?.toLowerCase();
      if (!tier) {
        const name = product.name.toLowerCase();
        if (name.includes("golden 2way") || name.includes("golden2way")) tier = "golden2way";
        else if (name.includes("5tool") || name.includes("5 tool")) tier = "5tool";
        else if (name.includes("complete pitcher") || name.includes("pitcher")) tier = "pitcher";
      }
      if (!sport) {
        const name = product.name.toLowerCase();
        if (name.includes("softball")) sport = "softball";
        else if (name.includes("baseball")) sport = "baseball";
      }

      const entry = {
        subscription_id: fullSub.id,
        status: fullSub.status,
        current_period_end: item.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: fullSub.cancel_at_period_end || false,
        price_id: item.price.id,
        canceled_at: fullSub.canceled_at ? new Date(fullSub.canceled_at * 1000).toISOString() : null,
      };
      const counts = fullSub.status === "active" || (fullSub.status === "canceled" && subPeriodEnd * 1000 > Date.now());

      if (tier && sport) {
        const key = `${sport}_${tier}`;
        moduleMapping[key] = entry;
        if (counts) activeModules.push(key);
        continue;
      }

      // Legacy module-based products
      let module = product.metadata?.module?.toLowerCase();
      if (!sport || !module) {
        const name = product.name.toLowerCase();
        if (!sport) {
          if (name.includes("softball")) sport = "softball";
          else if (name.includes("baseball")) sport = "baseball";
        }
        if (!module) {
          if (name.includes("hitting")) module = "hitting";
          else if (name.includes("pitching")) module = "pitching";
          else if (name.includes("throwing")) module = "throwing";
        }
      }
      if (!sport || !module) continue;
      const key = `${sport}_${module}`;
      moduleMapping[key] = entry;
      if (counts) activeModules.push(key);
    }
  }

  const endDates = Object.values(moduleMapping)
    .map((m: any) => new Date(m.current_period_end).getTime())
    .filter((d) => !isNaN(d));
  const latestEnd = endDates.length > 0 ? new Date(Math.max(...endDates)).toISOString() : null;

  const subIds = subs
    .filter((s) => s.status !== "canceled" || (s as any).current_period_end * 1000 > Date.now())
    .map((s) => s.id);

  const hasPendingCancellations = Object.values(moduleMapping).some((m: any) => m.cancel_at_period_end);

  // Preserve manual (hand-granted) modules from the current row.
  // Manual = module whose key is missing from the current mapping, or whose
  // mapping entry's subscription_id does not start with "sub_".
  let currentRow = opts.currentRow;
  if (currentRow === undefined) {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("subscribed_modules, module_subscription_mapping")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(`subscriptions read failed: ${error.message}`);
    currentRow = data ?? null;
  }
  const curModules: string[] = Array.isArray(currentRow?.subscribed_modules) ? currentRow.subscribed_modules : [];
  const curMapping: Record<string, any> =
    currentRow?.module_subscription_mapping && typeof currentRow.module_subscription_mapping === "object"
      ? currentRow.module_subscription_mapping : {};
  const manualModules = curModules.filter((m) => {
    const entry = curMapping[m];
    if (!entry) return true;
    const sid = typeof entry.subscription_id === "string" ? entry.subscription_id : "";
    return !sid.startsWith("sub_");
  });
  const finalModules = [...new Set([...activeModules, ...manualModules])];
  const finalMapping: Record<string, any> = { ...moduleMapping };
  for (const m of manualModules) {
    if (curMapping[m] && !(m in finalMapping)) finalMapping[m] = curMapping[m];
  }

  const activeTier = finalModules.find((m) => m.includes("golden2way")) ? "golden2way"
    : finalModules.find((m) => m.includes("5tool")) ? "5tool"
    : finalModules.find((m) => m.includes("pitcher")) ? "pitcher"
    : null;

  const row: SyncRow = {
    user_id: userId,
    status: finalModules.length > 0 ? "active" : "inactive",
    subscribed_modules: finalModules,
    module_subscription_mapping: finalMapping,
    has_pending_cancellations: hasPendingCancellations,
    stripe_customer_id: customerId,
    stripe_subscription_id: subIds.join(","),
    current_period_end: latestEnd,
    tier: activeTier,
  };

  if (computeOnly) return row;

  // current_period_end is NOT NULL in the database (default now() + 7 days).
  // When there is no remaining period (full cancellation), leave the column out
  // entirely: an existing row keeps its value, a new row gets the default.
  const upsertRow: Record<string, unknown> = { ...row };
  if (upsertRow.current_period_end == null) delete upsertRow.current_period_end;

  const { error } = await supabase.from("subscriptions").upsert(upsertRow, { onConflict: "user_id" });
  if (error) throw new Error(`subscriptions upsert failed: ${error.message}`);
  log("Database updated", { userId, activeModules, hasPendingCancellations });

  try {
    const channel = supabase.channel(`subscription:${userId}`);
    await channel.send({
      type: "broadcast",
      event: "updated",
      payload: { active_modules: activeModules, tier: activeTier },
    });
    await supabase.removeChannel(channel);
  } catch (e) {
    log("Realtime broadcast failed (non-fatal)", { error: String(e) });
  }
  return row;
}
