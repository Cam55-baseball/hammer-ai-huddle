import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Send, Lock, Loader2, Search, Package } from 'lucide-react';
import { CustomActivityTemplate } from '@/types/customActivity';
import { LockPreset, LOCK_PRESETS, LockableField } from '@/types/sentActivity';
import { useSentActivities } from '@/hooks/useSentActivities';
import { supabase } from '@/integrations/supabase/client';
import { getActivityIcon } from '@/components/custom-activities/IconPicker';
import { hexToRgba } from '@/hooks/useUserColors';

interface BulkSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlayerIds: string[];
  selectedPlayerNames: string[];
}

export function BulkSendDialog({ 
  open, 
  onOpenChange, 
  selectedPlayerIds,
  selectedPlayerNames 
}: BulkSendDialogProps) {
  const { t } = useTranslation();
  const { loading: sendLoading, sendActivityToPlayers } = useSentActivities();
  
  const [templates, setTemplates] = useState<CustomActivityTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [lockPreset, setLockPreset] = useState<LockPreset>('none');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingProgress, setSendingProgress] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('custom_activity_templates')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as unknown as CustomActivityTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setSelectedTemplates([]);
      setLockPreset('none');
      setMessage('');
      setSearchTerm('');
      setSendingProgress(0);
      setIsSending(false);
    }
  }, [open, fetchTemplates]);

  const handleTemplateToggle = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const getLockedFields = (): LockableField[] => {
    const preset = LOCK_PRESETS.find(p => p.key === lockPreset);
    return preset?.fields || [];
  };

  const filteredTemplates = templates.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.activity_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBulkSend = async () => {
    if (selectedTemplates.length === 0 || selectedPlayerIds.length === 0) return;
    
    setIsSending(true);
    const lockedFields = getLockedFields();
    let successCount = 0;
    let failCount = 0;
    
    const totalOperations = selectedTemplates.length;
    
    for (let i = 0; i < selectedTemplates.length; i++) {
      const templateId = selectedTemplates[i];
      const template = templates.find(t => t.id === templateId);
      
      if (template) {
        const success = await sendActivityToPlayers(
          template,
          selectedPlayerIds,
          lockedFields,
          message.trim() || undefined
        );
        
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }
      
      setSendingProgress(((i + 1) / totalOperations) * 100);
    }

    setIsSending(false);
    
    if (failCount === 0) {
      onOpenChange(false);
    }
  };

  const totalSends = selectedTemplates.length * selectedPlayerIds.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('coach.bulkSend', 'Send Activities to Players')}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)] px-6">
          <div className="space-y-6 py-4">
            {/* Selected Players Summary */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t('coach.sendingTo', 'Sending to')}:
                  </span>
                  <Badge variant="default">
                    {selectedPlayerIds.length} {t('coach.players', 'players')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {selectedPlayerNames.join(', ')}
                </p>
              </CardContent>
            </Card>

            <Separator />

            {/* Activity Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold">
                  {t('coach.selectActivities', 'Select Activities')}
                </Label>
                {selectedTemplates.length > 0 && (
                  <Badge variant="secondary">
                    {selectedTemplates.length} {t('common.selected', 'selected')}
                  </Badge>
                )}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('coach.searchActivities', 'Search activities...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('coach.noActivities', 'No activities found')}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredTemplates.map(template => {
                    const Icon = getActivityIcon(template.icon);
                    const isSelected = selectedTemplates.includes(template.id);
                    
                    return (
                      <div 
                        key={template.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-primary/10 border-primary' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleTemplateToggle(template.id)}
                      >
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div 
                          className="p-1.5 rounded"
                          style={{ backgroundColor: hexToRgba(template.color, 0.2) }}
                        >
                          {template.custom_logo_url ? (
                            <img src={template.custom_logo_url} alt="" className="h-5 w-5 object-contain" />
                          ) : (
                            <Icon className="h-5 w-5" style={{ color: template.color }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{template.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {t(`customActivity.types.${template.activity_type}`)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Lock Settings */}
            <div className="space-y-4">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {t('sentActivity.lockSettings', 'Lock Settings')}
              </Label>

              <RadioGroup value={lockPreset} onValueChange={(v) => setLockPreset(v as LockPreset)}>
                <div className="grid grid-cols-2 gap-2">
                  {LOCK_PRESETS.filter(p => p.key !== 'custom').map(preset => (
                    <div key={preset.key} className="flex items-center space-x-2">
                      <RadioGroupItem value={preset.key} id={`bulk-${preset.key}`} />
                      <Label htmlFor={`bulk-${preset.key}`} className="text-sm cursor-pointer">
                        {t(preset.labelKey)}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Message */}
            <div className="space-y-2">
              <Label className="text-sm font-bold">
                {t('sentActivity.message', 'Message (Optional)')}
              </Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('sentActivity.messagePlaceholder', 'Add a note for the players...')}
                rows={3}
              />
            </div>

            {/* Summary */}
            {selectedTemplates.length > 0 && selectedPlayerIds.length > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-center">
                    {t('coach.bulkSendSummary', 'This will send {{activities}} activities to {{players}} players ({{total}} total sends)', {
                      activities: selectedTemplates.length,
                      players: selectedPlayerIds.length,
                      total: totalSends
                    })}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleBulkSend} 
            disabled={sendLoading || isSending || selectedTemplates.length === 0}
            className="gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {Math.round(sendingProgress)}%
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {t('coach.sendToPlayers', 'Send to {{count}} Players', { count: selectedPlayerIds.length })}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
