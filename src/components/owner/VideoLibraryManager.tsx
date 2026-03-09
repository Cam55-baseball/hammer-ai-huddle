import { useState, useEffect } from "react";
import { Plus, Trash2, Edit, BarChart3, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoUploadForm } from "./VideoUploadForm";
import { TagManager } from "./TagManager";
import { VideoAnalytics } from "./VideoAnalytics";
import { useVideoLibrary, type LibraryVideo } from "@/hooks/useVideoLibrary";
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

export function VideoLibraryManager() {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { videos, tags, refetch } = useVideoLibrary({ limit: 100 });
  const { deleteVideo } = useVideoLibraryAdmin();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deleteVideo(deleteTarget);
    if (ok) refetch();
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="videos">
        <TabsList>
          <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
          <TabsTrigger value="upload">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Video
          </TabsTrigger>
          <TabsTrigger value="tags">
            <Tags className="h-3.5 w-3.5 mr-1" /> Tags
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-3.5 w-3.5 mr-1" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-3 mt-4">
          {videos.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <p>No videos yet. Add your first video to get started.</p>
              <Button className="mt-3" onClick={() => setShowUploadForm(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Video
              </Button>
            </Card>
          ) : (
            videos.map(video => (
              <Card key={video.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-sm truncate">{video.title}</h4>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(video.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <VideoUploadForm tags={tags} onSuccess={() => refetch()} />
        </TabsContent>

        <TabsContent value="tags" className="mt-4">
          <TagManager tags={tags} onRefresh={() => refetch()} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <VideoAnalytics />
        </TabsContent>
      </Tabs>

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
    </div>
  );
}
