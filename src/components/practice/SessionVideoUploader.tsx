import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Video, X, Film, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateVideoFile } from '@/data/videoLimits';
import { isAnalyzableModule, RepVideoAnalysis } from './RepVideoAnalysis';
import type { ScoredRep } from './RepScorer';

interface LocalVideo {
  id: string;
  file: File;
  previewUrl: string;
  uploading: boolean;
  uploaded: boolean;
  storagePath?: string;
  taggedRepIndexes: number[];
  repNotes: string;
}

interface SessionVideoUploaderProps {
  reps: ScoredRep[];
  sessionId?: string;
  readOnly?: boolean;
  module?: string;
}

const ANALYSIS_LABELS: Record<string, string> = {
  hitting: 'Analyze Hitting Mechanics',
  pitching: 'Analyze Pitching Mechanics',
  throwing: 'Analyze Throwing Mechanics',
  fielding: 'Analyze Throw Mechanics',
  
};

export function SessionVideoUploader({ reps, sessionId, readOnly, module }: SessionVideoUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videos, setVideos] = useState<LocalVideo[]>([]);
  const [taggingVideoId, setTaggingVideoId] = useState<string | null>(null);
  const [analyzeState, setAnalyzeState] = useState<{ videoUrl: string; repIndex: number } | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newVideos: LocalVideo[] = [];
    for (const file of Array.from(files)) {
      const validation = validateVideoFile(file);
      if (!validation.valid) {
        toast({ title: 'Invalid file', description: validation.error, variant: 'destructive' });
        continue;
      }
      newVideos.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        uploading: false,
        uploaded: false,
        taggedRepIndexes: [],
        repNotes: '',
      });
    }
    setVideos(prev => [...prev, ...newVideos]);
    e.target.value = '';
  }, [toast]);

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

  const updateRepNotes = useCallback((videoId: string, notes: string) => {
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, repNotes: notes } : v));
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
        metadata: { notes: video.repNotes || undefined },
      });
      if (dbError) {
        toast({ title: 'Save failed', description: dbError.message, variant: 'destructive' });
      }
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, uploading: false, uploaded: true, storagePath: path } : v));
    }
  }, [videos, user, toast]);

  const [lastUploadedSessionId, setLastUploadedSessionId] = useState<string | null>(null);
  if (sessionId && sessionId !== lastUploadedSessionId && videos.some(v => !v.uploaded)) {
    setLastUploadedSessionId(sessionId);
    uploadAllVideos(sessionId);
  }

  const canAnalyze = module ? isAnalyzableModule(module) : false;
  const analyzeLabel = module ? (ANALYSIS_LABELS[module] || 'Analyze Mechanics') : 'Analyze Mechanics';

  if (readOnly) return null;

  const taggingVideo = videos.find(v => v.id === taggingVideoId);

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
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

      {/* Tabbed rep tagging panel */}
      {taggingVideoId && reps.length > 0 && taggingVideo && (
        <Card className="border-primary/20">
          <CardContent className="py-3 space-y-2">
            <Tabs defaultValue="tags">
              <TabsList className="h-8 w-full">
                <TabsTrigger value="tags" className="text-xs flex-1">Tags</TabsTrigger>
                <TabsTrigger value="notes" className="text-xs flex-1">Notes</TabsTrigger>
                {canAnalyze && (
                  <TabsTrigger value="analyze" className="text-xs flex-1">Analyze</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="tags" className="mt-2">
                <Label className="text-xs text-muted-foreground">Tag reps to this video</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {reps.map((_, i) => {
                    const isTagged = taggingVideo.taggedRepIndexes.includes(i);
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
              </TabsContent>

              <TabsContent value="notes" className="mt-2">
                <Label className="text-xs text-muted-foreground">Rep notes</Label>
                <Textarea
                  value={taggingVideo.repNotes}
                  onChange={e => updateRepNotes(taggingVideoId, e.target.value)}
                  placeholder="Add notes about this rep..."
                  className="mt-1.5 text-xs min-h-[60px]"
                />
              </TabsContent>

              {canAnalyze && (
                <TabsContent value="analyze" className="mt-2">
                  <Label className="text-xs text-muted-foreground">Video Analysis</Label>
                  <div className="mt-1.5 space-y-2">
                    {taggingVideo.taggedRepIndexes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Tag at least one rep first to analyze.</p>
                    ) : (
                      taggingVideo.taggedRepIndexes.map(repIdx => (
                        <Button
                          key={repIdx}
                          variant="outline"
                          size="sm"
                          className="w-full text-xs justify-start gap-2"
                          onClick={() => setAnalyzeState({ videoUrl: taggingVideo.previewUrl, repIndex: repIdx })}
                        >
                          Rep #{repIdx + 1} — {analyzeLabel}
                        </Button>
                      ))
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
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

      {/* Analysis dialog */}
      {analyzeState && module && (
        <RepVideoAnalysis
          videoUrl={analyzeState.videoUrl}
          module={module}
          repIndex={analyzeState.repIndex}
          open={!!analyzeState}
          onOpenChange={(open) => !open && setAnalyzeState(null)}
        />
      )}
    </div>
  );
}