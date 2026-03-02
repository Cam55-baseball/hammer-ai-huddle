import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { History, RotateCcw, Loader2, User, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CardVersion {
  id: string;
  version_number: number;
  edited_by: string;
  editor_role: string;
  snapshot_json: any;
  created_at: string;
  editor_name?: string;
}

interface CardVersionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderItemId: string;
  itemTitle: string;
  onRestore: (snapshot: any) => Promise<void>;
}

export function CardVersionHistory({ open, onOpenChange, folderItemId, itemTitle, onRestore }: CardVersionHistoryProps) {
  const { user } = useAuth();
  const [versions, setVersions] = useState<CardVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState<CardVersion | null>(null);

  useEffect(() => {
    if (!open || !folderItemId) return;
    const fetchVersions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('activity_card_versions')
          .select('*')
          .eq('folder_item_id', folderItemId)
          .order('version_number', { ascending: false });

        if (error) throw error;

        // Fetch editor names
        const editorIds = [...new Set((data || []).map(v => v.edited_by))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', editorIds);

        const nameMap: Record<string, string> = {};
        (profiles || []).forEach(p => { nameMap[p.id] = p.full_name || 'Unknown'; });

        setVersions((data || []).map(v => ({
          ...v,
          editor_name: nameMap[v.edited_by] || 'Unknown',
        })));
      } catch (err) {
        console.error('Error fetching versions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVersions();
  }, [open, folderItemId]);

  const handleRestore = async (version: CardVersion) => {
    setRestoring(version.id);
    try {
      await onRestore(version.snapshot_json);
      toast.success(`Restored to version ${version.version_number}`);
      onOpenChange(false);
    } catch (err) {
      console.error('Error restoring version:', err);
      toast.error('Failed to restore version');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Version History
          </DialogTitle>
          <p className="text-xs text-muted-foreground truncate">{itemTitle}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No version history yet</p>
            <p className="text-xs">Versions are created each time the card is edited.</p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-2">
              {versions.map((v, idx) => (
                <div key={v.id} className="p-3 rounded-lg border space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={idx === 0 ? 'default' : 'outline'} className="text-[10px]">
                        v{v.version_number}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs">
                        {v.editor_role === 'coach' ? (
                          <GraduationCap className="h-3 w-3 text-primary" />
                        ) : (
                          <User className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="font-medium">{v.editor_name}</span>
                      </div>
                    </div>
                    {idx > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1"
                        disabled={restoring === v.id}
                        onClick={() => handleRestore(v)}
                      >
                        {restoring === v.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        Restore
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(v.created_at), 'MMM d, yyyy h:mm a')}
                  </p>

                  {/* Preview toggle */}
                  <button
                    onClick={() => setPreviewVersion(previewVersion?.id === v.id ? null : v)}
                    className="text-[10px] text-primary hover:underline"
                  >
                    {previewVersion?.id === v.id ? 'Hide preview' : 'Preview snapshot'}
                  </button>

                  {previewVersion?.id === v.id && (
                    <div className="mt-1 p-2 rounded bg-muted/50 text-xs space-y-0.5 max-h-40 overflow-y-auto">
                      <p><span className="font-medium">Title:</span> {v.snapshot_json?.title}</p>
                      {v.snapshot_json?.description && (
                        <p><span className="font-medium">Description:</span> {v.snapshot_json.description}</p>
                      )}
                      {v.snapshot_json?.item_type && (
                        <p><span className="font-medium">Type:</span> {v.snapshot_json.item_type}</p>
                      )}
                      {v.snapshot_json?.duration_minutes && (
                        <p><span className="font-medium">Duration:</span> {v.snapshot_json.duration_minutes}min</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
