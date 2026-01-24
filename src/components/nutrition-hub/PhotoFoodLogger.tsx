import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Camera, Upload, Loader2, AlertCircle, ImageIcon, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { MealTypeSelector, MEAL_TYPES } from './MealTypeSelector';
import { RecipeIngredient } from '@/hooks/useRecipes';

interface IdentifiedFood {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: 'high' | 'medium' | 'low';
  selected?: boolean;
}

interface PhotoFoodLoggerProps {
  onFoodsLogged: (mealType: string, foods: RecipeIngredient[]) => void;
}

type LoggerState = 'idle' | 'processing' | 'results' | 'error';

export function PhotoFoodLogger({ onFoodsLogged }: PhotoFoodLoggerProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [state, setState] = useState<LoggerState>('idle');
  const [identifiedFoods, setIdentifiedFoods] = useState<IdentifiedFood[]>([]);
  const [mealDescription, setMealDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [mealTypeSelectorOpen, setMealTypeSelectorOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Audio feedback
  const playSound = (type: 'capture' | 'success' | 'error') => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (type === 'capture') {
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.1;
        oscillator.start();
        setTimeout(() => oscillator.stop(), 100);
      } else if (type === 'success') {
        oscillator.frequency.value = 523.25;
        gainNode.gain.value = 0.1;
        oscillator.start();
        setTimeout(() => {
          oscillator.frequency.value = 659.25;
        }, 100);
        setTimeout(() => oscillator.stop(), 200);
      } else {
        oscillator.frequency.value = 300;
        gainNode.gain.value = 0.1;
        oscillator.start();
        setTimeout(() => oscillator.stop(), 200);
      }
    } catch (e) {
      console.log('Audio not available');
    }
  };

  // Haptic feedback
  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  // Process image to base64 with compression
  const processImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }

            // Resize to max 1024px while maintaining aspect ratio
            const maxDim = 1024;
            let width = img.width;
            let height = img.height;
            
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = (height / width) * maxDim;
                width = maxDim;
              } else {
                width = (width / height) * maxDim;
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to JPEG base64 at 80% quality
            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            // Remove the data URL prefix
            const base64Data = base64.split(',')[1];
            resolve(base64Data);
          };
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = e.target?.result as string;
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('nutrition.photo.invalidFile', 'Please select an image file'));
      return;
    }

    playSound('capture');
    vibrate(50);
    setState('processing');
    setErrorMessage('');

    try {
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);

      // Process and compress image
      const base64Image = await processImage(file);
      console.log('Image processed, size:', Math.round(base64Image.length / 1024), 'KB');

      // Call edge function
      const { data, error } = await supabase.functions.invoke('analyze-food-photo', {
        body: { imageBase64: base64Image }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to analyze photo');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.noFoodDetected) {
        playSound('error');
        vibrate([100, 50, 100]);
        setErrorMessage(t('nutrition.photo.noFood', 'No food detected in this image. Please try a clearer photo of your meal.'));
        setState('error');
        return;
      }

      if (data.imageQualityIssue) {
        console.log('Image quality note:', data.imageQualityIssue);
      }

      // Mark all foods as selected by default
      const foodsWithSelection = (data.foods || []).map((food: IdentifiedFood) => ({
        ...food,
        selected: true
      }));

      setIdentifiedFoods(foodsWithSelection);
      setMealDescription(data.mealDescription || '');
      
      playSound('success');
      vibrate(100);
      setState('results');

    } catch (err) {
      console.error('Photo analysis error:', err);
      playSound('error');
      vibrate([100, 50, 100]);
      
      const message = err instanceof Error ? err.message : 'Failed to analyze photo';
      setErrorMessage(message);
      setState('error');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const toggleFoodSelection = (index: number) => {
    setIdentifiedFoods(prev => 
      prev.map((food, i) => 
        i === index ? { ...food, selected: !food.selected } : food
      )
    );
  };

  const handleLogSelected = () => {
    const selectedFoods = identifiedFoods.filter(f => f.selected);
    if (selectedFoods.length === 0) {
      toast.error(t('nutrition.photo.selectAtLeastOne', 'Please select at least one food item'));
      return;
    }
    setMealTypeSelectorOpen(true);
  };

  const handleMealTypeSelected = (mealType: string) => {
    const selectedFoods = identifiedFoods.filter(f => f.selected);
    
    // Convert to RecipeIngredient format
    const ingredients: RecipeIngredient[] = selectedFoods.map(food => ({
      food_id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: food.name,
      quantity: food.quantity,
      unit: food.unit,
      calories: food.calories,
      protein_g: food.protein,
      carbs_g: food.carbs,
      fats_g: food.fats,
    }));

    onFoodsLogged(mealType, ingredients);
    
    const mealLabel = MEAL_TYPES.find(m => m.value === mealType)?.label || mealType;
    toast.success(t('nutrition.photo.logged', 'Added {{count}} items to {{meal}}', { 
      count: selectedFoods.length, 
      meal: mealLabel 
    }));

    handleReset();
  };

  const handleReset = () => {
    setState('idle');
    setIdentifiedFoods([]);
    setMealDescription('');
    setErrorMessage('');
    setPreviewImage(null);
    setMealTypeSelectorOpen(false);
  };

  // Calculate totals for selected foods
  const selectedTotals = identifiedFoods
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

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    const colors = {
      high: 'bg-green-500/20 text-green-700 dark:text-green-400',
      medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
      low: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
    };
    return (
      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', colors[confidence])}>
        {confidence}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Idle State - Two buttons */}
      {state === 'idle' && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2 hover:bg-emerald-500/10 hover:border-emerald-500/50"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-4 w-4 text-emerald-500" />
            {t('nutrition.photo.takePhoto', 'Take Photo')}
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2 hover:bg-emerald-500/10 hover:border-emerald-500/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 text-emerald-500" />
            {t('nutrition.photo.upload', 'Upload')}
          </Button>
        </div>
      )}

      {/* Processing State */}
      {state === 'processing' && (
        <Card className="p-4">
          <div className="flex flex-col items-center gap-3">
            {previewImage && (
              <div className="w-full max-w-[200px] aspect-square rounded-lg overflow-hidden bg-muted">
                <img 
                  src={previewImage} 
                  alt="Analyzing" 
                  className="w-full h-full object-cover opacity-50"
                />
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
              <span>{t('nutrition.photo.analyzing', 'Analyzing your meal...')}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Results State */}
      {state === 'results' && (
        <Card className="p-4 space-y-4">
          {/* Preview thumbnail */}
          {previewImage && (
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img 
                  src={previewImage} 
                  alt="Meal" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  ✨ {t('nutrition.photo.found', 'Found {{count}} items', { count: identifiedFoods.length })}
                </p>
                {mealDescription && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{mealDescription}</p>
                )}
              </div>
            </div>
          )}

          {/* Food list */}
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {identifiedFoods.map((food, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-lg transition-colors",
                  food.selected ? "bg-emerald-500/10" : "bg-muted/50 opacity-60"
                )}
              >
                <Checkbox
                  checked={food.selected}
                  onCheckedChange={() => toggleFoodSelection(index)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{food.name}</span>
                    {getConfidenceBadge(food.confidence)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {food.quantity} {food.unit}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {food.calories} cal • {food.protein}g P • {food.carbs}g C • {food.fats}g F
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="pt-2 border-t">
            <div className="text-sm font-medium">
              {t('nutrition.photo.selectedTotal', 'Selected Total')}:
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedTotals.calories} cal • {selectedTotals.protein}g P • {selectedTotals.carbs}g C • {selectedTotals.fats}g F
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('nutrition.photo.tryAgain', 'Try Again')}
            </Button>
            <Button 
              onClick={handleLogSelected} 
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={!identifiedFoods.some(f => f.selected)}
            >
              {t('nutrition.photo.logSelected', 'Log Selected')}
            </Button>
          </div>
        </Card>
      )}

      {/* Error State */}
      {state === 'error' && (
        <Card className="p-4">
          <div className="flex flex-col items-center gap-3 text-center">
            {previewImage && (
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted">
                <img 
                  src={previewImage} 
                  alt="Failed" 
                  className="w-full h-full object-cover opacity-50"
                />
              </div>
            )}
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{errorMessage}</span>
            </div>
            <Button variant="outline" onClick={handleReset} className="mt-2">
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('nutrition.photo.tryAgain', 'Try Again')}
            </Button>
          </div>
        </Card>
      )}

      {/* Meal Type Selector */}
      <MealTypeSelector
        open={mealTypeSelectorOpen}
        onOpenChange={setMealTypeSelectorOpen}
        onSelect={handleMealTypeSelected}
        title={t('nutrition.selectMealTypeFor', 'Add to which meal?')}
      />
    </div>
  );
}
