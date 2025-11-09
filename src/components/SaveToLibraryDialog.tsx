import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { BookMarked } from 'lucide-react';

interface SaveToLibraryDialogProps {
  open: boolean;
  onClose: () => void;
  videoId: string;
  sport: string;
  module: string;
}

export function SaveToLibraryDialog({
  open,
  onClose,
  videoId,
  sport,
  module,
}: SaveToLibraryDialogProps) {
  const [title, setTitle] = useState(`${sport} ${module} - ${new Date().toLocaleDateString()}`);
  const [notes, setNotes] = useState('');
  const [shareWithScouts, setShareWithScouts] = useState(false);
  const [analysisPublic, setAnalysisPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase.functions.invoke('update-library-session', {
        body: {
          sessionId: videoId,
          title,
          notes,
          sharedWithScouts: shareWithScouts,
          analysisPublic: analysisPublic,
        },
      });

      if (error) throw error;

      // Also update the saved_to_library flag
      const { error: updateError } = await supabase
        .from('videos')
        .update({ 
          saved_to_library: true,
          session_date: new Date().toISOString()
        })
        .eq('id', videoId);

      if (updateError) throw updateError;

      toast.success('Session saved to Players Club!');
      onClose();
    } catch (error: any) {
      console.error('Error saving to library:', error);
      toast.error(error.message || 'Failed to save session');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5" />
            Save to Players Club
          </DialogTitle>
          <DialogDescription>
            Add this session to your personal training library
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Session Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this session..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this session..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="share">Share with Scouts</Label>
              <p className="text-sm text-muted-foreground">
                Allow scouts who follow you to view this session
              </p>
            </div>
            <Switch
              id="share"
              checked={shareWithScouts}
              onCheckedChange={setShareWithScouts}
            />
          </div>

          {shareWithScouts && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-0.5">
                <Label htmlFor="analysis-public">Make analysis public?</Label>
                <p className="text-sm text-muted-foreground">
                  Allow scouts to view the AI analysis and feedback
                </p>
              </div>
              <Switch
                id="analysis-public"
                checked={analysisPublic}
                onCheckedChange={setAnalysisPublic}
              />
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Uploading...' : 'Upload to Library'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}