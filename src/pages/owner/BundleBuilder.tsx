/**
 * PHASE 10 — Bundle Builder (owner-only scaffold)
 * No DB writes. Console-log only on save.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Package } from 'lucide-react';
import { saveBuild } from '@/lib/ownerBuildStorage';
import { toast } from '@/hooks/use-toast';

export default function BundleBuilder() {
  const { isOwner, loading } = useOwnerAccess();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const videoId = params.get('videoId') ?? '';

  const [name, setName] = useState('');

  useEffect(() => {
    if (!loading && !isOwner) navigate('/dashboard');
  }, [isOwner, loading, navigate]);

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

  const handleSave = () => {
    saveBuild({
      id: crypto.randomUUID(),
      type: 'bundle',
      name,
      meta: { videoId },
      createdAt: Date.now(),
    });
    console.log('[PHASE_10_BUNDLE_SAVE]', { name, videoId });
    toast({ title: 'Bundle saved', description: name });
    navigate('/owner/builds');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Bundle Builder
          </h1>
          <p className="text-muted-foreground mt-1">
            Building from Video ID: <span className="font-mono text-foreground">{videoId || '—'}</span>
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bundle-name">Bundle Name</Label>
            <Input
              id="bundle-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Catcher's Pop-Time Pack"
            />
          </div>
        </Card>

        <Card className="p-6 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Videos in Bundle</h2>
          {videoId ? (
            <ul className="text-sm font-mono space-y-1">
              <li>• {videoId}</li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No videos selected yet.</p>
          )}
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!name.trim()}>Save Bundle</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
