import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Dumbbell, Zap, Heart, Eye, ArrowRight, Target, ChevronRight } from 'lucide-react';
import { WORKOUT_TEMPLATES, WorkoutTemplate } from '@/data/workoutTemplates';
import { Exercise } from '@/types/customActivity';
import { cn } from '@/lib/utils';

interface WorkoutTemplatesLibraryProps {
  selectedSport: 'baseball' | 'softball';
  onUseTemplate: (exercises: Exercise[], templateName: string) => void;
}

const CATEGORY_CONFIG = {
  'off-season': { 
    icon: Dumbbell, 
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    label: 'Off-Season'
  },
  'in-season': { 
    icon: Zap, 
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    label: 'In-Season'
  },
  'arm-care': { 
    icon: Heart, 
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    label: 'Arm Care'
  },
  'specialty': { 
    icon: Target, 
    color: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    label: 'Specialty'
  },
};

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-500/20 text-green-400',
  intermediate: 'bg-amber-500/20 text-amber-400',
  advanced: 'bg-red-500/20 text-red-400',
};

function TemplateCard({ 
  template, 
  onUse, 
  onPreview 
}: { 
  template: WorkoutTemplate; 
  onUse: () => void;
  onPreview: () => void;
}) {
  const { t } = useTranslation();
  const config = CATEGORY_CONFIG[template.category];
  const Icon = config.icon;

  return (
    <Card className="group hover:shadow-lg transition-all hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("h-7 px-2", config.color)}>
              <Icon className="h-3.5 w-3.5 mr-1" />
              {config.label}
            </Badge>
            <Badge variant="outline" className={DIFFICULTY_COLORS[template.difficulty]}>
              {template.difficulty}
            </Badge>
          </div>
        </div>
        <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {template.duration} min
          </span>
          <span className="flex items-center gap-1">
            <Dumbbell className="h-4 w-4" />
            {template.exercises.length} exercises
          </span>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
            onClick={onPreview}
          >
            <Eye className="h-3.5 w-3.5 sm:mr-1 shrink-0" />
            <span className="hidden sm:inline">{t('workoutTemplates.preview', 'Preview')}</span>
          </Button>
          <Button 
            size="sm" 
            className="flex-1 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
            onClick={onUse}
          >
            <span className="hidden sm:inline">{t('workoutTemplates.useTemplate', 'Use')}</span>
            <span className="sm:hidden">{t('workoutTemplates.use', 'Use')}</span>
            <ArrowRight className="h-3.5 w-3.5 sm:ml-1 shrink-0" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplatePreviewDialog({ 
  template, 
  open, 
  onOpenChange,
  onUse
}: { 
  template: WorkoutTemplate | null; 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: () => void;
}) {
  const { t } = useTranslation();
  
  if (!template) return null;
  
  const config = CATEGORY_CONFIG[template.category];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={cn("h-6 px-2", config.color)}>
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            <Badge variant="outline" className={DIFFICULTY_COLORS[template.difficulty]}>
              {template.difficulty}
            </Badge>
          </div>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground py-2 border-y">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {template.duration} min
          </span>
          <span className="flex items-center gap-1">
            <Dumbbell className="h-4 w-4" />
            {template.exercises.length} exercises
          </span>
          <span className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            {template.focus}
          </span>
        </div>

        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2">
            {template.exercises.map((exercise, index) => (
              <div 
                key={exercise.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
              >
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{exercise.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {exercise.sets && exercise.reps && `${exercise.sets}×${exercise.reps}`}
                    {exercise.duration && `${exercise.duration}s`}
                    {exercise.rest ? ` • ${exercise.rest}s rest` : ''}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs capitalize">
                  {exercise.type}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
          <Button className="flex-1" onClick={onUse}>
            {t('workoutTemplates.useTemplate', 'Use Template')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function WorkoutTemplatesLibrary({ selectedSport, onUseTemplate }: WorkoutTemplatesLibraryProps) {
  const { t } = useTranslation();
  const [previewTemplate, setPreviewTemplate] = useState<WorkoutTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const filteredTemplates = WORKOUT_TEMPLATES.filter(
    t => t.sport === selectedSport || t.sport === 'both'
  );

  const categories = ['off-season', 'in-season', 'arm-care', 'specialty'] as const;

  const handleUseTemplate = (template: WorkoutTemplate) => {
    // Add unique IDs to exercises
    const exercisesWithIds = template.exercises.map((ex, i) => ({
      ...ex,
      id: `${ex.id}-${Date.now()}-${i}`,
    }));
    onUseTemplate(exercisesWithIds, template.name);
    setPreviewOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{t('workoutTemplates.title', 'Workout Library')}</h2>
        <p className="text-muted-foreground text-sm">
          {t('workoutTemplates.subtitle', 'Pre-built baseball training programs')}
        </p>
      </div>

      <Tabs defaultValue="off-season">
        <TabsList className="grid w-full grid-cols-4">
          {categories.map(cat => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            const count = filteredTemplates.filter(t => t.category === cat).length;
            return (
              <TabsTrigger key={cat} value={cat} className="gap-1.5">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{config.label}</span>
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map(cat => (
          <TabsContent key={cat} value={cat} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates
                .filter(t => t.category === cat)
                .map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onPreview={() => {
                      setPreviewTemplate(template);
                      setPreviewOpen(true);
                    }}
                    onUse={() => handleUseTemplate(template)}
                  />
                ))}
            </div>
            
            {filteredTemplates.filter(t => t.category === cat).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>{t('common.noData')}</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <TemplatePreviewDialog
        template={previewTemplate}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onUse={() => previewTemplate && handleUseTemplate(previewTemplate)}
      />
    </div>
  );
}
