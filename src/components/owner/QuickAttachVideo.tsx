/**
 * QuickAttachVideo — minimal "drop a video into a build" dialog.
 * Only collects: source (link or file) + title. Skips sport, category,
 * structured tags, and the full 4-step VideoUploadWizard.
 *
 * Inserts a minimal record into `library_videos` via useVideoLibraryAdmin
 * and returns the new video id via onAttached(id).
 */
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVideoLibraryAdmin } from '@/hooks/useVideoLibraryAdmin';
import { validateVideoFile } from '@/data/videoLimits';
import { Loader2, Link as LinkIcon, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new video id once it's saved to the library. */
  onAttached: (videoId: string) => void;
}

function detectVideoType(url: string): 'youtube' | 'vimeo' | 'external' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  return 'external';
}

function deriveTitleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop() || u.hostname;
    return decodeURIComponent(last).replace(/[-_]+/g, ' ').replace(/\.[a-z0-9]+$/i, '').trim();
  } catch {
    return '';
  }
}

function deriveTitleFromFile(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim();
}

export function QuickAttachVideo({ open, onOpenChange, onAttached }: Props) {
  const { uploadVideo, uploading } = useVideoLibraryAdmin();
  const [mode, setMode] = useState<'link' | 'upload'>('link');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);

  // Reset on close.
  useEffect(() => {
    if (!open) {
      setMode('link');
      setUrl('');
      setFile(null);
      setTitle('');
      setTitleTouched(false);
    }
  }, [open]);

  // Auto-derive title when source changes (until user manually edits).
  useEffect(() => {
    if (titleTouched) return;
    if (mode === 'link' && url.trim()) setTitle(deriveTitleFromUrl(url.trim()));
    if (mode === 'upload' && file) setTitle(deriveTitleFromFile(file.name));
  }, [mode, url, file, titleTouched]);

  const linkValid = useMemo(() => /^https?:\/\/\S+/i.test(url.trim()), [url]);
  const canSubmit =
    title.trim().length > 0 &&
    ((mode === 'link' && linkValid) || (mode === 'upload' && !!file)) &&
    !uploading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    let payload;
    if (mode === 'upload' && file) {
      const v = validateVideoFile(file);
      if (!v.valid) {
        toast({ title: 'Invalid file', description: v.error, variant: 'destructive' });
        return;
      }
      payload = {
        title: title.trim(),
        tags: [] as string[],
        sport: [] as string[],
        videoType: 'upload' as const,
        videoFile: file,
      };
    } else {
      const trimmed = url.trim();
      payload = {
        title: title.trim(),
        tags: [] as string[],
        sport: [] as string[],
        videoType: detectVideoType(trimmed),
        externalUrl: trimmed,
      };
    }

    const result = await uploadVideo(payload);
    if (result?.id) {
      onAttached(result.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Attach a video</DialogTitle>
          <DialogDescription>
            Paste a link or upload a file. You can fill in tags later in the Video Library.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'link' | 'upload')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">
              <LinkIcon className="h-3.5 w-3.5 mr-1.5" /> Paste link
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload file
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-2 mt-4">
            <Label htmlFor="qa-url">Video URL</Label>
            <Input
              id="qa-url"
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            {url.trim() && !linkValid ? (
              <p className="text-xs text-destructive">Must start with http:// or https://</p>
            ) : null}
          </TabsContent>

          <TabsContent value="upload" className="space-y-2 mt-4">
            <Label htmlFor="qa-file">Video file</Label>
            <Input
              id="qa-file"
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <p className="text-xs text-muted-foreground truncate">
                {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
              </p>
            ) : null}
          </TabsContent>
        </Tabs>

        <div className="space-y-2 mt-2">
          <Label htmlFor="qa-title">Title</Label>
          <Input
            id="qa-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleTouched(true);
            }}
            placeholder="Give this video a name"
          />
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Attaching…
              </>
            ) : (
              'Attach'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
