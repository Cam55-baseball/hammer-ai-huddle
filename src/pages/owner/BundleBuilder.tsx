/**
 * PHASE 10 — Bundle Builder (owner-only scaffold)
 * No DB writes. Console-log only on save.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { useVideoLibrary } from '@/hooks/useVideoLibrary';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VideoUploadWizard } from '@/components/owner/VideoUploadWizard';
import { Loader2, Package, ArrowLeft, X, Plus, Upload } from 'lucide-react';
import { saveBuild } from '@/lib/ownerBuildStorage';
import { toast } from '@/hooks/use-toast';

export default function BundleBuilder() {
  const { isOwner, loading } = useOwnerAccess();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialVideoId = params.get('videoId') ?? '';

  const { videos, tags, loading: videosLoading, refetch } = useVideoLibrary({ limit: 200 });

  const [name, setName] = useState('');
  const [videoIds, setVideoIds] = useState<string[]>(initialVideoId ? [initialVideoId] : []);
  const [pickerValue, setPickerValue] = useState<string>('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingAutoAdd, setPendingAutoAdd] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isOwner) navigate('/dashboard');
  }, [isOwner, loading, navigate]);

  // After refetch finishes and the new video is in `videos`, auto-add it.
  useEffect(() => {
    if (!pendingAutoAdd) return;
    if (videos.some((v) => v.id === pendingAutoAdd)) {
      setVideoIds((prev) => (prev.includes(pendingAutoAdd) ? prev : [...prev, pendingAutoAdd]));
      setPendingAutoAdd(null);
    }
  }, [videos, pendingAutoAdd]);

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

  const addVideo = (id: string) => {
    if (!id || videoIds.includes(id)) return;
    setVideoIds((prev) => [...prev, id]);
    setPickerValue('');
  };

  const removeVideo = (id: string) => {
    setVideoIds((prev) => prev.filter((v) => v !== id));
  };

  const handleUploadSuccess = (newVideoId?: string) => {
    setUploadOpen(false);
    if (newVideoId) setPendingAutoAdd(newVideoId);
    refetch();
    toast({ title: 'Video added', description: newVideoId ? 'Added to your bundle.' : 'Available in the picker.' });
  };

  const handleSave = () => {
    saveBuild({
      id: crypto.randomUUID(),
      type: 'bundle',
      name,
      meta: {
        videoIds,
        videoId: videoIds[0] ?? null, // backward-compat
      },
      createdAt: Date.now(),
    });
    console.log('[PHASE_10_BUNDLE_SAVE]', { name, videoIds });
    toast({ title: 'Bundle saved', description: `${name} (${videoIds.length} videos)` });
    navigate('/owner');
  };

  const titleFor = (id: string) => videos.find((v) => v.id === id)?.title ?? id;
  const availableToAdd = videos.filter((v) => !videoIds.includes(v.id));

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/owner')}
          className="-ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Owner Dashboard
        </Button>

        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Bundle Builder
          </h1>
          <p className="text-muted-foreground mt-1">
            Group multiple videos into a single sellable pack.
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

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Videos in Bundle ({videoIds.length})
            </h2>
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" />
              Upload new video
            </Button>
          </div>

          {videosLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading library…
            </div>
          ) : videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No videos in your library yet. Click <span className="text-foreground font-medium">Upload new video</span> above to add one.
            </p>
          ) : (
            <div className="flex gap-2">
              <Select value={pickerValue} onValueChange={addVideo}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={availableToAdd.length === 0 ? 'All videos added' : 'Add a video…'} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {availableToAdd.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="truncate">{v.title}</span>
                      {v.sport?.length ? (
                        <span className="text-xs text-muted-foreground ml-2 capitalize">
                          {v.sport.join(', ')}
                        </span>
                      ) : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" disabled aria-hidden>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {videoIds.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No videos added yet.</p>
          ) : (
            <ul className="space-y-2">
              {videoIds.map((id, idx) => (
                <li
                  key={id}
                  className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                    <span className="text-sm truncate">{titleFor(id)}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeVideo(id)}
                    aria-label={`Remove ${titleFor(id)}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!name.trim() || videoIds.length === 0}>
            Save Bundle
          </Button>
        </div>
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload new video</DialogTitle>
          </DialogHeader>
          <VideoUploadWizard tags={tags} onSuccess={handleUploadSuccess} fastMode />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
