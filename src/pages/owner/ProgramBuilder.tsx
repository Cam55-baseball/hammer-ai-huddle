/**
 * PHASE 10 — Program Builder (owner-only scaffold)
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VideoUploadWizard } from '@/components/owner/VideoUploadWizard';
import { QuickAttachVideo } from '@/components/owner/QuickAttachVideo';
import { Loader2, Wrench, ArrowLeft, Paperclip } from 'lucide-react';
import { saveBuild } from '@/lib/ownerBuildStorage';
import { toast } from '@/hooks/use-toast';

export default function ProgramBuilder() {
  const { isOwner, loading } = useOwnerAccess();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialVideoId = params.get('videoId') ?? '';

  const { videos, tags, loading: videosLoading, refetch } = useVideoLibrary({ limit: 200 });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [videoId, setVideoId] = useState(initialVideoId);
  const [quickOpen, setQuickOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [pendingSelect, setPendingSelect] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isOwner) navigate('/dashboard');
  }, [isOwner, loading, navigate]);

  // Auto-select the freshly uploaded video once it appears in the list.
  useEffect(() => {
    if (!pendingSelect) return;
    if (videos.some((v) => v.id === pendingSelect)) {
      setVideoId(pendingSelect);
      setPendingSelect(null);
    }
  }, [videos, pendingSelect]);

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

  const handleAttached = (newVideoId: string) => {
    setPendingSelect(newVideoId);
    refetch();
  };

  const handleAdvancedSuccess = (newVideoId?: string) => {
    setAdvancedOpen(false);
    if (newVideoId) setPendingSelect(newVideoId);
    refetch();
    toast({ title: 'Video added', description: newVideoId ? 'Set as your anchor video.' : 'Available in the picker.' });
  };

  const priceNum = Number(price);
  const priceValid = Number.isFinite(priceNum) && priceNum >= 0.5;
  const canSave = name.trim().length > 0 && priceValid;

  const handleSave = () => {
    if (!canSave) return;
    const normalized = Math.round(priceNum * 100) / 100;
    saveBuild({
      id: crypto.randomUUID(),
      type: 'program',
      name,
      meta: { description, videoId: videoId || null, price: normalized },
      createdAt: Date.now(),
    });
    console.log('[PHASE_10_PROGRAM_SAVE]', { name, description, videoId, price: normalized });
    toast({ title: 'Program saved', description: `${name} • $${normalized.toFixed(2)}` });
    navigate('/owner');
  };

  const selectedVideo = videos.find((v) => v.id === videoId);

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
            <Wrench className="h-8 w-8" />
            Program Builder
          </h1>
          <p className="text-muted-foreground mt-1">
            Pick the anchor video for this program below.
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program-name">Program Name</Label>
            <Input
              id="program-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 4-Week Power Hitting Block"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="program-description">Description</Label>
            <Textarea
              id="program-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this program teaches and who it's for"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="program-price">Price (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="program-price"
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setPrice(v);
                }}
                placeholder="99.00"
                className="pl-8"
              />
            </div>
            {!priceValid && price.length > 0 ? (
              <p className="text-xs text-destructive">Minimum $0.50</p>
            ) : (
              <p className="text-xs text-muted-foreground">What buyers will pay at checkout.</p>
            )}
          </div>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Anchor Video</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuickOpen(true)}>
                <Paperclip className="h-4 w-4 mr-1.5" />
                Attach video
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setAdvancedOpen(true)}
              >
                Advanced upload
              </Button>
            </div>
          </div>
          {videosLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading library…
            </div>
          ) : videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No videos yet. Click <span className="text-foreground font-medium">Attach video</span> to add one by link or upload.
            </p>
          ) : (
            <Select value={videoId} onValueChange={setVideoId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose from library…" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {videos.map((v) => (
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
          )}
          {selectedVideo && (
            <p className="text-xs text-muted-foreground truncate">
              Selected: <span className="text-foreground font-medium">{selectedVideo.title}</span>
            </p>
          )}
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!canSave}>Save Program</Button>
        </div>
      </div>

      <QuickAttachVideo
        open={quickOpen}
        onOpenChange={setQuickOpen}
        onAttached={handleAttached}
      />

      <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advanced upload</DialogTitle>
          </DialogHeader>
          <VideoUploadWizard tags={tags} onSuccess={handleAdvancedSuccess} fastMode />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
