import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Video, Upload, X, Film, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScoredRep } from './RepScorer';

interface LocalVideo {
  id: string;
  file: File;
  previewUrl: string;
  uploading: boolean;
  uploaded: boolean;
  storagePath?: string;
  taggedRepIndexes: number[];
}

interface SessionVideoUploaderProps {
  reps: ScoredRep[];
  sessionId?: string;
  readOnly?: boolean;
}

export function SessionVideoUploader({ reps, sessionId, readOnly }: SessionVideoUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videos, setVideos] = useState<LocalVideo[]>([]);
  const [taggingVideoId, setTaggingVideoId] = useState<string | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newVideos: LocalVideo[] = Array.from(files).map(file => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: false,
      uploaded: false,
      taggedRepIndexes: [],
    }));
    setVideos(prev => [...prev, ...newVideos]);
    e.target.value = '';
  }, []);

  const removeVideo = useCallback((id: string) => {
    setVideos(prev => {
      const v = prev.find(x => x.id === id);
      if (v) URL.revokeObjectURL(v.previewUrl);
      return prev.filter(x => x.id !== id);
    });
    if (taggingVideoId === id) setTaggingVideoId(null);
  }, [taggingVideoId]);

  const toggleRepTag = useCallback((videoId: string, repIndex: number) => {
    setVideos(prev => prev.map(v => {
      if (v.id !== videoId) return v;
      const tags = v.taggedRepIndexes.includes(repIndex)
        ? v.taggedRepIndexes.filter(i => i !== repIndex)
        : [...v.taggedRepIndexes, repIndex];
      return { ...v, taggedRepIndexes: tags };
    }));
  }, []);

  const uploadAllVideos = useCallback(async (sid: string) => {
    if (!user) return;
    const toUpload = videos.filter(v => !v.uploaded);
    for (const video of toUpload) {
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, uploading: true } : v));
      const ext = video.file.name.split('.').pop() || 'mp4';
      const path = `session-clips/${user.id}/${sid}/${video.id}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('videos').upload(path, video.file);
      if (uploadError) {
        toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
        setVideos(prev => prev.map(v => v.id === video.id ? { ...v, uploading: false } : v));
        continue;
      }
      const { error: dbError } = await supabase.from('session_videos' as any).insert({
        user_id: user.id,
        session_id: sid,
        storage_path: path,
        filename: video.file.name,
        tagged_rep_indexes: video.taggedRepIndexes,
        metadata: {},
      });
      if (dbError) {
        toast({ title: 'Save failed', description: dbError.message, variant: 'destructive' });
      }
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, uploading: false, uploaded: true, storagePath: path } : v));
    }
  }, [videos, user, toast]);

  // Expose upload function for parent to call after session save
  // We use a ref-based approach — parent calls this via ref or we auto-upload on sessionId change
  // For simplicity, auto-upload when sessionId becomes available
  const [lastUploadedSessionId, setLastUploadedSessionId] = useState<string | null>(null);
  if (sessionId && sessionId !== lastUploadedSessionId && videos.some(v => !v.uploaded)) {
    setLastUploadedSessionId(sessionId);
    uploadAllVideos(sessionId);
  }

  if (readOnly) return null;

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Video strip */}
      {videos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {videos.map(v => (
            <div key={v.id} className="relative shrink-0 w-20 h-14 rounded-md overflow-hidden border border-border bg-muted/30">
              <video src={v.previewUrl} className="w-full h-full object-cover" muted />
              {v.uploading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              )}
              {v.uploaded && (
                <div className="absolute top-0.5 right-0.5">
                  <Badge variant="secondary" className="text-[8px] px-1 py-0">✓</Badge>
                </div>
              )}
              {!v.uploaded && !v.uploading && (
                <button
                  onClick={() => removeVideo(v.id)}
                  className="absolute top-0.5 right-0.5 bg-destructive/80 rounded-full p-0.5"
                >
                  <X className="h-2.5 w-2.5 text-destructive-foreground" />
                </button>
              )}
              {/* Tag button */}
              {reps.length > 0 && !v.uploaded && (
                <button
                  onClick={() => setTaggingVideoId(taggingVideoId === v.id ? null : v.id)}
                  className={cn(
                    'absolute bottom-0.5 left-0.5 rounded px-1 py-0.5 text-[7px] font-medium',
                    v.taggedRepIndexes.length > 0
                      ? 'bg-primary/80 text-primary-foreground'
                      : 'bg-muted/80 text-muted-foreground'
                  )}
                >
                  {v.taggedRepIndexes.length > 0 ? `${v.taggedRepIndexes.length} reps` : 'Tag'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rep tagging panel */}
      {taggingVideoId && reps.length > 0 && (
        <Card className="border-primary/20">
          <CardContent className="py-3 space-y-2">
            <Label className="text-xs text-muted-foreground">Tag reps to this video</Label>
            <div className="flex flex-wrap gap-2">
              {reps.map((_, i) => {
                const vid = videos.find(v => v.id === taggingVideoId);
                const isTagged = vid?.taggedRepIndexes.includes(i) ?? false;
                return (
                  <label key={i} className="flex items-center gap-1 cursor-pointer">
                    <Checkbox
                      checked={isTagged}
                      onCheckedChange={() => toggleRepTag(taggingVideoId, i)}
                    />
                    <span className="text-xs">#{i + 1}</span>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add video button */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs gap-1.5"
        >
          <Video className="h-3.5 w-3.5" />
          Add Video
        </Button>
        {videos.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            <Film className="h-3 w-3 mr-1" />
            {videos.length} clip{videos.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    </div>
  );
}
