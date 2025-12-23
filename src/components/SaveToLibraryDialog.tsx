import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
import { toast } from 'sonner';
import { BookMarked, Upload, X } from 'lucide-react';

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
  const { t } = useTranslation();
  const [title, setTitle] = useState(`${sport} ${module} - ${new Date().toLocaleDateString()}`);
  const [notes, setNotes] = useState('');
  const [shareWithScouts, setShareWithScouts] = useState(false);
  const [analysisPublic, setAnalysisPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customThumbnail, setCustomThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('saveToLibrary.invalidImageType'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('saveToLibrary.imageTooLarge'));
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

  const handleSave = async () => {
    try {
      setSaving(true);

      let thumbnailData = {
        webpUrl: undefined as string | undefined,
        sizes: undefined as any,
        blurhash: undefined as string | undefined
      };

      if (customThumbnail) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Process and optimize thumbnail
            const processed = await processVideoThumbnail(customThumbnail, 0.1);
            
            // Upload WebP version
            thumbnailData.webpUrl = await uploadOptimizedThumbnail(
              processed.webpBlob,
              user.id,
              videoId,
              'webp'
            );
            
            // Upload multiple sizes
            const sizesData = await uploadThumbnailSizes(processed.sizes, user.id, videoId);
            thumbnailData.sizes = sizesData;
            thumbnailData.blurhash = processed.blurhash;
          }
        } catch (thumbnailError: any) {
          console.error('Error uploading thumbnail:', thumbnailError);
          toast.error(`${t('saveToLibrary.failedToUploadThumbnail')}: ${thumbnailError.message}`);
        }
      }

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

      const updateData: any = { 
        saved_to_library: true,
        session_date: new Date().toISOString()
      };
      
      if (thumbnailData.webpUrl) {
        updateData.thumbnail_webp_url = thumbnailData.webpUrl;
        updateData.thumbnail_sizes = thumbnailData.sizes;
        updateData.blurhash = thumbnailData.blurhash;
        // Keep original thumbnail_url as fallback
        updateData.thumbnail_url = thumbnailData.webpUrl;
      }

      const { error: updateError } = await supabase
        .from('videos')
        .update(updateData)
        .eq('id', videoId);

      if (updateError) throw updateError;

      toast.success(t('saveToLibrary.savedToPlayersClub'));
      onClose();
    } catch (error: any) {
      console.error('Error saving to library:', error);
      toast.error(error.message || t('saveToLibrary.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5" />
            {t('saveToLibrary.title')}
          </DialogTitle>
          <DialogDescription>
            {t('saveToLibrary.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          <div className="space-y-2">
            <Label htmlFor="title">{t('saveToLibrary.sessionTitle')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('saveToLibrary.enterTitle')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('saveToLibrary.notesOptional')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('saveToLibrary.addNotes')}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('saveToLibrary.customCoverImageOptional')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('saveToLibrary.coverImageHelp')}
            </p>
            
            {thumbnailPreview ? (
              <div className="relative">
                <img 
                  src={thumbnailPreview} 
                  alt="Thumbnail preview" 
                  className="w-full h-40 object-cover rounded-md"
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
              <div 
                className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t('saveToLibrary.clickToUpload')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('saveToLibrary.imageFormats')}
                </p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleThumbnailSelect}
              className="hidden"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="share">{t('saveToLibrary.shareWithScouts')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('saveToLibrary.shareDescription')}
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
                <Label htmlFor="analysis-public">{t('saveToLibrary.makeAnalysisPublic')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('saveToLibrary.analysisDescription')}
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
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t('saveToLibrary.uploading') : t('saveToLibrary.uploadToLibrary')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
