import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, ListChecks, SkipForward } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VideoEditForm } from "./VideoEditForm";
import { useVideoLibrary, type LibraryVideo } from "@/hooks/useVideoLibrary";
import { useVideoReadiness, MISSING_LABEL } from "@/hooks/useVideoReadiness";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BackfillQueueDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { videos, tags, refetch } = useVideoLibrary({ limit: 100 });
  const { data: readiness } = useVideoReadiness();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  // Build the queue: incomplete videos in stable order (most-missing first).
  const queue = useMemo<LibraryVideo[]>(() => {
    if (!readiness) return [];
    const incompleteIds = new Set(
      readiness.filter(r => !r.is_ready && !skipped.has(r.video_id)).map(r => r.video_id),
    );
    return videos
      .filter(v => incompleteIds.has(v.id))
      .sort((a, b) => {
        const ra = readiness.find(r => r.video_id === a.id)?.missing_fields.length ?? 0;
        const rb = readiness.find(r => r.video_id === b.id)?.missing_fields.length ?? 0;
        return rb - ra;
      });
  }, [videos, readiness, skipped]);

  // Pick first item when dialog opens or queue changes.
  useEffect(() => {
    if (!open) return;
    if (!activeId || !queue.find(v => v.id === activeId)) {
      setActiveId(queue[0]?.id ?? null);
    }
  }, [open, queue, activeId]);

  // Reset skipped on close
  useEffect(() => {
    if (!open) {
      setSkipped(new Set());
      setActiveId(null);
    }
  }, [open]);

  const activeVideo = queue.find(v => v.id === activeId) || null;
  const activeReadiness = readiness?.find(r => r.video_id === activeId);

  const advance = () => {
    const idx = queue.findIndex(v => v.id === activeId);
    const next = queue[idx + 1] ?? queue.find(v => v.id !== activeId);
    setActiveId(next?.id ?? null);
  };

  const handleSaved = async () => {
    // Refresh both video list and readiness so the queue rebuilds without the saved item.
    await Promise.all([
      refetch(),
      qc.invalidateQueries({ queryKey: ['library-videos-readiness'] }),
    ]);
    advance();
  };

  const handleSkip = () => {
    if (!activeId) return;
    setSkipped(prev => {
      const n = new Set(prev);
      n.add(activeId);
      return n;
    });
    advance();
  };

  const isEmpty = queue.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            Backfill Queue
            <Badge variant="outline" className="text-[10px] ml-1">
              {queue.length} remaining
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Walk through every incomplete video and wire it into the engine. Save to auto-advance.
          </DialogDescription>
        </DialogHeader>

        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="font-semibold">All videos are engine-ready. 🎯</p>
            <p className="text-xs text-muted-foreground">
              Nothing left to backfill. Close this dialog.
            </p>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="mt-2">
              Close
            </Button>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-0">
            {/* Left rail — queue */}
            <ScrollArea className="border-r min-h-0">
              <div className="p-2 space-y-1">
                {queue.map(v => {
                  const r = readiness?.find(x => x.video_id === v.id);
                  const isActive = v.id === activeId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setActiveId(v.id)}
                      className={`w-full text-left rounded-md p-2 transition-colors ${
                        isActive ? 'bg-primary/10 border border-primary/40' : 'hover:bg-muted'
                      }`}
                    >
                      <p className="text-xs font-medium truncate">{v.title}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(r?.missing_fields ?? []).map(f => (
                          <Badge key={f} variant="outline" className="text-[9px] capitalize">
                            {MISSING_LABEL[f] ?? f}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Right pane — editor */}
            <div className="flex flex-col min-h-0">
              {activeVideo ? (
                <>
                  <div className="px-4 py-2 border-b flex items-center justify-between gap-2 bg-muted/30">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Now fixing</p>
                      <p className="text-sm font-semibold truncate">{activeVideo.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="sm" onClick={handleSkip}>
                        <SkipForward className="h-3.5 w-3.5 mr-1" /> Skip
                      </Button>
                      {activeReadiness && (
                        <Badge variant="outline" className="text-[10px]">
                          {activeReadiness.missing_fields.length} missing
                        </Badge>
                      )}
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="p-4">
                      <VideoEditForm
                        key={activeVideo.id}
                        video={activeVideo}
                        tags={tags}
                        onSuccess={handleSaved}
                        onCancel={handleSkip}
                      />
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                  Pick a video from the queue.
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
