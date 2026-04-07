import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useVault } from '@/hooks/useVault';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { NotebookPen } from 'lucide-react';

interface QuickNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickNoteDialog({ open, onOpenChange }: QuickNoteDialogProps) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const { saveFreeNote } = useVault();
  const { t } = useTranslation();

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    const result = await saveFreeNote(content.trim());
    setSaving(false);
    if (result.success) {
      toast.success('Note saved to Vault');
      setContent('');
    } else {
      toast.error('Failed to save note');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5 text-primary" />
            Quick Note
          </DialogTitle>
          <DialogDescription>
            Jot down a thought — it'll be saved to your Vault.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="min-h-[120px] resize-y"
          autoFocus
        />
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!content.trim() || saving}>
            {saving ? 'Saving...' : 'Save Note'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
