/**
 * Owner Bundle Control Center — /owner/builds
 * Database-backed bundles: draft/publish, public link, videos, price,
 * discount codes, manual grant/revoke, and sales.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { useVideoLibrary } from '@/hooks/useVideoLibrary';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  Library,
  Pencil,
  Trash2,
  X,
  Link2,
  Eye,
  EyeOff,
  UserPlus,
  Plus,
  DollarSign,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  listBundles,
  updateBundle,
  setBundleStatus,
  deleteBundle,
  bundleUrl,
  formatMoney,
  importLocalBundles,
  grantBundleAccess,
  revokeBundleAccess,
  getSalesSummary,
  type Bundle,
  type SalesSummary,
} from '@/lib/bundles';

type EditDraft = {
  name: string;
  price: string;
  description: string;
  coverUrl: string;
  videoIds: string[];
};

type DiscountCode = {
  id: string;
  code: string;
  kind: 'percent' | 'amount';
  value: number;
  bundle_id: string | null;
  expires_at: string | null;
  max_redemptions: number | null;
  redeemed_count: number;
  active: boolean;
};

export default function BuildLibrary() {
  const { isOwner, loading } = useOwnerAccess();
  const navigate = useNavigate();
  const { videos } = useVideoLibrary({ limit: 200 });

  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loadingBundles, setLoadingBundles] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [draft, setDraft] = useState<EditDraft>({
    name: '',
    price: '',
    description: '',
    coverUrl: '',
    videoIds: [],
  });
  const [pickerValue, setPickerValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [accessTarget, setAccessTarget] = useState<Bundle | null>(null);
  const [accessEmail, setAccessEmail] = useState('');
  const [accessReason, setAccessReason] = useState('');
  const [accessBusy, setAccessBusy] = useState(false);

  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [newCode, setNewCode] = useState({ code: '', kind: 'percent', value: '', bundleId: 'all', max: '' });
  const [codeBusy, setCodeBusy] = useState(false);

  const [sales, setSales] = useState<SalesSummary | null>(null);

  const refreshBundles = useCallback(async () => {
    setLoadingBundles(true);
    try {
      const rows = await listBundles();
      setBundles(rows);
    } catch (err) {
      toast({
        title: 'Could not load bundles',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingBundles(false);
    }
  }, []);

  const refreshCodes = useCallback(async () => {
    const { data } = await supabase
      .from('bundle_discount_codes')
      .select('*')
      .order('created_at', { ascending: false });
    setCodes((data ?? []) as DiscountCode[]);
  }, []);

  useEffect(() => {
    if (!loading && !isOwner) navigate('/dashboard');
  }, [isOwner, loading, navigate]);

  useEffect(() => {
    if (loading || !isOwner) return;
    (async () => {
      const imported = await importLocalBundles();
      if (imported > 0) {
        toast({
          title: 'Bundles imported',
          description: `${imported} bundle${imported === 1 ? '' : 's'} moved from this browser into your account.`,
        });
      }
      await refreshBundles();
      await refreshCodes();
      setSales(await getSalesSummary());
    })();
  }, [loading, isOwner, refreshBundles, refreshCodes]);

  const titleFor = (id: string) => videos.find((v) => v.id === id)?.title ?? id;
  const availableToAdd = videos.filter((v) => !draft.videoIds.includes(v.id));

  const priceNum = Number(draft.price);
  const priceValid = Number.isFinite(priceNum) && priceNum >= 0.5;
  const canSave = draft.name.trim().length > 0 && priceValid && draft.videoIds.length > 0;

  const openEdit = (b: Bundle) => {
    setDraft({
      name: b.name,
      price: (b.price_cents / 100).toFixed(2),
      description: b.description ?? '',
      coverUrl: b.cover_url ?? '',
      videoIds: [...(b.video_ids ?? [])],
    });
    setPickerValue('');
    setEditing(b);
  };

  const saveEdit = async () => {
    if (!editing || !canSave) return;
    setBusyId(editing.id);
    try {
      const next = await updateBundle(editing.id, {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        cover_url: draft.coverUrl.trim() || null,
        price_cents: Math.round(priceNum * 100),
        video_ids: draft.videoIds,
      });
      setBundles((prev) => prev.map((b) => (b.id === next.id ? next : b)));
      toast({ title: 'Bundle updated', description: `${next.name} • ${formatMoney(next.price_cents)}` });
      setEditing(null);
    } catch (err) {
      toast({
        title: 'Could not save',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const togglePublish = async (b: Bundle) => {
    setBusyId(b.id);
    try {
      const next = await setBundleStatus(b.id, b.status === 'published' ? 'draft' : 'published');
      setBundles((prev) => prev.map((x) => (x.id === next.id ? next : x)));
      if (next.status === 'published') {
        await navigator.clipboard?.writeText(bundleUrl(next.slug)).catch(() => {});
        toast({ title: 'Bundle is live', description: 'Share link copied to your clipboard.' });
      } else {
        toast({
          title: 'Bundle unpublished',
          description: 'It is off sale. Existing buyers keep access.',
        });
      }
    } catch (err) {
      toast({
        title: 'Could not change status',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const copyLink = async (b: Bundle) => {
    try {
      await navigator.clipboard.writeText(bundleUrl(b.slug));
      toast({ title: 'Link copied', description: bundleUrl(b.slug) });
    } catch {
      toast({ title: 'Copy failed', description: bundleUrl(b.slug), variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteBundle(confirmDeleteId);
      setBundles((prev) => prev.filter((b) => b.id !== confirmDeleteId));
      toast({ title: 'Bundle deleted' });
    } catch (err) {
      toast({
        title: 'Could not delete',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    }
    setConfirmDeleteId(null);
  };

  const runAccess = async (action: 'grant' | 'revoke') => {
    if (!accessTarget || !accessEmail.trim()) return;
    setAccessBusy(true);
    try {
      if (action === 'grant') {
        await grantBundleAccess(accessTarget.id, accessEmail.trim(), accessReason || undefined);
        toast({ title: 'Access granted', description: `${accessEmail} can now watch this bundle.` });
      } else {
        await revokeBundleAccess(accessTarget.id, accessEmail.trim(), accessReason || undefined);
        toast({ title: 'Access revoked', description: `${accessEmail} no longer has access.` });
      }
      setAccessEmail('');
      setAccessReason('');
    } catch (err) {
      toast({
        title: 'Could not update access',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAccessBusy(false);
    }
  };

  const createCode = async () => {
    const value = Number(newCode.value);
    if (!newCode.code.trim() || !Number.isFinite(value) || value <= 0) {
      toast({ title: 'Enter a code and a value above zero', variant: 'destructive' });
      return;
    }
    setCodeBusy(true);
    const { error } = await supabase.from('bundle_discount_codes').insert({
      code: newCode.code.trim().toUpperCase(),
      kind: newCode.kind,
      value: newCode.kind === 'percent' ? Math.round(value) : Math.round(value * 100),
      bundle_id: newCode.bundleId === 'all' ? null : newCode.bundleId,
      max_redemptions: newCode.max ? Number(newCode.max) : null,
    });
    setCodeBusy(false);
    if (error) {
      toast({ title: 'Could not create code', description: error.message, variant: 'destructive' });
      return;
    }
    setNewCode({ code: '', kind: 'percent', value: '', bundleId: 'all', max: '' });
    await refreshCodes();
    toast({ title: 'Discount code created' });
  };

  const toggleCode = async (c: DiscountCode) => {
    await supabase.from('bundle_discount_codes').update({ active: !c.active }).eq('id', c.id);
    await refreshCodes();
  };

  const deleteCode = async (c: DiscountCode) => {
    await supabase.from('bundle_discount_codes').delete().eq('id', c.id);
    await refreshCodes();
  };

  const bundleNameById = useMemo(() => {
    const map: Record<string, string> = {};
    bundles.forEach((b) => (map[b.id] = b.name));
    return map;
  }, [bundles]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }
  if (!isOwner) return null;

  const pendingDelete = confirmDeleteId ? bundles.find((b) => b.id === confirmDeleteId) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Library className="h-8 w-8" />
              Bundles
            </h1>
            <p className="text-muted-foreground mt-1">
              Build it, price it, publish it, share the link.
            </p>
          </div>
          <Button onClick={() => navigate('/owner/open_bundle_builder')}>
            <Plus className="h-4 w-4 mr-1.5" />
            New bundle
          </Button>
        </div>

        <Tabs defaultValue="bundles">
          <TabsList>
            <TabsTrigger value="bundles">Bundles</TabsTrigger>
            <TabsTrigger value="codes">Discount codes</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
          </TabsList>

          {/* ---------------- Bundles ---------------- */}
          <TabsContent value="bundles" className="space-y-3 mt-4">
            <Card className="p-4 bg-muted/40">
              <p className="text-sm font-medium">How selling works</p>
              <ol className="text-sm text-muted-foreground mt-1 space-y-0.5 list-decimal list-inside">
                <li>Add videos and set a price.</li>
                <li>Publish — that creates the public link.</li>
                <li>Share the link. Anyone can buy, no account needed to view.</li>
                <li>Buyers sign in with the email they paid with and the videos unlock.</li>
              </ol>
            </Card>

            {loadingBundles ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-6">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading bundles…
              </div>
            ) : bundles.length === 0 ? (
              <Card className="p-8 text-center space-y-3">
                <p className="text-muted-foreground">No bundles yet.</p>
                <Button onClick={() => navigate('/owner/open_bundle_builder')}>
                  Create your first bundle
                </Button>
              </Card>
            ) : (
              bundles.map((b) => {
                const stats = sales?.perBundle[b.id];
                return (
                  <Card key={b.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{b.name}</h3>
                          <Badge
                            variant={b.status === 'published' ? 'default' : 'outline'}
                            className="text-[10px] uppercase"
                          >
                            {b.status === 'published' ? 'Live' : 'Draft'}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {formatMoney(b.price_cents)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(b.video_ids ?? []).length} video
                          {(b.video_ids ?? []).length === 1 ? '' : 's'}
                          {stats
                            ? ` · ${stats.views} view${stats.views === 1 ? '' : 's'} · ${stats.units} sold · ${formatMoney(stats.revenueCents)}`
                            : ''}
                        </p>
                        {b.status === 'published' && (
                          <p className="text-[11px] font-mono text-muted-foreground mt-1 truncate">
                            /b/{b.slug}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-wrap gap-1.5">
                        <Button size="sm" onClick={() => togglePublish(b)} disabled={busyId === b.id}>
                          {busyId === b.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : b.status === 'published' ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                              Unpublish
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              Publish
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyLink(b)}
                          disabled={b.status !== 'published'}
                        >
                          <Link2 className="h-3.5 w-3.5 mr-1.5" />
                          Copy link
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(b)}>
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setAccessTarget(b)}>
                          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                          Access
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                          onClick={() => setConfirmDeleteId(b.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* ---------------- Codes ---------------- */}
          <TabsContent value="codes" className="space-y-4 mt-4">
            <Card className="p-4 space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4" />
                New discount code
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={newCode.code}
                    onChange={(e) => setNewCode((c) => ({ ...c, code: e.target.value.toUpperCase() }))}
                    placeholder="SPRING25"
                    className="uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={newCode.kind}
                    onValueChange={(v) => setNewCode((c) => ({ ...c, kind: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent off</SelectItem>
                      <SelectItem value="amount">Dollar amount off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="code-value">
                    {newCode.kind === 'percent' ? 'Percent (1–100)' : 'Amount (USD)'}
                  </Label>
                  <Input
                    id="code-value"
                    inputMode="decimal"
                    value={newCode.value}
                    onChange={(e) => setNewCode((c) => ({ ...c, value: e.target.value }))}
                    placeholder={newCode.kind === 'percent' ? '25' : '10.00'}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Applies to</Label>
                  <Select
                    value={newCode.bundleId}
                    onValueChange={(v) => setNewCode((c) => ({ ...c, bundleId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All bundles</SelectItem>
                      {bundles.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="code-max">Max redemptions (optional)</Label>
                  <Input
                    id="code-max"
                    inputMode="numeric"
                    value={newCode.max}
                    onChange={(e) => setNewCode((c) => ({ ...c, max: e.target.value.replace(/\D/g, '') }))}
                    placeholder="Unlimited"
                  />
                </div>
              </div>
              <Button onClick={createCode} disabled={codeBusy}>
                {codeBusy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                Create code
              </Button>
            </Card>

            {codes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No codes yet.</p>
            ) : (
              <div className="space-y-2">
                {codes.map((c) => (
                  <Card key={c.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold">{c.code}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {c.kind === 'percent' ? `${c.value}% off` : `${formatMoney(c.value)} off`}
                        </Badge>
                        {!c.active && (
                          <Badge variant="outline" className="text-[10px]">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.bundle_id ? bundleNameById[c.bundle_id] ?? 'One bundle' : 'All bundles'} ·{' '}
                        {c.redeemed_count} used
                        {c.max_redemptions ? ` / ${c.max_redemptions}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => toggleCode(c)}>
                        {c.active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/30"
                        onClick={() => deleteCode(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ---------------- Sales ---------------- */}
          <TabsContent value="sales" className="space-y-4 mt-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Total revenue
                </p>
                <p className="text-2xl font-bold mt-1">
                  {formatMoney(sales?.totalRevenueCents ?? 0)}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">This month</p>
                <p className="text-2xl font-bold mt-1">
                  {formatMoney(sales?.monthRevenueCents ?? 0)}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Units sold
                </p>
                <p className="text-2xl font-bold mt-1">{sales?.totalUnits ?? 0}</p>
              </Card>
            </div>

            <Card className="p-4 space-y-2">
              <h2 className="font-semibold">Recent buyers</h2>
              {!sales || sales.buyers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No purchases yet.</p>
              ) : (
                <ul className="divide-y">
                  {sales.buyers.slice(0, 25).map((p, i) => (
                    <li key={`${p.buyer_email}-${i}`} className="py-2 flex justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        {p.buyer_email}
                        <span className="text-muted-foreground">
                          {' '}
                          · {bundleNameById[p.build_id] ?? p.build_id.slice(0, 8)}
                        </span>
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatMoney(p.amount_cents ?? 0)} ·{' '}
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit bundle</DialogTitle>
            <DialogDescription>Changes apply to the public page immediately.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-price">Price (USD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <Input
                  id="edit-price"
                  inputMode="decimal"
                  value={draft.price}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setDraft((d) => ({ ...d, price: v }));
                  }}
                  className="pl-8"
                />
              </div>
              {!priceValid && draft.price.length > 0 && (
                <p className="text-xs text-destructive">Minimum $0.50</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-cover">Cover image URL</Label>
              <Input
                id="edit-cover"
                value={draft.coverUrl}
                onChange={(e) => setDraft((d) => ({ ...d, coverUrl: e.target.value }))}
                placeholder="https://…"
              />
            </div>

            <div className="space-y-2">
              <Label>Videos ({draft.videoIds.length})</Label>
              <Select
                value={pickerValue}
                onValueChange={(id) => {
                  if (!id || draft.videoIds.includes(id)) return;
                  setDraft((d) => ({ ...d, videoIds: [...d.videoIds, id] }));
                  setPickerValue('');
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={availableToAdd.length === 0 ? 'All videos added' : 'Add from library…'}
                  />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {availableToAdd.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="truncate">{v.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {draft.videoIds.length === 0 ? (
                <p className="text-xs text-destructive italic">At least one video required.</p>
              ) : (
                <ul className="space-y-1.5">
                  {draft.videoIds.map((id, idx) => (
                    <li
                      key={id}
                      className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-1.5"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">
                          {idx + 1}.
                        </span>
                        <span className="text-sm truncate">{titleFor(id)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() =>
                          setDraft((d) => ({ ...d, videoIds: d.videoIds.filter((v) => v !== id) }))
                        }
                        aria-label={`Remove ${titleFor(id)}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={!canSave || busyId === editing?.id}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual access dialog */}
      <Dialog open={!!accessTarget} onOpenChange={(o) => !o && setAccessTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage access</DialogTitle>
            <DialogDescription>
              Give or remove access to "{accessTarget?.name}" without a payment. The person must
              already have an account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="access-email">Email</Label>
              <Input
                id="access-email"
                type="email"
                value={accessEmail}
                onChange={(e) => setAccessEmail(e.target.value)}
                placeholder="athlete@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="access-reason">Reason (logged)</Label>
              <Input
                id="access-reason"
                value={accessReason}
                onChange={(e) => setAccessReason(e.target.value)}
                placeholder="Comp for team deal"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => runAccess('revoke')}
                disabled={accessBusy || !accessEmail.trim()}
              >
                Revoke
              </Button>
              <Button onClick={() => runAccess('grant')} disabled={accessBusy || !accessEmail.trim()}>
                {accessBusy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                Grant access
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bundle?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.name}" will be removed and its link will stop working. Existing buyers
              keep their access records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
