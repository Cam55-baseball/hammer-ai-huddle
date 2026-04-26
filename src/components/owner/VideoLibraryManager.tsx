import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, BarChart3, Tags, Network, GitBranch, Sparkles, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { AISuggestionsReview } from "./AISuggestionsReview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoUploadWizard } from "./VideoUploadWizard";
import { VideoEditForm } from "./VideoEditForm";
import { TagManager } from "./TagManager";
import { VideoAnalytics } from "./VideoAnalytics";
import { TaxonomyManager } from "./TaxonomyManager";
import { RuleEngineManager } from "./RuleEngineManager";
import { LibraryHealthStrip } from "./LibraryHealthStrip";
import { VideoLibraryHelpSheet } from "./VideoLibraryHelpSheet";
import { BackfillQueueDialog } from "./BackfillQueueDialog";
import { useVideoLibrary, type LibraryVideo } from "@/hooks/useVideoLibrary";
import { useVideoReadiness, readinessByVideoId, MISSING_LABEL, type VideoReadiness } from "@/hooks/useVideoReadiness";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVideoLibraryAdmin } from "@/hooks/useVideoLibraryAdmin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";

function ReadinessBadge({ r }: { r?: VideoReadiness }) {
  if (!r) return null;
  if (r.is_ready) {
    return (
      <Badge className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20">
        <CheckCircle2 className="h-3 w-3" /> Ready
      </Badge>
    );
  }
  if (r.missing_fields.length === 4) {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-destructive/40 text-destructive">
        <AlertCircle className="h-3 w-3" /> Empty
      </Badge>
    );
  }
  const labels = r.missing_fields.map(f => MISSING_LABEL[f] ?? f).join(', ');
  return (
    <Badge
      variant="outline"
      className="text-[10px] gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400"
      title={`Missing: ${labels}`}
    >
      <AlertTriangle className="h-3 w-3" /> Incomplete
    </Badge>
  );
}

export function VideoLibraryManager() {
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<LibraryVideo | null>(null);
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [confirmCloseEdit, setConfirmCloseEdit] = useState(false);

  const { videos, tags, refetch } = useVideoLibrary({ limit: 100 });
  const { data: readinessRows } = useVideoReadiness();
  const { deleteVideo } = useVideoLibraryAdmin();

  const readinessMap = useMemo(() => readinessByVideoId(readinessRows), [readinessRows]);

  const visibleVideos = useMemo(() => {
    if (!showOnlyIncomplete) return videos;
    return videos.filter(v => {
      const r = readinessMap.get(v.id);
      return r && !r.is_ready;
    });
  }, [videos, showOnlyIncomplete, readinessMap]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deleteVideo(deleteTarget);
    if (ok) {
      refetch();
      qc.invalidateQueries({ queryKey: ['library-videos-readiness'] });
    }
    setDeleteTarget(null);
  };

  const handleEditSuccess = () => {
    setEditTarget(null);
    refetch();
    qc.invalidateQueries({ queryKey: ['library-videos-readiness'] });
  };

  const handleEditClose = () => {
    // Hard rule: if the open video is still not ready, confirm before closing.
    const r = editTarget ? readinessMap.get(editTarget.id) : null;
    if (editTarget && r && !r.is_ready) {
      setConfirmCloseEdit(true);
      return;
    }
    setEditTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Video Library</h2>
        <VideoLibraryHelpSheet />
      </div>

      <LibraryHealthStrip
        onBackfill={() => setBackfillOpen(true)}
        onFilterIncomplete={() => setShowOnlyIncomplete(s => !s)}
        filterActive={showOnlyIncomplete}
      />

      <Tabs defaultValue="videos">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="videos">Videos ({visibleVideos.length}{showOnlyIncomplete ? ` / ${videos.length}` : ''})</TabsTrigger>
          <TabsTrigger value="upload"><Plus className="h-3.5 w-3.5 mr-1" /> Add</TabsTrigger>
          <TabsTrigger value="tags"><Tags className="h-3.5 w-3.5 mr-1" /> Tags</TabsTrigger>
          <TabsTrigger value="taxonomy"><Network className="h-3.5 w-3.5 mr-1" /> Taxonomy</TabsTrigger>
          <TabsTrigger value="rules"><GitBranch className="h-3.5 w-3.5 mr-1" /> Rules</TabsTrigger>
          <TabsTrigger value="ai"><Sparkles className="h-3.5 w-3.5 mr-1" /> AI Suggestions</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-3 mt-4">
          {visibleVideos.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              {showOnlyIncomplete ? (
                <p>All videos are engine-ready. Toggle the filter to see them all.</p>
              ) : (
                <>
                  <p>No videos yet. Add your first video to get started.</p>
                  <Button className="mt-3" onClick={() => document.querySelector<HTMLButtonElement>('[data-value="upload"]')?.click()}>
                    <Plus className="h-4 w-4 mr-2" /> Add Video
                  </Button>
                </>
              )}
            </Card>
          ) : (
            visibleVideos.map(video => {
              const r = readinessMap.get(video.id);
              return (
                <Card key={video.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm truncate">{video.title}</h4>
                        <ReadinessBadge r={r} />
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{video.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {video.sport.map(s => (
                          <Badge key={s} variant="default" className="text-[10px] capitalize">{s}</Badge>
                        ))}
                        {video.tags.slice(0, 5).map(t => (
                          <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        <span>❤️ {video.likes_count}</span>
                        <span>Type: {video.video_type}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditTarget(video)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(video.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <VideoUploadWizard tags={tags} onSuccess={() => {
            refetch();
            qc.invalidateQueries({ queryKey: ['library-videos-readiness'] });
          }} />
        </TabsContent>

        <TabsContent value="tags" className="mt-4">
          <TagManager tags={tags} onRefresh={() => refetch()} />
        </TabsContent>

        <TabsContent value="taxonomy" className="mt-4">
          <TaxonomyManager />
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <RuleEngineManager />
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <AISuggestionsReview />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <VideoAnalytics />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) handleEditClose(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <VideoEditForm
              video={editTarget}
              tags={tags}
              onSuccess={handleEditSuccess}
              onCancel={handleEditClose}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm leaving incomplete */}
      <AlertDialog open={confirmCloseEdit} onOpenChange={setConfirmCloseEdit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave video incomplete?</AlertDialogTitle>
            <AlertDialogDescription>
              This video is still missing engine fields. It won't be recommended to athletes until it's ready.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmCloseEdit(false); setEditTarget(null); }}>
              Leave anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this video and all associated likes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BackfillQueueDialog open={backfillOpen} onOpenChange={setBackfillOpen} />
    </div>
  );
}
