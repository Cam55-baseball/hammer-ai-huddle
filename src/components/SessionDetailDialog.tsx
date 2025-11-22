import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uploadOptimizedThumbnail, uploadThumbnailSizes } from '@/lib/uploadHelpers';
import { processVideoThumbnail } from '@/lib/thumbnailHelpers';
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
import { Upload, X } from 'lucide-react';
import { EnhancedVideoPlayer } from '@/components/EnhancedVideoPlayer';

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
  const [analysisPublic, setAnalysisPublic] = useState(session.analysis_public || false);
  const [saving, setSaving] = useState(false);
  const [customThumbnail, setCustomThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WebP image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setCustomThumbnail(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setThumbnailPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveThumbnail = () => {
    setCustomThumbnail(null);
    setThumbnailPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Sync state when session changes
  useEffect(() => {
    setSharedWithScouts(session.shared_with_scouts || false);
    setAnalysisPublic(session.analysis_public || false);
  }, [session.shared_with_scouts, session.analysis_public]);

  const handleToggleShare = async (checked: boolean) => {
    try {
      setSharedWithScouts(checked);
      
      const { error } = await supabase.functions.invoke('update-library-session', {
        body: {
          sessionId: session.id,
          title: session.library_title,
          notes: session.library_notes,
          sharedWithScouts: checked,
        },
      });

      if (error) throw error;

      toast.success(checked ? 'Shared with scouts' : 'Unshared from scouts');
      onUpdate();
    } catch (error: any) {
      console.error('Error toggling share:', error);
      toast.error(error.message || 'Failed to update sharing');
      // Revert on error
      setSharedWithScouts(!checked);
    }
  };

  const handleToggleAnalysisPublic = async (checked: boolean) => {
    try {
      setAnalysisPublic(checked);
      
      const { error } = await supabase.functions.invoke('update-library-session', {
        body: {
          sessionId: session.id,
          title: session.library_title,
          notes: session.library_notes,
          sharedWithScouts: session.shared_with_scouts,
          analysisPublic: checked,
        },
      });

      if (error) throw error;

      toast.success(checked ? 'Analysis is now public' : 'Analysis is now private');
      onUpdate();
    } catch (error: any) {
      console.error('Error toggling analysis visibility:', error);
      toast.error(error.message || 'Failed to update analysis visibility');
      // Revert on error
      setAnalysisPublic(!checked);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Get authenticated user for thumbnail upload
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw userError || new Error('You must be signed in to update sessions.');
      }

      let thumbnailData = {
        webpUrl: undefined as string | undefined,
        sizes: undefined as any,
        blurhash: undefined as string | undefined
      };

      if (customThumbnail) {
        try {
          // Process and optimize thumbnail
          const processed = await processVideoThumbnail(customThumbnail, 0.1);
          
          // Upload WebP version
          thumbnailData.webpUrl = await uploadOptimizedThumbnail(
            processed.webpBlob,
            user.id,
            session.id,
            'webp'
          );
          
          // Upload multiple sizes
          const sizesData = await uploadThumbnailSizes(processed.sizes, user.id, session.id);
          thumbnailData.sizes = sizesData;
          thumbnailData.blurhash = processed.blurhash;
        } catch (thumbnailError: any) {
          console.error('Error uploading thumbnail:', thumbnailError);
          toast.error(`Failed to upload thumbnail: ${thumbnailError.message}`);
        }
      }

      const { error } = await supabase.functions.invoke('update-library-session', {
        body: {
          sessionId: session.id,
          title,
          notes,
          sharedWithScouts,
        },
      });

      if (error) throw error;

      if (thumbnailData.webpUrl) {
        const updateData: any = {
          thumbnail_webp_url: thumbnailData.webpUrl,
          thumbnail_sizes: thumbnailData.sizes,
          blurhash: thumbnailData.blurhash,
          thumbnail_url: thumbnailData.webpUrl
        };

        const { error: thumbnailError } = await supabase
          .from('videos')
          .update(updateData)
          .eq('id', session.id)
          .eq('user_id', user.id);

        if (thumbnailError) throw thumbnailError;
      }

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
      <DialogContent className="max-w-full sm:max-w-[90vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto p-3 sm:p-6 overflow-x-hidden">
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

        <div className="space-y-3 sm:space-y-4">
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

          {/* Thumbnail Upload in Edit Mode */}
          {isEditing && isOwner && (
            <div className="space-y-2">
              <Label>Update Cover Image</Label>
              <p className="text-xs text-muted-foreground">
                Upload a new cover image for this session
              </p>
              
              {thumbnailPreview ? (
                <div className="relative">
                  <img 
                    src={thumbnailPreview} 
                    alt="New thumbnail" 
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveThumbnail}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New Thumbnail
                </Button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleThumbnailSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Share Toggle (only for owners) */}
          {isOwner && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="share-toggle">Share with scouts</Label>
                <Switch
                  id="share-toggle"
                  checked={sharedWithScouts}
                  onCheckedChange={handleToggleShare}
                />
              </div>
              
              {sharedWithScouts && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="analysis-public-toggle">Make analysis public</Label>
                  <Switch
                    id="analysis-public-toggle"
                    checked={analysisPublic}
                    onCheckedChange={handleToggleAnalysisPublic}
                  />
                </div>
              )}
            </>
          )}

          <Separator />

          {/* AI Analysis - hide from scouts if analysis is private */}
          {aiAnalysis && (isOwner || analysisPublic) && (
            <div className="space-y-4">
              <h3 className="font-semibold">Analysis Results</h3>
              
              {aiAnalysis.feedback && (
                <div className="space-y-2">
                  <Label>Feedback</Label>
                  <p className="text-sm">{aiAnalysis.feedback}</p>
                </div>
              )}

              {aiAnalysis.drills && aiAnalysis.drills.length > 0 && (
                <div className="space-y-3">
                  <Label>Recommended Drills</Label>
                  <div className="space-y-4">
                    {aiAnalysis.drills.map((drill: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <h4 className="font-semibold">{drill.title}</h4>
                        {drill.purpose && (
                          <p className="text-sm text-muted-foreground">{drill.purpose}</p>
                        )}
                        
                        {drill.steps && drill.steps.length > 0 && (
                          <div className="space-y-1">
                            <Label className="text-xs">Steps:</Label>
                            <ol className="list-decimal list-inside text-sm space-y-1">
                              {drill.steps.map((step: string, i: number) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                        
                        {drill.cues && drill.cues.length > 0 && (
                          <div className="space-y-1">
                            <Label className="text-xs">Coaching Cues:</Label>
                            <ul className="list-disc list-inside text-sm space-y-1">
                              {drill.cues.map((cue: string, i: number) => (
                                <li key={i}>{cue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          {drill.equipment && <span>Equipment: {drill.equipment}</span>}
                          {drill.reps_sets && <span>Reps/Sets: {drill.reps_sets}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Show privacy message if analysis exists but is private for scouts */}
          {aiAnalysis && !isOwner && !analysisPublic && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground text-center">
                The player has chosen to keep the analysis private
              </p>
            </div>
          )}

          <Separator />

          {/* Video Preview */}
          {session.video_url && (
            <div className="space-y-2">
              <Label>Video</Label>
              <EnhancedVideoPlayer
                videoSrc={session.video_url}
                playbackRate={1}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col xs:flex-row gap-2 justify-end">
            {isOwner && (
              <>
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="w-full xs:w-auto">
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="w-full xs:w-auto">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)} className="w-full xs:w-auto">
                    Edit Session
                  </Button>
                )}
              </>
            )}
            <Button variant="outline" onClick={onClose} className="w-full xs:w-auto">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}