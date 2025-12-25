import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronDown, Plus } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Exercise } from '@/types/customActivity';
import { EXERCISE_LIBRARY, CATEGORY_COLORS } from './ExerciseLibrarySidebar';
import { cn } from '@/lib/utils';
import { Dumbbell, Heart, Activity, Zap, Target, CircleDot } from 'lucide-react';

interface MobileExerciseLibraryDrawerProps {
  onExerciseSelect: (exercise: Exercise) => void;
  children: React.ReactNode;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  strength: <Dumbbell className="h-4 w-4" />,
  cardio: <Heart className="h-4 w-4" />,
  flexibility: <Activity className="h-4 w-4" />,
  plyometric: <Zap className="h-4 w-4" />,
  baseball: <CircleDot className="h-4 w-4" />,
  core: <Target className="h-4 w-4" />,
};

export function MobileExerciseLibraryDrawer({ onExerciseSelect, children }: MobileExerciseLibraryDrawerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategories, setOpenCategories] = useState<string[]>(['strength', 'baseball']);

  const filteredLibrary = Object.entries(EXERCISE_LIBRARY).reduce((acc, [category, exercises]) => {
    const filtered = exercises.filter(ex =>
      ex.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, Exercise[]>);

  const toggleCategory = (category: string) => {
    setOpenCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSelectExercise = (exercise: Exercise) => {
    onExerciseSelect(exercise);
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh] flex flex-col">
        <DrawerHeader className="pb-2 flex-shrink-0">
          <DrawerTitle>{t('workoutBuilder.exerciseLibrary')}</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden px-2 pb-6">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-2 pr-4">
              {Object.entries(filteredLibrary).map(([category, exercises]) => (
                <Collapsible
                  key={category}
                  open={openCategories.includes(category)}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("h-6 px-2", CATEGORY_COLORS[category])}>
                        {CATEGORY_ICONS[category]}
                        <span className="ml-1.5 capitalize">{t(`workoutBuilder.categories.${category}`, category)}</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground">({exercises.length})</span>
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      openCategories.includes(category) && "rotate-180"
                    )} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1 ml-1">
                    {exercises.map(exercise => (
                      <button
                        key={exercise.id}
                        onClick={() => handleSelectExercise(exercise)}
                        className={cn(
                          "flex items-center justify-between w-full p-3 rounded-lg border bg-card/50",
                          "hover:bg-accent/50 active:bg-accent transition-colors text-left"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{exercise.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {exercise.sets && exercise.reps && `${exercise.sets}×${exercise.reps}`}
                            {exercise.duration && `${exercise.duration}s`}
                          </p>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}

              {Object.keys(filteredLibrary).length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {t('common.noResults')}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
