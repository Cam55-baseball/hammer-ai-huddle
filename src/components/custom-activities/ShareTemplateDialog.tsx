import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CustomActivityTemplate } from '@/types/customActivity';
import { toast } from 'sonner';
import { Copy, Check, Share2, Link2, ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: CustomActivityTemplate | null;
}

interface ShareData {
  id: string;
  share_code: string;
  is_public: boolean;
  view_count: number;
  created_at: string;
}

export function ShareTemplateDialog({ open, onOpenChange, template }: ShareTemplateDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchExistingShare = async () => {
      if (!template || !user) return;
      
      const { data, error } = await supabase
        .from('shared_activity_templates')
        .select('*')
        .eq('template_id', template.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setShareData(data as ShareData);
      } else {
        setShareData(null);
      }
    };

    if (open && template) {
      fetchExistingShare();
    }
  }, [open, template, user]);

  const generateShareCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createShare = async () => {
    if (!template || !user) return;
    setLoading(true);

    try {
      const shareCode = generateShareCode();
      const { data, error } = await supabase
        .from('shared_activity_templates')
        .insert({
          template_id: template.id,
          user_id: user.id,
          share_code: shareCode,
          is_public: true,
        })
        .select()
        .single();

      if (error) throw error;
      setShareData(data as ShareData);
      toast.success(t('share.created', 'Share link created!'));
    } catch (error) {
      console.error('Error creating share:', error);
      toast.error(t('share.error', 'Failed to create share link'));
    } finally {
      setLoading(false);
    }
  };

  const deleteShare = async () => {
    if (!shareData) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('shared_activity_templates')
        .delete()
        .eq('id', shareData.id);

      if (error) throw error;
      setShareData(null);
      toast.success(t('share.deleted', 'Share link deleted'));
    } catch (error) {
      console.error('Error deleting share:', error);
      toast.error(t('share.deleteError', 'Failed to delete share link'));
    } finally {
      setLoading(false);
    }
  };

  const togglePublic = async () => {
    if (!shareData) return;

    try {
      const { error } = await supabase
        .from('shared_activity_templates')
        .update({ is_public: !shareData.is_public })
        .eq('id', shareData.id);

      if (error) throw error;
      setShareData({ ...shareData, is_public: !shareData.is_public });
    } catch (error) {
      console.error('Error toggling public:', error);
    }
  };

  const shareUrl = shareData 
    ? `${window.location.origin}/shared-activity/${shareData.share_code}`
    : '';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(t('share.copied', 'Link copied to clipboard!'));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(t('share.copyError', 'Failed to copy link'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {t('share.title', 'Share Template')}
          </DialogTitle>
          <DialogDescription>
            {template?.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {!shareData ? (
            <div className="text-center py-6">
              <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {t('share.noLink', 'Create a shareable link for this template')}
              </p>
              <Button onClick={createShare} disabled={loading} className="gap-2">
                <Share2 className="h-4 w-4" />
                {loading ? t('share.creating', 'Creating...') : t('share.createLink', 'Create Share Link')}
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>{t('share.link', 'Share Link')}</Label>
                <div className="flex items-center gap-2">
                  <Input value={shareUrl} readOnly className="font-mono text-sm" />
                  <Button size="icon" variant="outline" onClick={copyToClipboard}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div>
                  <Label className="font-medium">{t('share.public', 'Public Access')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {shareData.is_public 
                      ? t('share.publicDesc', 'Anyone with the link can view and import')
                      : t('share.privateDesc', 'Link is currently disabled')}
                  </p>
                </div>
                <Switch checked={shareData.is_public} onCheckedChange={togglePublic} />
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{t('share.views', 'Views')}: {shareData.view_count}</span>
                <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={deleteShare}>
                  <Trash2 className="h-3 w-3" />
                  {t('share.delete', 'Delete Link')}
                </Button>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 gap-2" asChild>
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    {t('share.preview', 'Preview')}
                  </a>
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
