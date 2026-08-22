/**
 * Owner bundle selling — database API.
 * Replaces the localStorage scaffold in ownerBuildStorage for bundles.
 * Bundles live in `bundles`; purchases/access stay in `purchases` + `user_build_access`.
 */
import { supabase } from '@/integrations/supabase/client';
import { getBuilds, deleteBuild } from '@/lib/ownerBuildStorage';

export type BundleStatus = 'draft' | 'published';

export type Bundle = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  price_cents: number;
  video_ids: string[];
  status: BundleStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicBundle = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  price_cents: number;
  videos: Array<{
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
  }>;
};

export type BundleVideo = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  sort_order: number | null;
};

export type DiscountCheck =
  | { valid: true; code: string; kind: 'percent' | 'amount'; value: number; discount_cents: number; final_cents: number }
  | { valid: false; reason: string };

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/^-|-$/g, '');
}

/** Slug that isn't taken yet — appends -2, -3, … when needed. */
export async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || `bundle-${Date.now().toString(36)}`;
  for (let i = 0; i < 30; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const { data } = await supabase.from('bundles').select('id').eq('slug', candidate).maybeSingle();
    if (!data || data.id === ignoreId) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function listBundles(): Promise<Bundle[]> {
  const { data, error } = await supabase
    .from('bundles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Bundle[];
}

export async function getBundle(id: string): Promise<Bundle | null> {
  const { data, error } = await supabase.from('bundles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Bundle) ?? null;
}

export async function createBundle(input: {
  name: string;
  description?: string | null;
  coverUrl?: string | null;
  priceCents: number;
  videoIds: string[];
}): Promise<Bundle> {
  const slug = await uniqueSlug(input.name);
  const { data, error } = await supabase
    .from('bundles')
    .insert({
      name: input.name.trim(),
      description: input.description ?? null,
      cover_url: input.coverUrl ?? null,
      price_cents: input.priceCents,
      video_ids: input.videoIds,
      slug,
      status: 'draft',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Bundle;
}

export async function updateBundle(
  id: string,
  patch: Partial<Pick<Bundle, 'name' | 'description' | 'cover_url' | 'price_cents' | 'video_ids' | 'slug'>>,
): Promise<Bundle> {
  const { data, error } = await supabase
    .from('bundles')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Bundle;
}

export async function setBundleStatus(id: string, status: BundleStatus): Promise<Bundle> {
  const { data, error } = await supabase
    .from('bundles')
    .update({ status, published_at: status === 'published' ? new Date().toISOString() : null })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Bundle;
}

export async function deleteBundle(id: string): Promise<void> {
  const { error } = await supabase.from('bundles').delete().eq('id', id);
  if (error) throw error;
}

export function bundleUrl(slug: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/b/${slug}`;
}

/* ------------------------------------------------------------------ */
/* Public storefront                                                    */
/* ------------------------------------------------------------------ */

export async function getPublicBundle(slug: string): Promise<PublicBundle | null> {
  const { data, error } = await supabase.rpc('get_public_bundle', { p_slug: slug });
  if (error) throw error;
  return (data as unknown as PublicBundle) ?? null;
}

export async function recordBundleView(bundleId: string): Promise<void> {
  try {
    await supabase.from('bundle_page_views').insert({
      bundle_id: bundleId,
      referrer: typeof document !== 'undefined' ? document.referrer.slice(0, 300) || null : null,
    });
  } catch {
    /* view counting is best-effort */
  }
}

export async function checkDiscount(code: string, bundleId: string): Promise<DiscountCheck> {
  const { data, error } = await supabase.rpc('check_bundle_discount', {
    p_code: code,
    p_bundle_id: bundleId,
  });
  if (error) return { valid: false, reason: 'Could not check that code' };
  return data as unknown as DiscountCheck;
}

export async function startBundleCheckout(slug: string, code?: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-bundle-checkout', {
    body: { slug, ...(code ? { code } : {}) },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error('Checkout could not be started');
  return data.url as string;
}

/* ------------------------------------------------------------------ */
/* Delivery                                                             */
/* ------------------------------------------------------------------ */

export async function getBundleVideos(bundleId: string): Promise<BundleVideo[]> {
  const { data, error } = await supabase.rpc('get_bundle_videos', { p_bundle_id: bundleId });
  if (error) throw error;
  return (data ?? []) as BundleVideo[];
}

/** Links purchases made with the signed-in user's email to their account. */
export async function claimPurchases(): Promise<number> {
  try {
    const { data } = await supabase.rpc('claim_build_purchases');
    return typeof data === 'number' ? data : 0;
  } catch {
    return 0;
  }
}

/* ------------------------------------------------------------------ */
/* Owner tools                                                          */
/* ------------------------------------------------------------------ */

export async function grantBundleAccess(bundleId: string, email: string, reason?: string) {
  const { data, error } = await supabase.functions.invoke('owner-bundle-access', {
    body: { action: 'grant', bundleId, email, reason },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function revokeBundleAccess(bundleId: string, email: string, reason?: string) {
  const { data, error } = await supabase.functions.invoke('owner-bundle-access', {
    body: { action: 'revoke', bundleId, email, reason },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export type BundleStats = {
  bundleId: string;
  views: number;
  units: number;
  revenueCents: number;
};

export type SalesSummary = {
  totalRevenueCents: number;
  monthRevenueCents: number;
  totalUnits: number;
  perBundle: Record<string, BundleStats>;
  buyers: Array<{
    build_id: string;
    buyer_email: string;
    amount_cents: number | null;
    created_at: string;
  }>;
};

export async function getSalesSummary(): Promise<SalesSummary> {
  const [{ data: purchases }, { data: views }] = await Promise.all([
    supabase
      .from('purchases')
      .select('build_id, build_type, buyer_email, amount_cents, created_at')
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase.from('bundle_page_views').select('bundle_id').limit(10000),
  ]);

  const perBundle: Record<string, BundleStats> = {};
  const bump = (id: string): BundleStats => {
    if (!perBundle[id]) perBundle[id] = { bundleId: id, views: 0, units: 0, revenueCents: 0 };
    return perBundle[id];
  };

  (views ?? []).forEach((v: any) => {
    bump(v.bundle_id).views += 1;
  });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  let totalRevenueCents = 0;
  let monthRevenueCents = 0;
  let totalUnits = 0;

  (purchases ?? []).forEach((p: any) => {
    const amount = p.amount_cents ?? 0;
    totalRevenueCents += amount;
    totalUnits += 1;
    if (new Date(p.created_at) >= monthStart) monthRevenueCents += amount;
    const s = bump(p.build_id);
    s.units += 1;
    s.revenueCents += amount;
  });

  return {
    totalRevenueCents,
    monthRevenueCents,
    totalUnits,
    perBundle,
    buyers: (purchases ?? []) as SalesSummary['buyers'],
  };
}

/* ------------------------------------------------------------------ */
/* One-time migration of browser-stored bundles                         */
/* ------------------------------------------------------------------ */

export async function importLocalBundles(): Promise<number> {
  const local = getBuilds().filter((b) => b.type === 'bundle');
  if (local.length === 0) return 0;

  let imported = 0;
  for (const b of local) {
    const videoIds: string[] = Array.isArray(b.meta?.videoIds) ? b.meta.videoIds : [];
    const priceCents = Math.max(50, Math.round(Number(b.meta?.price ?? 49) * 100));
    try {
      await createBundle({
        name: b.name || 'Untitled bundle',
        description: typeof b.meta?.description === 'string' ? b.meta.description : null,
        priceCents,
        videoIds,
      });
      deleteBuild(b.id);
      imported += 1;
    } catch {
      /* leave the local copy in place if the import fails */
    }
  }
  return imported;
}
