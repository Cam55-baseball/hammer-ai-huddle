import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Wand2, Save, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  usePromoScenes,
  useCreateProject,
  getRecommendedScenes,
  pickDurationVariant,
  type SceneSequenceItem,
  type PromoScene,
} from '@/hooks/usePromoEngine';
import { FormatSelector } from './FormatSelector';
import { StoryTimeline } from './StoryTimeline';
import { SceneCard } from './SceneCard';
import { cn } from '@/lib/utils';

const AUDIENCES = [
  { value: 'player', label: 'Player', emoji: '⚾' },
  { value: 'parent', label: 'Parent', emoji: '👨‍👩‍👦' },
  { value: 'coach', label: 'Coach', emoji: '📋' },
  { value: 'scout', label: 'Scout', emoji: '🔍' },
  { value: 'program', label: 'Program', emoji: '🏟️' },
];

const GOALS = [
  { value: 'awareness', label: 'Awareness', desc: 'Introduce the platform' },
  { value: 'conversion', label: 'Conversion', desc: 'Drive sign-ups' },
  { value: 'feature_highlight', label: 'Feature Highlight', desc: 'Showcase specific tools' },
];

const DURATIONS = [15, 30, 60];

export const StoryBuilder = () => {
  const { data: allScenes = [] } = usePromoScenes();
  const createProject = useCreateProject();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState(30);
  const [format, setFormat] = useState('tiktok');
  const [sequence, setSequence] = useState<SceneSequenceItem[]>([]);

  const handleAutoAssemble = () => {
    const recommendedKeys = getRecommendedScenes(audience, goal);
    const variant = pickDurationVariant(duration, recommendedKeys.length);

    const assembled: SceneSequenceItem[] = [];
    recommendedKeys.forEach((key, index) => {
      // Find best match: prefer matching duration variant
      const match = allScenes.find(s => s.scene_key === key && s.duration_variant === variant && s.status === 'active')
        || allScenes.find(s => s.scene_key === key && s.status === 'active');
      if (match) {
        assembled.push({
          scene_id: match.id,
          scene_key: match.scene_key,
          title: match.title,
          duration_variant: match.duration_variant,
          order: index,
        });
      }
    });

    setSequence(assembled);
    if (!title) {
      const audienceLabel = AUDIENCES.find(a => a.value === audience)?.label || audience;
      const goalLabel = GOALS.find(g => g.value === goal)?.label || goal;
      setTitle(`${audienceLabel} ${goalLabel} - ${duration}s`);
    }
  };

  const handleRemoveScene = (index: number) => {
    setSequence(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddScene = (scene: PromoScene) => {
    setSequence(prev => [
      ...prev,
      {
        scene_id: scene.id,
        scene_key: scene.scene_key,
        title: scene.title,
        duration_variant: scene.duration_variant,
        order: prev.length,
      },
    ]);
  };

  const handleSave = () => {
    createProject.mutate({
      title,
      target_audience: audience,
      video_goal: goal,
      target_duration: duration,
      scene_sequence: sequence,
      format,
      status: 'draft',
      output_url: null,
      render_metadata: {},
    } as any);
    // Reset
    setStep(0);
    setTitle('');
    setAudience('');
    setGoal('');
    setDuration(30);
    setFormat('tiktok');
    setSequence([]);
  };

  const canProceed = [
    audience && goal && duration,
    sequence.length > 0,
    title && format,
  ];

  const steps = [
    // Step 0: Audience + Goal + Duration
    <div key="step-0" className="space-y-6">
      <div className="space-y-3">
        <Label className="text-base font-semibold">Target Audience</Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {AUDIENCES.map(a => (
            <Card
              key={a.value}
              className={cn(
                'p-4 text-center cursor-pointer transition-all hover:shadow-md',
                audience === a.value && 'ring-2 ring-primary bg-primary/5'
              )}
              onClick={() => setAudience(a.value)}
            >
              <span className="text-2xl">{a.emoji}</span>
              <p className="text-sm font-medium mt-1">{a.label}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-semibold">Video Goal</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {GOALS.map(g => (
            <Card
              key={g.value}
              className={cn(
                'p-4 cursor-pointer transition-all hover:shadow-md',
                goal === g.value && 'ring-2 ring-primary bg-primary/5'
              )}
              onClick={() => setGoal(g.value)}
            >
              <p className="font-semibold text-sm">{g.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{g.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-semibold">Duration</Label>
        <div className="flex gap-3">
          {DURATIONS.map(d => (
            <Button
              key={d}
              variant={duration === d ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setDuration(d)}
            >
              {d}s
            </Button>
          ))}
        </div>
      </div>
    </div>,

    // Step 1: Scene Assembly
    <div key="step-1" className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="default" size="sm" className="gap-1.5" onClick={handleAutoAssemble}>
          <Wand2 className="h-4 w-4" /> Auto-Assemble
        </Button>
        <p className="text-xs text-muted-foreground">or manually add scenes below</p>
      </div>

      <StoryTimeline sequence={sequence} onRemove={handleRemoveScene} />

      {/* Available scenes to add */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Add Scenes</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {allScenes
            .filter(s => s.status === 'active' && !sequence.some(sq => sq.scene_id === s.id))
            .slice(0, 8)
            .map(scene => (
              <SceneCard
                key={scene.id}
                scene={scene}
                selectable
                onSelect={handleAddScene}
              />
            ))}
        </div>
      </div>
    </div>,

    // Step 2: Title + Format + Save
    <div key="step-2" className="space-y-6">
      <div className="space-y-2">
        <Label className="text-base font-semibold">Project Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Player Awareness TikTok 30s" />
      </div>

      <div className="space-y-3">
        <Label className="text-base font-semibold">Export Format</Label>
        <FormatSelector value={format} onChange={setFormat} />
      </div>

      {/* Summary */}
      <Card className="p-4 bg-muted/50 space-y-2">
        <p className="text-sm font-semibold">Project Summary</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-muted-foreground">Audience:</span> <span className="font-medium capitalize">{audience}</span></div>
          <div><span className="text-muted-foreground">Goal:</span> <span className="font-medium capitalize">{goal?.replace('_', ' ')}</span></div>
          <div><span className="text-muted-foreground">Duration:</span> <span className="font-medium">{duration}s</span></div>
          <div><span className="text-muted-foreground">Scenes:</span> <span className="font-medium">{sequence.length}</span></div>
        </div>
      </Card>

      <StoryTimeline sequence={sequence} onRemove={handleRemoveScene} />
    </div>,
  ];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {['Audience & Goal', 'Scene Assembly', 'Review & Save'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
              i === step ? 'bg-primary text-primary-foreground' : i < step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              {i + 1}
            </div>
            <span className={cn('text-sm hidden sm:inline', i === step ? 'font-medium' : 'text-muted-foreground')}>{label}</span>
            {i < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      {steps[step]}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {step < 2 ? (
          <Button disabled={!canProceed[step]} onClick={() => setStep(s => s + 1)} className="gap-1">
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button disabled={!canProceed[step] || createProject.isPending} onClick={handleSave} className="gap-1">
            <Save className="h-4 w-4" /> Save Project
          </Button>
        )}
      </div>
    </div>
  );
};
