/**
 * PHASE 10.5 — Owner Build Library
 * Owner-only view of locally persisted builds (programs / bundles / consultations).
 * No DB. Reads from localStorage via ownerBuildStorage.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Library, Send, Users, Pencil } from 'lucide-react';
import { getBuilds, updateBuild, type BuildItem } from '@/lib/ownerBuildStorage';
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

export default function BuildLibrary() {
  const { isOwner, loading } = useOwnerAccess();
  const navigate = useNavigate();
  const [builds, setBuilds] = useState<BuildItem[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<BuildItem | null>(null);
  const [editPrice, setEditPrice] = useState('');

  const openEdit = (b: BuildItem) => {
    setEditing(b);
    const p = b.meta?.price;
    setEditPrice(typeof p === 'number' ? String(p) : typeof p === 'string' ? p : '');
  };

  const savePrice = () => {
    if (!editing) return;
    const n = Number(editPrice);
    if (!Number.isFinite(n) || n < 0.5) {
      toast({ title: 'Invalid price', description: 'Minimum $0.50', variant: 'destructive' });
      return;
    }
    const next = updateBuild(editing.id, { meta: { ...editing.meta, price: n } });
    if (next) {
      setBuilds((prev) => prev.map((b) => (b.id === next.id ? next : b)));
      toast({ title: 'Price updated', description: `${next.name} • $${n.toFixed(2)}` });
    }
    setEditing(null);
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const { data, error } = await supabase
                        .from('user_build_access')
                        .select('user_id, granted_at')
                        .eq('build_id', b.id)
                        .order('granted_at', { ascending: false });
                      // Phase 13 light: console-only owner view of buyers.
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
    </DashboardLayout>
  );
}
