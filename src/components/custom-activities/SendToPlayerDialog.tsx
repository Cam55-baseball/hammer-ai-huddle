import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Send, Lock, Users, MessageSquare, Loader2 } from 'lucide-react';
import { CustomActivityTemplate } from '@/types/customActivity';
import { LockableField, LockPreset, LOCKABLE_FIELDS, LOCK_PRESETS, FollowedPlayer } from '@/types/sentActivity';
import { useSentActivities } from '@/hooks/useSentActivities';
import { getActivityIcon } from './IconPicker';
import { hexToRgba } from '@/hooks/useUserColors';

interface SendToPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: CustomActivityTemplate | null;
}

export function SendToPlayerDialog({ open, onOpenChange, template }: SendToPlayerDialogProps) {
  const { t } = useTranslation();
  const { loading, loadingPlayers, followedPlayers, fetchFollowedPlayers, sendActivityToPlayers } = useSentActivities();
  
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [lockPreset, setLockPreset] = useState<LockPreset>('none');
  const [customLocks, setCustomLocks] = useState<LockableField[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      fetchFollowedPlayers();
      setSelectedPlayers([]);
      setLockPreset('none');
      setCustomLocks([]);
      setMessage('');
    }
  }, [open, fetchFollowedPlayers]);

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleLockToggle = (field: LockableField) => {
    setCustomLocks(prev => 
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
    setLockPreset('custom');
  };

  const getLockedFields = (): LockableField[] => {
    if (lockPreset === 'custom') return customLocks;
    const preset = LOCK_PRESETS.find(p => p.key === lockPreset);
    return preset?.fields || [];
  };

  const handleSend = async () => {
    if (!template) return;
    
    const success = await sendActivityToPlayers(
      template,
      selectedPlayers,
      getLockedFields(),
      message.trim() || undefined
    );

    if (success) {
      onOpenChange(false);
    }
  };

  if (!template) return null;

  const Icon = getActivityIcon(template.icon);
  const lockedFields = getLockedFields();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Send className="h-5 w-5" />
            {t('sentActivity.sendTitle', 'Send Activity to Player')}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)] px-6">
          <div className="space-y-6 py-4">
            {/* Activity Preview */}
            <Card style={{ borderColor: hexToRgba(template.color, 0.5) }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: hexToRgba(template.color, 0.2) }}
                  >
                    {template.custom_logo_url ? (
                      <img src={template.custom_logo_url} alt="" className="h-6 w-6 object-contain" />
                    ) : (
                      <Icon className="h-6 w-6" style={{ color: template.color }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate">{template.title}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {t(`customActivity.types.${template.activity_type}`)}
                    </Badge>
                  </div>
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {template.description}
                  </p>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Lock Settings */}
            <div className="space-y-4">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {t('sentActivity.lockSettings', 'Lock Settings')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('sentActivity.lockDescription', 'Choose which fields the player cannot edit when they accept this activity.')}
              </p>

              <RadioGroup value={lockPreset} onValueChange={(v) => setLockPreset(v as LockPreset)}>
                <div className="grid grid-cols-2 gap-2">
                  {LOCK_PRESETS.filter(p => p.key !== 'custom').map(preset => (
                    <div key={preset.key} className="flex items-center space-x-2">
                      <RadioGroupItem value={preset.key} id={preset.key} />
                      <Label htmlFor={preset.key} className="text-sm cursor-pointer">
                        {t(preset.labelKey)}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>

              {lockPreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border bg-muted/30">
                  {LOCKABLE_FIELDS.map(field => (
                    <div key={field.key} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`lock-${field.key}`}
                        checked={customLocks.includes(field.key)}
                        onCheckedChange={() => handleLockToggle(field.key)}
                      />
                      <Label htmlFor={`lock-${field.key}`} className="text-sm cursor-pointer">
                        {t(field.labelKey)}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {lockedFields.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {lockedFields.map(field => (
                    <Badge key={field} variant="secondary" className="text-xs gap-1">
                      <Lock className="h-3 w-3" />
                      {t(`sentActivity.locks.${field}`)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Player Selection */}
            <div className="space-y-4">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('sentActivity.selectPlayers', 'Select Players')}
                {selectedPlayers.length > 0 && (
                  <Badge variant="default" className="ml-auto">
                    {selectedPlayers.length}
                  </Badge>
                )}
              </Label>

              {loadingPlayers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : followedPlayers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('sentActivity.noPlayers', 'No followed players found')}</p>
                  <p className="text-xs">{t('sentActivity.noPlayersHint', 'Follow players to send them activities')}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {followedPlayers.map(player => (
                    <div 
                      key={player.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPlayers.includes(player.id) 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handlePlayerToggle(player.id)}
                    >
                      <Checkbox 
                        checked={selectedPlayers.includes(player.id)}
                        onCheckedChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={player.avatar_url || undefined} />
                        <AvatarFallback>
                          {player.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{player.full_name || 'Unknown Player'}</p>
                        {player.position && (
                          <p className="text-xs text-muted-foreground">{player.position}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Message */}
            <div className="space-y-2">
              <Label className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t('sentActivity.message', 'Message (Optional)')}
              </Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('sentActivity.messagePlaceholder', 'Add a note for the player...')}
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={loading || selectedPlayers.length === 0}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t('sentActivity.send', 'Send Activity')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
