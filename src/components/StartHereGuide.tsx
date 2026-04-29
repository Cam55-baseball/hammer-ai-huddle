import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  Rocket, ChevronRight, ChevronLeft, Dumbbell, Video, Target, 
  BarChart3, BookOpen, HelpCircle, Check, Sparkles, User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { dispatchSportChange } from '@/contexts/SportThemeContext';
import { toast } from 'sonner';

interface StartHereGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const POSITIONS_BASEBALL = ['Pitcher', 'Catcher', 'First Base', 'Second Base', 'Shortstop', 'Third Base', 'Left Field', 'Center Field', 'Right Field', 'DH'];
const POSITIONS_SOFTBALL = ['Pitcher', 'Catcher', 'First Base', 'Second Base', 'Shortstop', 'Third Base', 'Left Field', 'Center Field', 'Right Field', 'DP/Flex'];
const LEVELS = ['Youth (8U-12U)', 'Middle School', 'High School', 'Travel/Club', 'College', 'Independent/Semi-Pro', 'Professional'];

const coreActions = [
  { icon: Dumbbell, title: 'Log Reps', desc: 'Track every rep with smart grading' },
  { icon: Video, title: 'Upload Video', desc: 'Analyze your mechanics' },
  { icon: Target, title: 'Tag Reps', desc: 'Add pitch type, velocity & location' },
  { icon: BarChart3, title: 'View Analytics', desc: 'See your MPI scores & trends' },
  { icon: BookOpen, title: 'Use Vault', desc: 'Private journal for your development' },
];

export function StartHereGuide({ open, onOpenChange }: StartHereGuideProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [sport, setSport] = useState<'baseball' | 'softball'>('baseball');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [level, setLevel] = useState('');
  const [saving, setSaving] = useState(false);

  const totalSteps = 4;

  const handleSportSelect = (s: 'baseball' | 'softball') => {
    setSport(s);
    setSelectedPositions([]);
    dispatchSportChange(s);
  };

  const togglePosition = (pos: string) => {
    setSelectedPositions(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : prev.length < 3 ? [...prev, pos] : prev
    );
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({
        sport,
        positions: selectedPositions,
        level_of_play: level || null,
      } as any).eq('id', user.id);

      await supabase.from('athlete_mpi_settings').update({
        sport,
        primary_position: selectedPositions[0] || null,
        secondary_position: selectedPositions[1] || null,
      }).eq('user_id', user.id);
    } catch (e) {
      console.error('Profile save error:', e);
    }
    setSaving(false);
    setStep(2);
  };

  const markTutorialCompleted = async () => {
    if (!user) return;
    try {
      await supabase.from('profiles').update({
        tutorial_completed: true,
      }).eq('id', user.id);
    } catch (e) {
      console.error('Failed to mark tutorial completed:', e);
    }
  };

  const handleDialogOpenChange = (next: boolean) => {
    if (!next && open) {
      // User dismissed (X, Esc, overlay) — persist so it never reopens
      void markTutorialCompleted();
    }
    onOpenChange(next);
  };

  const handleComplete = async (route: string) => {
    await markTutorialCompleted();
    onOpenChange(false);
    navigate(route);
    toast.success('You\'re all set! Let\'s get to work 💪');
  };

  const positions = sport === 'softball' ? POSITIONS_SOFTBALL : POSITIONS_BASEBALL;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Progress indicator */}
        <div className="flex gap-1 mb-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-all',
                i <= step ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {/* Persistent Help Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-3 right-12 gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => { onOpenChange(false); navigate('/help-desk'); }}
        >
          <HelpCircle className="h-4 w-4" />
          <span className="text-xs">Help</span>
        </Button>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Rocket className="h-6 w-6 text-primary" />
                Welcome to Your Training Hub
              </DialogTitle>
              <DialogDescription>
                Your all-in-one development platform
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3 py-4">
              <div className="text-center space-y-2 p-3 rounded-xl bg-muted/50 border">
                <Target className="h-8 w-8 mx-auto text-primary" />
                <p className="text-xs font-medium">Track Reps</p>
                <p className="text-[10px] text-muted-foreground">Log every session with smart grading</p>
              </div>
              <div className="text-center space-y-2 p-3 rounded-xl bg-muted/50 border">
                <BarChart3 className="h-8 w-8 mx-auto text-primary" />
                <p className="text-xs font-medium">Analyze</p>
                <p className="text-[10px] text-muted-foreground">See trends & MPI performance scores</p>
              </div>
              <div className="text-center space-y-2 p-3 rounded-xl bg-muted/50 border">
                <Sparkles className="h-8 w-8 mx-auto text-primary" />
                <p className="text-xs font-medium">Develop</p>
                <p className="text-[10px] text-muted-foreground">Daily Game Plan built for you</p>
              </div>
            </div>

            <Button onClick={() => setStep(1)} className="w-full gap-2">
              Get Started <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Step 1: Sport & Profile Setup */}
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Set Up Your Profile
              </DialogTitle>
              <DialogDescription>Tell us about yourself for personalized training</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Sport */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Sport</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['baseball', 'softball'] as const).map(s => (
                    <Button
                      key={s}
                      variant={sport === s ? 'default' : 'outline'}
                      onClick={() => handleSportSelect(s)}
                      className="capitalize"
                    >
                      {s === 'baseball' ? '⚾' : '🥎'} {s}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Positions */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Position(s) <span className="text-muted-foreground text-xs">(up to 3)</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {positions.map(pos => (
                    <Badge
                      key={pos}
                      variant={selectedPositions.includes(pos) ? 'default' : 'outline'}
                      className="cursor-pointer transition-all"
                      onClick={() => togglePosition(pos)}
                    >
                      {selectedPositions.includes(pos) && <Check className="h-3 w-3 mr-1" />}
                      {pos}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Level */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Level of Play</p>
                <div className="flex flex-wrap gap-1.5">
                  {LEVELS.map(l => (
                    <Badge
                      key={l}
                      variant={level === l ? 'default' : 'outline'}
                      className="cursor-pointer transition-all"
                      onClick={() => setLevel(l)}
                    >
                      {l}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 gap-2"
              >
                {saving ? 'Saving...' : 'Continue'} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Core Actions Overview */}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                How It Works
              </DialogTitle>
              <DialogDescription>Here's what you can do every day</DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              {coreActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{action.title}</p>
                      <p className="text-xs text-muted-foreground">{action.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1 gap-2">
                Almost Done <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {/* Step 3: First Action */}
        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                Take Your First Action
              </DialogTitle>
              <DialogDescription>Jump right in — pick one to start</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <Button
                onClick={() => handleComplete('/practice')}
                className="w-full h-16 text-left justify-start gap-4"
                size="lg"
              >
                <div className="p-2 rounded-lg bg-primary-foreground/20">
                  <Dumbbell className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold">Log First Practice</p>
                  <p className="text-xs opacity-80">Start tracking reps right away</p>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleComplete('/practice')}
                className="w-full h-16 text-left justify-start gap-4"
                size="lg"
              >
                <div className="p-2 rounded-lg bg-muted">
                  <Video className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold">Upload First Video</p>
                  <p className="text-xs text-muted-foreground">Analyze your mechanics</p>
                </div>
              </Button>
            </div>

            <Button variant="ghost" onClick={() => setStep(2)} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
