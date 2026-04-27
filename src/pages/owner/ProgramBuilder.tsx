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
import { Loader2, Wrench, ArrowLeft } from 'lucide-react';
import { saveBuild } from '@/lib/ownerBuildStorage';
import { toast } from '@/hooks/use-toast';

export default function ProgramBuilder() {
  const { isOwner, loading } = useOwnerAccess();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialVideoId = params.get('videoId') ?? '';

  const { videos, loading: videosLoading } = useVideoLibrary({ limit: 200 });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [videoId, setVideoId] = useState(initialVideoId);

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
      type: 'program',
      name,
      meta: { description, videoId: videoId || null },
      createdAt: Date.now(),
    });
    console.log('[PHASE_10_PROGRAM_SAVE]', { name, description, videoId });
    toast({ title: 'Program saved', description: name });
    navigate('/owner-dashboard');
  };

  const selectedVideo = videos.find((v) => v.id === videoId);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/owner-dashboard')}
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
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Anchor Video</h2>
          {videosLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading library…
            </div>
          ) : videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No videos in your library yet.{' '}
              <button
                className="underline text-foreground"
                onClick={() => navigate('/owner-dashboard?section=videos')}
              >
                Add one in the Video Library
              </button>
              .
            </p>
          ) : (
            <Select value={videoId} onValueChange={setVideoId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a video…" />
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
          <Button onClick={handleSave} disabled={!name.trim()}>Save Program</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
