import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Mic, MicOff, Loader2, AlertCircle, Check, RotateCcw } from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MealTypeSelector, MEAL_TYPES } from './MealTypeSelector';
import { RecipeIngredient } from '@/hooks/useRecipes';

interface ParsedFood {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: 'high' | 'medium' | 'low';
  selected: boolean;
}

interface VoiceFoodLoggerProps {
  onFoodsLogged: (mealType: string, foods: RecipeIngredient[]) => void;
}

type LoggerState = 'idle' | 'listening' | 'processing' | 'results' | 'error';

export function VoiceFoodLogger({ onFoodsLogged }: VoiceFoodLoggerProps) {
  const { t } = useTranslation();
  const {
    isListening,
    transcript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
  } = useVoiceInput();

  const [state, setState] = useState<LoggerState>('idle');
  const [parsedFoods, setParsedFoods] = useState<ParsedFood[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mealTypeSelectorOpen, setMealTypeSelectorOpen] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play sound feedback
  const playSound = useCallback((type: 'start' | 'stop' | 'success' | 'error') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      switch (type) {
        case 'start':
          oscillator.frequency.value = 440; // A4
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
        case 'stop':
          oscillator.frequency.setValueAtTime(660, ctx.currentTime); // E5
          oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
          break;
        case 'success':
          oscillator.frequency.setValueAtTime(880, ctx.currentTime);
          oscillator.frequency.setValueAtTime(1320, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.25);
          break;
        case 'error':
          oscillator.frequency.value = 220; // A3
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
      }
    } catch {
      // Silently fail if audio isn't available
    }
  }, []);

  const handleStartListening = useCallback(() => {
    resetTranscript();
    setParsedFoods([]);
    setParseError(null);
    setState('listening');
    
    // Haptic + sound feedback
    if (navigator.vibrate) navigator.vibrate(50);
    playSound('start');
    
    startListening();
  }, [startListening, resetTranscript, playSound]);

  const handleStopListening = useCallback(async () => {
    stopListening();
    
    // Haptic + sound feedback
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    playSound('stop');

    const finalTranscript = transcript.trim();
    
    if (!finalTranscript) {
      setState('error');
      setParseError(t('nutrition.voice.noSpeech', "Didn't catch that. Please try speaking again."));
      return;
    }

    setState('processing');

    try {
      const { data, error } = await supabase.functions.invoke('parse-voice-food', {
        body: { transcript: finalTranscript }
      });

      if (error) {
        throw new Error(error.message || 'Failed to parse foods');
      }

      if (!data.foods || data.foods.length === 0) {
        throw new Error('No foods could be identified from your description');
      }

      // Add selected state to each food
      const foodsWithSelection = data.foods.map((food: Omit<ParsedFood, 'selected'>) => ({
        ...food,
        selected: true
      }));

      setParsedFoods(foodsWithSelection);
      setState('results');
      playSound('success');
      
      if (navigator.vibrate) navigator.vibrate(100);

    } catch (err) {
      console.error('Error parsing voice food:', err);
      setState('error');
      setParseError(err instanceof Error ? err.message : 'Failed to parse food description');
      playSound('error');
    }
  }, [stopListening, transcript, t, playSound]);

  const toggleFoodSelection = useCallback((index: number) => {
    setParsedFoods(prev => prev.map((food, i) => 
      i === index ? { ...food, selected: !food.selected } : food
    ));
  }, []);

  const handleLogSelected = useCallback(() => {
    const selectedFoods = parsedFoods.filter(f => f.selected);
    if (selectedFoods.length === 0) {
      toast.error(t('nutrition.voice.selectAtLeastOne', 'Please select at least one food item'));
      return;
    }
    setMealTypeSelectorOpen(true);
  }, [parsedFoods, t]);

  const handleMealTypeSelected = useCallback((mealType: string) => {
    const selectedFoods = parsedFoods.filter(f => f.selected);
    
    const ingredients: RecipeIngredient[] = selectedFoods.map(food => ({
      name: `${food.name} (${food.quantity} ${food.unit})`,
      quantity: food.quantity,
      unit: food.unit,
      calories: food.calories,
      protein_g: food.protein,
      carbs_g: food.carbs,
      fats_g: food.fats,
    }));

    onFoodsLogged(mealType, ingredients);
    
    // Reset state
    setState('idle');
    setParsedFoods([]);
    resetTranscript();
    setMealTypeSelectorOpen(false);
    
    toast.success(t('nutrition.voice.logged', 'Logged {{count}} items to {{meal}}', {
      count: selectedFoods.length,
      meal: t(`nutrition.mealTypes.${mealType}`, mealType)
    }));
  }, [parsedFoods, onFoodsLogged, resetTranscript, t]);

  const handleReset = useCallback(() => {
    setState('idle');
    setParsedFoods([]);
    setParseError(null);
    resetTranscript();
  }, [resetTranscript]);

  // Calculate totals for selected foods
  const selectedTotals = parsedFoods
    .filter(f => f.selected)
    .reduce(
      (acc, food) => ({
        calories: acc.calories + food.calories,
        protein: acc.protein + food.protein,
        carbs: acc.carbs + food.carbs,
        fats: acc.fats + food.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

  // Not supported fallback
  if (!isSupported) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          <MicOff className="h-5 w-5 mx-auto mb-2 opacity-50" />
          {t('nutrition.voice.notSupported', 'Voice input is not supported in this browser. Try Chrome or Safari.')}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn(
        "transition-all duration-200",
        state === 'listening' && "border-violet-500/50 bg-violet-500/5",
        state === 'error' && "border-destructive/50"
      )}>
        <CardContent className="py-4 space-y-3">
          {/* Idle State */}
          {state === 'idle' && (
            <Button
              variant="outline"
              className="w-full gap-2 h-12 hover:bg-violet-500/10 hover:border-violet-500/50"
              onClick={handleStartListening}
            >
              <Mic className="h-5 w-5 text-violet-500" />
              {t('nutrition.voice.sayWhatYouAte', 'Say what you ate...')}
            </Button>
          )}

          {/* Listening State */}
          {state === 'listening' && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-red-500/30" />
                  <div className="relative h-4 w-4 rounded-full bg-red-500" />
                </div>
                <span className="text-sm font-medium">
                  {t('nutrition.voice.listening', 'Listening...')}
                </span>
              </div>
              
              <div className="min-h-[40px] p-3 bg-muted/50 rounded-lg text-sm">
                {transcript && <span>{transcript} </span>}
                {interimTranscript && (
                  <span className="text-muted-foreground">{interimTranscript}</span>
                )}
                {!transcript && !interimTranscript && (
                  <span className="text-muted-foreground italic">
                    {t('nutrition.voice.speakNow', 'Speak now...')}
                  </span>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleStopListening}
              >
                <MicOff className="h-4 w-4 mr-2" />
                {t('nutrition.voice.stopAndParse', 'Done Speaking')}
              </Button>
            </div>
          )}

          {/* Processing State */}
          {state === 'processing' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              <span className="text-sm text-muted-foreground">
                {t('nutrition.voice.parsing', 'Parsing your food...')}
              </span>
            </div>
          )}

          {/* Results State */}
          {state === 'results' && parsedFoods.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                <Check className="h-4 w-4" />
                {t('nutrition.voice.foundItems', 'Found {{count}} items:', { count: parsedFoods.length })}
              </div>

              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {parsedFoods.map((food, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-start gap-3 p-2 rounded-lg border transition-colors",
                      food.selected ? "bg-background" : "bg-muted/30 opacity-60"
                    )}
                  >
                    <Checkbox
                      checked={food.selected}
                      onCheckedChange={() => toggleFoodSelection(index)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {food.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({food.quantity} {food.unit})
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {food.calories} cal · {food.protein}g P · {food.carbs}g C · {food.fats}g F
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="p-2 bg-muted/50 rounded-lg text-xs font-medium">
                <span className="text-muted-foreground">{t('nutrition.voice.total', 'Total')}: </span>
                {selectedTotals.calories} cal · {selectedTotals.protein}g P · {selectedTotals.carbs}g C · {selectedTotals.fats}g F
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  {t('nutrition.voice.tryAgain', 'Try Again')}
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleLogSelected}
                  disabled={!parsedFoods.some(f => f.selected)}
                >
                  {t('nutrition.voice.logSelected', 'Log Selected')}
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{parseError || voiceError}</span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('nutrition.voice.tryAgain', 'Try Again')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meal Type Selector */}
      <MealTypeSelector
        open={mealTypeSelectorOpen}
        onOpenChange={setMealTypeSelectorOpen}
        onSelect={handleMealTypeSelected}
        title={t('nutrition.selectMealTypeFor', 'Add to which meal?')}
      />
    </>
  );
}
