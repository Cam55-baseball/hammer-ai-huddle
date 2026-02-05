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
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { 
  WorkoutBlock, 
  ViewMode, 
  BlockType, 
  EnhancedExercise,
  createEmptyBlock,
  BLOCK_TYPE_CONFIGS
} from '@/types/eliteWorkout';
import { calculateWorkoutCNS, calculateWorkoutFasciaBias, formatFasciaBias } from '@/utils/loadCalculation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Layers } from 'lucide-react';
import { BlockCard } from './BlockCard';
import { BlockTypeSelector } from './BlockTypeSelector';
import { CNSLoadIndicator } from '../intelligence/CNSLoadIndicator';
import { ViewModeToggle } from '../views/ViewModeToggle';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface BlockContainerProps {
  blocks: WorkoutBlock[];
  onChange: (blocks: WorkoutBlock[]) => void;
  viewMode: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  showViewModeToggle?: boolean;
  className?: string;
}

export function BlockContainer({
  blocks,
  onChange,
  viewMode,
  onViewModeChange,
  showViewModeToggle = true,
  className,
}: BlockContainerProps) {
  const { t } = useTranslation();
  const [activeBlock, setActiveBlock] = useState<WorkoutBlock | null>(null);
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  
  const totalCNS = calculateWorkoutCNS(blocks);
  const fasciaBias = calculateWorkoutFasciaBias(blocks);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );
  
  const handleDragStart = (event: DragStartEvent) => {
    const block = blocks.find((b) => b.id === event.active.id);
    if (block) setActiveBlock(block);
  };
  
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveBlock(null);
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newBlocks = arrayMove(blocks, oldIndex, newIndex).map((block, index) => ({
        ...block,
        orderIndex: index,
      }));
      onChange(newBlocks);
    }
  }, [blocks, onChange]);
  
  const handleAddBlock = (type: BlockType) => {
    const newBlock = createEmptyBlock(type, blocks.length);
    onChange([...blocks, newBlock]);
    setShowBlockSelector(false);
  };
  
  const handleUpdateBlock = (index: number, updatedBlock: WorkoutBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updatedBlock;
    onChange(newBlocks);
  };
  
  const handleDeleteBlock = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index).map((block, i) => ({
      ...block,
      orderIndex: i,
    }));
    onChange(newBlocks);
  };
  
  const handleAddExercise = (blockIndex: number) => {
    const block = blocks[blockIndex];
    const newExercise: EnhancedExercise = {
      id: `exercise-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      type: 'strength',
      sets: 3,
      reps: 10,
      rest: 60,
    };
    
    const updatedBlock = {
      ...block,
      exercises: [...block.exercises, newExercise],
    };
    
    handleUpdateBlock(blockIndex, updatedBlock);
  };
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">
              {blocks.length} {t('eliteWorkout.blocks.count', 'blocks')}
            </span>
          </div>
          
          {viewMode === 'coach' && totalCNS > 0 && (
            <>
              <CNSLoadIndicator load={totalCNS} size="sm" />
              <Badge variant="outline" className="text-xs">
                {formatFasciaBias(fasciaBias)} bias
              </Badge>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {showViewModeToggle && onViewModeChange && (
            <ViewModeToggle value={viewMode} onChange={onViewModeChange} />
          )}
          
          <Dialog open={showBlockSelector} onOpenChange={setShowBlockSelector}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t('eliteWorkout.addBlock', 'Add Block')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {t('eliteWorkout.chooseBlockType', 'Choose Block Type')}
                </DialogTitle>
              </DialogHeader>
              <BlockTypeSelector onSelect={handleAddBlock} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Block List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {blocks.map((block, index) => (
              <BlockCard
                key={block.id}
                block={block}
                viewMode={viewMode}
                onUpdate={(updated) => handleUpdateBlock(index, updated)}
                onDelete={() => handleDeleteBlock(index)}
                onAddExercise={() => handleAddExercise(index)}
              />
            ))}
          </div>
        </SortableContext>
        
        <DragOverlay>
          {activeBlock && (
            <div className={cn(
              'p-4 rounded-xl border-2 bg-card shadow-2xl',
              BLOCK_TYPE_CONFIGS[activeBlock.blockType].color
            )}>
              <span className="font-bold">{activeBlock.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      
      {/* Empty State */}
      {blocks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
          <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">
            {t('eliteWorkout.noBlocks', 'No blocks yet')}
          </h3>
          <p className="text-muted-foreground text-sm mb-4 max-w-md">
            {t('eliteWorkout.noBlocksDescription', 'Add blocks to structure your workout. Each block groups exercises by purpose.')}
          </p>
          <Button onClick={() => setShowBlockSelector(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('eliteWorkout.addFirstBlock', 'Add Your First Block')}
          </Button>
        </div>
      )}
    </div>
  );
}
