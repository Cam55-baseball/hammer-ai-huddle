import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookmarkPlus, Star, Trash2, Calendar } from 'lucide-react';
import { MealPlanCalendar } from './MealPlanCalendar';
import { useMealPlanning, MealTemplate } from '@/hooks/useMealPlanning';
import { toast } from 'sonner';

export function MealPlanningTab() {
  const { t } = useTranslation();
  const { 
    templates, 
    saveAsTemplate, 
    applyTemplate, 
    deleteTemplate, 
    toggleTemplateFavorite,
    loading 
  } = useMealPlanning();
  
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error(t('common.required'));
      return;
    }
    
    setSavingTemplate(true);
    try {
      await saveAsTemplate(newTemplateName.trim());
      setNewTemplateName('');
      setTemplateDialogOpen(false);
      toast.success(t('mealPlanning.templates.saved'));
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleApplyTemplate = async (template: MealTemplate) => {
    try {
      await applyTemplate(template);
      toast.success(t('mealPlanning.templates.applied'));
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplate(templateId);
      toast.success(t('mealPlanning.templates.deleted'));
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          {t('mealPlanning.weeklyCalendar')}
        </h3>
        
        <div className="flex gap-2">
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <BookmarkPlus className="h-4 w-4 mr-2" />
                {t('mealPlanning.templates.save')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('mealPlanning.templates.saveCurrentWeek')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t('mealPlanning.templates.name')}</Label>
                  <Input
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder={t('mealPlanning.templates.namePlaceholder')}
                  />
                </div>
                <Button 
                  onClick={handleSaveTemplate} 
                  disabled={savingTemplate || !newTemplateName.trim()}
                  className="w-full"
                >
                  {savingTemplate ? t('common.loading') : t('common.save')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Templates List */}
      {templates.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('mealPlanning.templates.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-40">
              <div className="space-y-2">
                {templates.map((template) => (
                  <div 
                    key={template.id} 
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleTemplateFavorite(template.id, !template.is_favorite)}
                      >
                        <Star 
                          className={`h-4 w-4 ${template.is_favorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} 
                        />
                      </Button>
                      <span className="font-medium">{template.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleApplyTemplate(template)}
                      >
                        {t('mealPlanning.templates.apply')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      <MealPlanCalendar />
    </div>
  );
}
