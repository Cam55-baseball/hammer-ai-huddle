/**
 * PHASE 10.5 — Owner Build Library
 * Owner-only view of locally persisted builds (programs / bundles / consultations).
 * No DB. Reads from localStorage via ownerBuildStorage.
 */
import { useEffect, useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { Loader2, Library, Send, Users, Pencil, Trash2, X } from 'lucide-react';
import { getBuilds, updateBuild, deleteBuild, type BuildItem } from '@/lib/ownerBuildStorage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

function formatPrice(meta: Record<string, any> | undefined): string | null {
  const raw = meta?.price;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  return `$${n.toFixed(2).replace(/\.00$/, '')}`;
}

const TYPE_LABEL: Record<BuildItem['type'], string> = {
  program: 'Program',
  bundle: 'Bundle',
  consultation: 'Consultation',
};

function formatWhen(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
}

type EditDraft = {
  name: string;
  price: string;
  description: string;
  videoId: string;
  videoIds: string[];
};

export default function BuildLibrary() {
  const { isOwner, loading } = useOwnerAccess();
  const navigate = useNavigate();
  const { videos } = useVideoLibrary({ limit: 200 });
  const [builds, setBuilds] = useState<BuildItem[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<BuildItem | null>(null);
  const [draft, setDraft] = useState<EditDraft>({
    name: '',
    price: '',
    description: '',
    videoId: '',
    videoIds: [],
  });
  const [pickerValue, setPickerValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openEdit = (b: BuildItem) => {
    const p = b.meta?.price;
    setDraft({
      name: b.name ?? '',
      price: typeof p === 'number' ? String(p) : typeof p === 'string' ? p : '',
      description: typeof b.meta?.description === 'string' ? b.meta.description : '',
      videoId: typeof b.meta?.videoId === 'string' ? b.meta.videoId : '',
      videoIds: Array.isArray(b.meta?.videoIds) ? [...b.meta.videoIds] : [],
    });
    setPickerValue('');
    setEditing(b);
  };

  const priceNum = Number(draft.price);
  const priceValid = Number.isFinite(priceNum) && priceNum >= 0.5;
  const nameValid = draft.name.trim().length > 0;
  const bundleValid = editing?.type !== 'bundle' || draft.videoIds.length > 0;
  const canSave = nameValid && priceValid && bundleValid;

  const titleFor = (id: string) => videos.find((v) => v.id === id)?.title ?? id;
  const availableToAdd = videos.filter((v) => !draft.videoIds.includes(v.id));

  const saveEdit = () => {
    if (!editing || !canSave) return;
    const normalized = Math.round(priceNum * 100) / 100;
    const metaPatch: Record<string, any> = { price: normalized };
    if (editing.type === 'program') {
      metaPatch.description = draft.description;
      metaPatch.videoId = draft.videoId || null;
    } else if (editing.type === 'bundle') {
      metaPatch.videoIds = draft.videoIds;
      metaPatch.videoId = draft.videoIds[0] ?? null;
    }
    const next = updateBuild(editing.id, { name: draft.name.trim(), meta: metaPatch });
    if (next) {
      setBuilds((prev) => prev.map((b) => (b.id === next.id ? next : b)));
      toast({ title: 'Build updated', description: `${next.name} • $${normalized.toFixed(2)}` });
    }
    setEditing(null);
  };

  const handleDelete = () => {
    if (!confirmDeleteId) return;
    const ok = deleteBuild(confirmDeleteId);
    if (ok) {
      setBuilds((prev) => prev.filter((b) => b.id !== confirmDeleteId));
      toast({ title: 'Build deleted' });
    } else {
      toast({ title: 'Could not delete', variant: 'destructive' });
    }
    setConfirmDeleteId(null);
  };

  const handleSell = async (build: BuildItem) => {
    setPendingId(build.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-build-checkout', {
        body: { build },
      });
      if (error || !data?.url) {
        toast({
          title: 'Could not start checkout',
          description: error?.message ?? 'Please try again.',
          variant: 'destructive',
        });
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      toast({
        title: 'Checkout error',
        description: err instanceof Error ? err.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setPendingId(null);
    }
  };

  useEffect(() => {
    if (!loading && !isOwner) navigate('/dashboard');
  }, [isOwner, loading, navigate]);

  useEffect(() => {
    setBuilds(getBuilds());
  }, []);

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

  const pendingDelete = confirmDeleteId ? builds.find((b) => b.id === confirmDeleteId) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Library className="h-8 w-8" />
            Your Builds
          </h1>
          <p className="text-muted-foreground mt-1">
            Programs, bundles, and consultations you've created.
          </p>
        </div>

        {builds.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No builds yet — create one from your videos.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {builds.map((b) => (
              <Card key={b.id} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{b.name || 'Untitled'}</h3>
                    <Badge variant="secondary" className="text-[10px]">{TYPE_LABEL[b.type]}</Badge>
                    {formatPrice(b.meta) ? (
                      <Badge className="text-[10px]">{formatPrice(b.meta)}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40">
                        No price set
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{formatWhen(b.createdAt)}</p>
                  {b.type === 'bundle' && Array.isArray(b.meta?.videoIds) ? (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {b.meta.videoIds.length} video{b.meta.videoIds.length === 1 ? '' : 's'}
                    </p>
                  ) : b.meta?.videoId ? (
                    <p className="text-[11px] font-mono text-muted-foreground mt-1 truncate">
                      video: {b.meta.videoId}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 flex flex-col gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => handleSell(b)}
                    disabled={pendingId === b.id}
                  >
                    {pendingId === b.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Opening…
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        Sell / Share
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(b)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    onClick={() => setConfirmDeleteId(b.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const { data, error } = await supabase
                        .from('user_build_access')
                        .select('user_id, granted_at')
                        .eq('build_id', b.id)
                        .order('granted_at', { ascending: false });
                      console.log('[Buyers]', b.id, { rows: data ?? [], error });
                      toast({
                        title: 'Buyers logged to console',
                        description: `${data?.length ?? 0} buyer(s) for "${b.name || 'Untitled'}"`,
                      });
                    }}
                  >
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    View Buyers
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editing ? TYPE_LABEL[editing.type] : 'build'}</DialogTitle>
            <DialogDescription>
              Update the details below. Changes save locally.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-price">Price (USD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="edit-price"
                  type="text"
                  inputMode="decimal"
                  value={draft.price}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) {
                      setDraft((d) => ({ ...d, price: v }));
                    }
                  }}
                  className="pl-8"
                  placeholder="49.00"
                />
              </div>
              {!priceValid && draft.price.length > 0 && (
                <p className="text-xs text-destructive">Minimum $0.50</p>
              )}
            </div>

            {editing?.type === 'program' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-desc">Description</Label>
                  <Textarea
                    id="edit-desc"
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Anchor Video</Label>
                  <div className="flex gap-2">
                    <Select
                      value={draft.videoId}
                      onValueChange={(v) => setDraft((d) => ({ ...d, videoId: v }))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Choose from library…" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {videos.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            <span className="truncate">{v.title}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {draft.videoId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDraft((d) => ({ ...d, videoId: '' }))}
                        aria-label="Clear video"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}

            {editing?.type === 'bundle' && (
              <div className="space-y-2">
                <Label>Videos in Bundle ({draft.videoIds.length})</Label>
                <Select
                  value={pickerValue}
                  onValueChange={(id) => {
                    if (!id || draft.videoIds.includes(id)) return;
                    setDraft((d) => ({ ...d, videoIds: [...d.videoIds, id] }));
                    setPickerValue('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={availableToAdd.length === 0 ? 'All videos added' : 'Add from library…'} />
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
                          <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
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
            )}
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={!canSave}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this build?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.name || 'Untitled'}" will be removed permanently. Existing buyers keep access; this only removes it from your library and stops new sales.
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
