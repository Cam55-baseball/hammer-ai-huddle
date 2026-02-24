import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IntentSelector } from '@/components/practice/IntentSelector';
import { ExecutionSlider } from '@/components/practice/ExecutionSlider';
import { OutcomeTagBubbles } from '@/components/practice/OutcomeTagBubbles';
import { useSportConfig } from '@/hooks/useSportConfig';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { DrillBlock } from '@/hooks/usePerformanceSession';

interface DrillBlockBuilderProps {
  module: string;
  blocks: DrillBlock[];
  onChange: (blocks: DrillBlock[]) => void;
}

export function DrillBlockBuilder({ module, blocks, onChange }: DrillBlockBuilderProps) {
  const { drills, hittingOutcomes, pitchingOutcomes } = useSportConfig();
  const moduleDrills = drills.filter(d => d.module === module);
  const outcomes = module === 'pitching' ? pitchingOutcomes : hittingOutcomes;

  const addBlock = () => {
    const newBlock: DrillBlock = {
      id: crypto.randomUUID(),
      drill_type: moduleDrills[0]?.id ?? '',
      intent: '',
      volume: moduleDrills[0]?.defaultReps ?? 10,
      execution_grade: 50,
      outcome_tags: [],
    };
    onChange([...blocks, newBlock]);
  };

  const updateBlock = (index: number, updates: Partial<DrillBlock>) => {
    const updated = [...blocks];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeBlock = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <Card key={block.id} className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Drill Block {i + 1}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => removeBlock(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Drill Type</label>
                <Select value={block.drill_type} onValueChange={v => updateBlock(i, { drill_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {moduleDrills.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Volume (Reps)</label>
                <Input
                  type="number"
                  min={1}
                  value={block.volume}
                  onChange={e => updateBlock(i, { volume: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <IntentSelector value={block.intent} onChange={v => updateBlock(i, { intent: v })} />

            <ExecutionSlider value={block.execution_grade} onChange={v => updateBlock(i, { execution_grade: v })} />

            <OutcomeTagBubbles
              outcomes={outcomes}
              selected={block.outcome_tags}
              onChange={v => updateBlock(i, { outcome_tags: v })}
            />
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" className="w-full" onClick={addBlock}>
        <Plus className="h-4 w-4 mr-2" /> Add Drill Block
      </Button>
    </div>
  );
}
