import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Dumbbell, Heart, Activity, Zap, ChevronDown, GripVertical } from 'lucide-react';
import { Exercise } from '@/types/customActivity';
import { cn } from '@/lib/utils';

interface ExerciseLibrarySidebarProps {
  onExerciseSelect?: (exercise: Exercise) => void;
}

interface DraggableExerciseProps {
  exercise: Exercise;
  category: string;
}

const EXERCISE_LIBRARY: Record<string, Exercise[]> = {
  strength: [
    { id: 'bench-press', name: 'Bench Press', type: 'strength', sets: 3, reps: 10, rest: 90 },
    { id: 'squats', name: 'Squats', type: 'strength', sets: 4, reps: 8, rest: 120 },
    { id: 'deadlifts', name: 'Deadlifts', type: 'strength', sets: 3, reps: 5, rest: 180 },
    { id: 'lunges', name: 'Lunges', type: 'strength', sets: 3, reps: 12, rest: 60 },
    { id: 'rows', name: 'Barbell Rows', type: 'strength', sets: 3, reps: 10, rest: 90 },
    { id: 'shoulder-press', name: 'Shoulder Press', type: 'strength', sets: 3, reps: 10, rest: 90 },
    { id: 'pull-ups', name: 'Pull-ups', type: 'strength', sets: 3, reps: 8, rest: 90 },
    { id: 'dips', name: 'Dips', type: 'strength', sets: 3, reps: 10, rest: 60 },
  ],
  cardio: [
    { id: 'burpees', name: 'Burpees', type: 'cardio', duration: 60, rest: 30 },
    { id: 'jumping-jacks', name: 'Jumping Jacks', type: 'cardio', duration: 60, rest: 15 },
    { id: 'mountain-climbers', name: 'Mountain Climbers', type: 'cardio', duration: 45, rest: 15 },
    { id: 'high-knees', name: 'High Knees', type: 'cardio', duration: 45, rest: 15 },
    { id: 'jump-rope', name: 'Jump Rope', type: 'cardio', duration: 120, rest: 30 },
  ],
  flexibility: [
    { id: 'hamstring-stretch', name: 'Hamstring Stretch', type: 'flexibility', duration: 30, rest: 0 },
    { id: 'hip-flexor-stretch', name: 'Hip Flexor Stretch', type: 'flexibility', duration: 30, rest: 0 },
    { id: 'shoulder-stretch', name: 'Shoulder Stretch', type: 'flexibility', duration: 30, rest: 0 },
    { id: 'quad-stretch', name: 'Quad Stretch', type: 'flexibility', duration: 30, rest: 0 },
  ],
  plyometric: [
    { id: 'box-jumps', name: 'Box Jumps', type: 'plyometric', sets: 3, reps: 8, rest: 60 },
    { id: 'tuck-jumps', name: 'Tuck Jumps', type: 'plyometric', sets: 3, reps: 10, rest: 45 },
    { id: 'broad-jumps', name: 'Broad Jumps', type: 'plyometric', sets: 3, reps: 8, rest: 60 },
    { id: 'lateral-bounds', name: 'Lateral Bounds', type: 'plyometric', sets: 3, reps: 10, rest: 45 },
  ],
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  strength: <Dumbbell className="h-4 w-4" />,
  cardio: <Heart className="h-4 w-4" />,
  flexibility: <Activity className="h-4 w-4" />,
  plyometric: <Zap className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  strength: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  cardio: 'bg-red-500/20 text-red-400 border-red-500/30',
  flexibility: 'bg-green-500/20 text-green-400 border-green-500/30',
  plyometric: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

function DraggableExercise({ exercise, category }: DraggableExerciseProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${exercise.id}`,
    data: { type: 'library-exercise', exercise, category },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border bg-card/50 cursor-grab active:cursor-grabbing",
        "hover:bg-accent/50 transition-colors group",
        isDragging && "ring-2 ring-primary shadow-lg"
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{exercise.name}</p>
        <p className="text-xs text-muted-foreground">
          {exercise.sets && exercise.reps && `${exercise.sets}×${exercise.reps}`}
          {exercise.duration && `${exercise.duration}s`}
        </p>
      </div>
    </div>
  );
}

export function ExerciseLibrarySidebar({ onExerciseSelect }: ExerciseLibrarySidebarProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategories, setOpenCategories] = useState<string[]>(['strength', 'cardio']);

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

  return (
    <div className="flex flex-col h-full border-r bg-muted/30">
      <div className="p-3 border-b">
        <h3 className="font-bold text-sm mb-2">{t('workoutBuilder.exerciseLibrary')}</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {Object.entries(filteredLibrary).map(([category, exercises]) => (
            <Collapsible 
              key={category} 
              open={openCategories.includes(category)}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("h-6 px-2", CATEGORY_COLORS[category])}>
                    {CATEGORY_ICONS[category]}
                    <span className="ml-1.5 capitalize">{t(`workoutBuilder.categories.${category}`)}</span>
                  </Badge>
                  <span className="text-xs text-muted-foreground">({exercises.length})</span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  openCategories.includes(category) && "rotate-180"
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1 ml-2">
                {exercises.map(exercise => (
                  <DraggableExercise 
                    key={exercise.id} 
                    exercise={exercise} 
                    category={category}
                  />
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
  );
}

export { EXERCISE_LIBRARY, CATEGORY_COLORS };
