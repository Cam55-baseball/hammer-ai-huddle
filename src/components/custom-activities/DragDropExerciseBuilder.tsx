import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Sparkles, Plus, Library } from 'lucide-react';
import { Exercise } from '@/types/customActivity';
import { ExerciseLibrarySidebar, CATEGORY_COLORS } from './ExerciseLibrarySidebar';
import { WorkoutTimeline } from './WorkoutTimeline';
import { AIWorkoutRecommendations } from './AIWorkoutRecommendations';
import { WarmupGeneratorCard } from './WarmupGeneratorCard';
import { MobileExerciseLibraryDrawer } from './MobileExerciseLibraryDrawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface DragDropExerciseBuilderProps {
  exercises: Exercise[];
  onExercisesChange: (exercises: Exercise[]) => void;
}

export function DragDropExerciseBuilder({ exercises, onExercisesChange }: DragDropExerciseBuilderProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    
    if (data?.type === 'library-exercise') {
      setActiveExercise(data.exercise);
    } else {
      const exercise = exercises.find(e => e.id === active.id);
      if (exercise) {
        setActiveExercise(exercise);
      }
    }
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveExercise(null);

    if (!over) return;

    const activeData = active.data.current;

    // Handle dropping from library
    if (activeData?.type === 'library-exercise') {
      const newExercise: Exercise = {
        ...activeData.exercise,
        id: `${activeData.exercise.id}-${Date.now()}`,
      };
      
      if (over.id === 'workout-timeline') {
        onExercisesChange([...exercises, newExercise]);
      } else {
        // Insert at specific position
        const overIndex = exercises.findIndex(e => e.id === over.id);
        if (overIndex >= 0) {
          const newExercises = [...exercises];
          newExercises.splice(overIndex, 0, newExercise);
          onExercisesChange(newExercises);
        } else {
          onExercisesChange([...exercises, newExercise]);
        }
      }
      return;
    }

    // Handle reordering within timeline
    if (active.id !== over.id && over.id !== 'workout-timeline') {
      const oldIndex = exercises.findIndex(e => e.id === active.id);
      const newIndex = exercises.findIndex(e => e.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        onExercisesChange(arrayMove(exercises, oldIndex, newIndex));
      }
    }
  }, [exercises, onExercisesChange]);

  const handleRemoveExercise = (id: string) => {
    onExercisesChange(exercises.filter(e => e.id !== id));
  };

  const handleUseAIWorkout = (aiExercises: Exercise[]) => {
    onExercisesChange(aiExercises);
    setShowAIRecommendations(false);
  };

  const handleAddWarmup = (warmupExercises: Exercise[]) => {
    // Prepend warmup exercises to the beginning
    onExercisesChange([...warmupExercises, ...exercises]);
  };

  const handleAddExercise = () => {
    const newExercise: Exercise = {
      id: `custom-exercise-${Date.now()}`,
      name: t('customActivity.exercises.newExercise', 'New Exercise'),
      type: 'strength',
      sets: 3,
      reps: 10,
      rest: 60,
    };
    onExercisesChange([...exercises, newExercise]);
  };

  const handleAddFromLibrary = (exercise: Exercise) => {
    const newExercise: Exercise = {
      ...exercise,
      id: `${exercise.id}-${Date.now()}`,
    };
    onExercisesChange([...exercises, newExercise]);
  };

  const exerciseType = activeExercise?.type || 'strength';
  const colorClass = CATEGORY_COLORS[exerciseType] || CATEGORY_COLORS.strength;

  return (
    <div className="space-y-4 overflow-hidden min-w-0">
      {/* Warmup Generator */}
      <WarmupGeneratorCard 
        exercises={exercises} 
        onAddWarmup={handleAddWarmup}
      />

      {/* AI Recommendations Toggle and Add Exercise Button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={showAIRecommendations ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowAIRecommendations(!showAIRecommendations)}
            className="gap-1.5 text-xs sm:text-sm"
          >
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">{t('aiRecommendations.title')}</span>
            <span className="xs:hidden">Hammer</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddExercise}
            className="gap-1.5 text-xs sm:text-sm"
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('customActivity.exercises.addExercise', 'Add Exercise')}</span>
            <span className="sm:hidden">{t('common.add', 'Add')}</span>
          </Button>
          {/* Mobile: Browse Library Button */}
          {isMobile && (
            <MobileExerciseLibraryDrawer onExerciseSelect={handleAddFromLibrary}>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs sm:text-sm"
              >
                <Library className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {t('workoutBuilder.browseLibrary', 'Library')}
              </Button>
            </MobileExerciseLibraryDrawer>
          )}
        </div>
        {exercises.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
          </span>
        )}
      </div>

      {/* AI Recommendations Panel */}
      {showAIRecommendations && (
        <AIWorkoutRecommendations onUseWorkout={handleUseAIWorkout} />
      )}

      {/* Drag and Drop Builder */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {isMobile ? (
          /* Mobile: Timeline only, library accessed via drawer */
          <div className="border rounded-lg overflow-hidden">
            <WorkoutTimeline
              exercises={exercises}
              onExercisesChange={onExercisesChange}
              onRemoveExercise={handleRemoveExercise}
            />
          </div>
        ) : (
          /* Desktop: Side-by-side layout */
          <div className="grid grid-cols-2 gap-0 border rounded-lg overflow-hidden min-h-[400px]">
            {/* Exercise Library */}
            <ExerciseLibrarySidebar />

            {/* Workout Timeline */}
            <WorkoutTimeline
              exercises={exercises}
              onExercisesChange={onExercisesChange}
              onRemoveExercise={handleRemoveExercise}
            />
          </div>
        )}

        {/* Drag Overlay - Only shown on desktop */}
        {!isMobile && (
          <DragOverlay>
            {activeExercise && (
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-lg border-2 bg-card shadow-2xl",
                "ring-2 ring-primary"
              )}>
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className={cn("text-xs", colorClass)}>
                  {exerciseType}
                </Badge>
                <span className="font-medium text-sm">{activeExercise.name}</span>
              </div>
            )}
          </DragOverlay>
        )}
      </DndContext>
    </div>
  );
}
