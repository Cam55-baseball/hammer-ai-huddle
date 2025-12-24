import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Footprints, Clock, Zap, Timer, Mountain, TrendingUp, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RunningPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  preset_data: any;
  difficulty: string;
  estimated_duration_minutes: number;
  is_system: boolean;
}

interface RunningPresetLibraryProps {
  selectedSport: 'baseball' | 'softball';
  onSelectPreset?: (preset: RunningPreset) => void;
  compact?: boolean;
}

const CATEGORY_ICONS: Record<string, typeof Footprints> = {
  intervals: Timer,
  tempo: TrendingUp,
  recovery: Footprints,
  distance: Mountain,
  speed: Zap,
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-500/20 text-green-500',
  intermediate: 'bg-yellow-500/20 text-yellow-500',
  advanced: 'bg-red-500/20 text-red-500',
};

export function RunningPresetLibrary({ selectedSport, onSelectPreset, compact = false }: RunningPresetLibraryProps) {
  const { t } = useTranslation();
  const [presets, setPresets] = useState<RunningPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const { data, error } = await supabase
          .from('running_presets')
          .select('*')
          .or(`sport.eq.${selectedSport},sport.eq.both`)
          .order('category', { ascending: true });

        if (error) throw error;
        setPresets(data || []);
      } catch (error) {
        console.error('Error fetching presets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPresets();
  }, [selectedSport]);

  const categories = ['all', ...new Set(presets.map(p => p.category))];
  
  const filteredPresets = selectedCategory === 'all' 
    ? presets 
    : presets.filter(p => p.category === selectedCategory);

  const handleSelectPreset = (preset: RunningPreset) => {
    if (onSelectPreset) {
      onSelectPreset(preset);
    } else {
      toast.success(t('runningPresets.selected', `Selected: ${preset.name}`));
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 h-32" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", compact && "space-y-2")}>
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Footprints className="h-5 w-5" />
              {t('runningPresets.title', 'Running Workout Presets')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('runningPresets.subtitle', 'Pre-built workouts for different training goals')}
            </p>
          </div>
        </div>
      )}

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className={cn("grid w-full", `grid-cols-${Math.min(categories.length, 6)}`)}>
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat} className="capitalize text-xs sm:text-sm">
              {cat === 'all' ? t('runningPresets.all', 'All') : t(`runningPresets.categories.${cat}`, cat)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-4">
          <ScrollArea className={compact ? "h-[300px]" : undefined}>
            <div className={cn(
              "grid gap-4",
              compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            )}>
              {filteredPresets.map(preset => {
                const CategoryIcon = CATEGORY_ICONS[preset.category] || Footprints;
                return (
                  <Card 
                    key={preset.id} 
                    className={cn(
                      "group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50",
                      compact && "p-3"
                    )}
                    onClick={() => handleSelectPreset(preset)}
                  >
                    <CardHeader className={cn("pb-2", compact && "p-0 pb-2")}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <CategoryIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{preset.name}</CardTitle>
                            {!compact && (
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {t(`runningPresets.categories.${preset.category}`, preset.category)}
                                </Badge>
                                <Badge className={cn("text-xs", DIFFICULTY_COLORS[preset.difficulty])}>
                                  {t(`runningPresets.difficulty.${preset.difficulty}`, preset.difficulty)}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    {!compact && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {preset.description}
                        </p>
                        {preset.estimated_duration_minutes && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            ~{preset.estimated_duration_minutes} min
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
