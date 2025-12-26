import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Star, Share2, Trash2, Pencil, RefreshCw, Calendar } from 'lucide-react';
import { CustomActivityTemplate, ActivityType } from '@/types/customActivity';
import { CustomActivityBuilderDialog } from './CustomActivityBuilderDialog';
import { ShareTemplateDialog } from './ShareTemplateDialog';
import { TemplateScheduleSettingsDrawer, ScheduleSettings } from './TemplateScheduleSettingsDrawer';
import { getActivityIcon } from './IconPicker';
import { hexToRgba } from '@/hooks/useUserColors';
import { cn } from '@/lib/utils';

interface TemplatesGridProps {
  templates: CustomActivityTemplate[];
  loading: boolean;
  selectedSport: 'baseball' | 'softball';
  onCreateTemplate: (data: Omit<CustomActivityTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>, scheduleForToday?: boolean) => Promise<CustomActivityTemplate | null>;
  onUpdateTemplate: (id: string, data: Partial<CustomActivityTemplate>) => Promise<boolean>;
  onDeleteTemplate: (id: string) => Promise<boolean>;
  onToggleFavorite: (id: string) => Promise<boolean>;
  onRefetch: () => void;
}

const ACTIVITY_TYPES: ActivityType[] = ['workout', 'running', 'meal', 'warmup', 'recovery', 'practice', 'short_practice', 'free_session'];

export function TemplatesGrid({
  templates,
  loading,
  selectedSport,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onToggleFavorite,
  onRefetch,
}: TemplatesGridProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ActivityType | 'all'>('all');
  const [editingTemplate, setEditingTemplate] = useState<CustomActivityTemplate | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sharingTemplate, setSharingTemplate] = useState<CustomActivityTemplate | null>(null);
  const [scheduleSettingsTemplate, setScheduleSettingsTemplate] = useState<CustomActivityTemplate | null>(null);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || template.activity_type === filterType;
    return matchesSearch && matchesType;
  });

  const handleSave = async (
    data: Omit<CustomActivityTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    scheduleForToday?: boolean
  ) => {
    let success = false;
    if (editingTemplate) {
      success = await onUpdateTemplate(editingTemplate.id, data);
    } else {
      const result = await onCreateTemplate(data, scheduleForToday);
      success = !!result;
    }
    return success;
  };

  const handleSaveScheduleSettings = async (templateId: string, settings: ScheduleSettings): Promise<boolean> => {
    return await onUpdateTemplate(templateId, {
      display_on_game_plan: settings.display_on_game_plan,
      display_days: settings.display_days,
      display_time: settings.display_time || undefined,
      reminder_enabled: settings.reminder_enabled,
      reminder_time: settings.reminder_time || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('myCustomActivities.searchTemplates', 'Search templates...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as ActivityType | 'all')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t('myCustomActivities.filterByType', 'Filter by type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('myCustomActivities.allTypes', 'All Types')}</SelectItem>
            {ACTIVITY_TYPES.map(type => (
              <SelectItem key={type} value={type}>{t(`customActivity.types.${type}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('myCustomActivities.createNew', 'Create New')}
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-40" />
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterType !== 'all' 
                ? t('myCustomActivities.noResults', 'No templates match your filters')
                : t('myCustomActivities.noTemplates', 'No templates yet. Create your first one!')}
            </p>
            <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              {t('myCustomActivities.createFirst', 'Create Template')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => {
            const Icon = getActivityIcon(template.icon);
            return (
              <Card 
                key={template.id} 
                className="group relative overflow-hidden transition-all hover:shadow-lg"
                style={{ borderColor: hexToRgba(template.color, 0.5) }}
              >
                {template.display_nickname && (
                  <div 
                    className="absolute top-0 left-0 right-0 px-3 py-1 text-xs font-bold text-white truncate"
                    style={{ backgroundColor: template.color }}
                  >
                    {template.display_nickname}
                  </div>
                )}
                <CardHeader className={cn("pb-2", template.display_nickname && "pt-8")}>
                  <div className="flex items-start gap-3">
                    <div 
                      className="p-2 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: hexToRgba(template.color, 0.2) }}
                    >
                      {template.custom_logo_url ? (
                        <img src={template.custom_logo_url} alt="" className="h-6 w-6 object-contain" />
                      ) : (
                        <Icon className="h-6 w-6" style={{ color: template.color }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-bold truncate flex items-center gap-2">
                        {template.title}
                        {template.is_favorited && <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {t(`customActivity.types.${template.activity_type}`)}
                        </Badge>
                        {template.recurring_active && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <RefreshCw className="h-3 w-3" />
                            {t('customActivity.recurring.label')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setScheduleSettingsTemplate(template)}
                      title={t('customActivity.scheduleSettings', 'Schedule Settings')}
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingTemplate(template)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onToggleFavorite(template.id)}>
                      <Star className={cn("h-4 w-4", template.is_favorited && "fill-yellow-500 text-yellow-500")} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSharingTemplate(template)}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDeleteTemplate(template.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CustomActivityBuilderDialog
        open={isCreateOpen || !!editingTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingTemplate(null);
          }
        }}
        template={editingTemplate}
        onSave={handleSave}
        onDelete={editingTemplate ? () => onDeleteTemplate(editingTemplate.id) : undefined}
        selectedSport={selectedSport}
      />

      <ShareTemplateDialog
        open={!!sharingTemplate}
        onOpenChange={(open) => !open && setSharingTemplate(null)}
        template={sharingTemplate}
      />

      <TemplateScheduleSettingsDrawer
        template={scheduleSettingsTemplate}
        open={!!scheduleSettingsTemplate}
        onOpenChange={(open) => !open && setScheduleSettingsTemplate(null)}
        onSave={handleSaveScheduleSettings}
      />
    </div>
  );
}
