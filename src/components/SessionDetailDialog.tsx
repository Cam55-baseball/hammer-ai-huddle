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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface SessionDetailDialogProps {
  session: any;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  isOwner: boolean;
}

export function SessionDetailDialog({
  session,
  open,
  onClose,
  onUpdate,
  isOwner,
}: SessionDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(session.library_title || '');
  const [notes, setNotes] = useState(session.library_notes || '');
  const [sharedWithScouts, setSharedWithScouts] = useState(session.shared_with_scouts || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase.functions.invoke('update-library-session', {
        body: {
          sessionId: session.id,
          title,
          notes,
          sharedWithScouts,
        },
      });

      if (error) throw error;

      toast.success('Session updated successfully');
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating session:', error);
      toast.error(error.message || 'Failed to update session');
    } finally {
      setSaving(false);
    }
  };

  const aiAnalysis = session.ai_analysis;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Session title..."
              />
            ) : (
              session.library_title || `${session.sport} ${session.module} Session`
            )}
          </DialogTitle>
          <DialogDescription>
            {new Date(session.session_date).toLocaleDateString()} • {session.sport} • {session.module}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">{session.sport}</Badge>
            <Badge variant="outline">{session.module}</Badge>
            {session.efficiency_score !== undefined && (
              <Badge>Efficiency: {session.efficiency_score}%</Badge>
            )}
            {session.shared_with_scouts && (
              <Badge variant="secondary">Shared with Scouts</Badge>
            )}
          </div>

          <Separator />

          {/* Notes Section */}
          <div className="space-y-2">
            <Label>Notes</Label>
            {isEditing ? (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this session..."
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {session.library_notes || 'No notes added'}
              </p>
            )}
          </div>

          {/* Share Toggle (only for owners) */}
          {isOwner && (
            <div className="flex items-center justify-between">
              <Label htmlFor="share-toggle">Share with scouts</Label>
              <Switch
                id="share-toggle"
                checked={sharedWithScouts}
                onCheckedChange={setSharedWithScouts}
                disabled={!isEditing}
              />
            </div>
          )}

          <Separator />

          {/* AI Analysis */}
          {aiAnalysis && (
            <div className="space-y-4">
              <h3 className="font-semibold">Analysis Results</h3>
              
              {aiAnalysis.feedback && (
                <div className="space-y-2">
                  <Label>Feedback</Label>
                  <p className="text-sm">{aiAnalysis.feedback}</p>
                </div>
              )}

              {aiAnalysis.drills && aiAnalysis.drills.length > 0 && (
                <div className="space-y-2">
                  <Label>Recommended Drills</Label>
                  <ul className="list-disc list-inside space-y-1">
                    {aiAnalysis.drills.map((drill: string, index: number) => (
                      <li key={index} className="text-sm">{drill}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Video Preview */}
          {session.video_url && (
            <div className="space-y-2">
              <Label>Video</Label>
              <video
                src={session.video_url}
                controls
                className="w-full rounded-md"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            {isOwner && (
              <>
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>
                    Edit Session
                  </Button>
                )}
              </>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}