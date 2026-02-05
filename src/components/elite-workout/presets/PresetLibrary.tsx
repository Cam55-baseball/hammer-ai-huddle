import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useWorkoutPresets, WorkoutPreset } from '@/hooks/useWorkoutPresets';
import { WorkoutBlock } from '@/types/eliteWorkout';
import { PresetCard } from './PresetCard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Dumbbell, Lock, User } from 'lucide-react';

interface PresetLibraryProps {
  selectedSport: 'baseball' | 'softball';
  onSelectPreset: (blocks: WorkoutBlock[], presetName: string) => void;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'explosive_lower', label: 'Explosive Lower' },
  { value: 'elastic_day', label: 'Elastic Day' },
  { value: 'game_day_prime', label: 'Game Day Prime' },
  { value: 'fascial_recovery', label: 'Fascial Recovery' },
  { value: 'upper_power', label: 'Upper Power' },
  { value: 'speed_development', label: 'Speed Development' },
];

const DIFFICULTIES = [
  { value: 'all', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export function PresetLibrary({ selectedSport, onSelectPreset }: PresetLibraryProps) {
  const { t } = useTranslation();
  const { presets, systemPresets, userPresets, loading } = useWorkoutPresets(selectedSport);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'hammers' | 'mine'>('hammers');

  const filterPresets = (presetList: WorkoutPreset[]) => {
    return presetList.filter(preset => {
      const matchesSearch = !searchQuery || 
        preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (preset.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'all' || preset.category === categoryFilter;
      const matchesDifficulty = difficultyFilter === 'all' || 
        preset.difficulty === difficultyFilter ||
        preset.difficulty === 'all';
      
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  };

  const handleUsePreset = (preset: WorkoutPreset) => {
    onSelectPreset(preset.blocks, preset.name);
  };

  const handleDuplicatePreset = (preset: WorkoutPreset) => {
    // For now, just use it - the builder will handle saving as new
    onSelectPreset(preset.blocks, `${preset.name} (Copy)`);
  };

  const filteredSystemPresets = filterPresets(systemPresets);
  const filteredUserPresets = filterPresets(userPresets);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
          <Dumbbell className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">
            {t('eliteWorkout.presets.title', 'Elite Presets')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('eliteWorkout.presets.description', 'Professional training templates ready to use')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search', 'Search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {t(`eliteWorkout.presets.categories.${cat.value}`, cat.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTIES.map(diff => (
              <SelectItem key={diff.value} value={diff.value}>
                {t(`eliteWorkout.presets.difficulty.${diff.value}`, diff.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'hammers' | 'mine')}>
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="hammers" className="gap-2">
            <Lock className="h-4 w-4" />
            {t('eliteWorkout.presets.systemPresets', 'Hammers Presets')}
            <Badge variant="secondary" className="ml-1">
              {filteredSystemPresets.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="mine" className="gap-2">
            <User className="h-4 w-4" />
            {t('eliteWorkout.presets.myPresets', 'My Presets')}
            <Badge variant="secondary" className="ml-1">
              {filteredUserPresets.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hammers" className="mt-4">
          {filteredSystemPresets.length === 0 ? (
            <Card className="py-12 text-center">
              <CardContent>
                <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {t('eliteWorkout.presets.noPresets', 'No presets match your filters')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSystemPresets.map(preset => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  onUse={handleUsePreset}
                  onDuplicate={handleDuplicatePreset}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          {filteredUserPresets.length === 0 ? (
            <Card className="py-12 text-center">
              <CardContent>
                <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-2">
                  {t('eliteWorkout.presets.noUserPresets', 'You haven\'t saved any presets yet')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('eliteWorkout.presets.saveHint', 'Create a workout and save it as a preset to reuse later')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUserPresets.map(preset => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  onUse={handleUsePreset}
                  onDuplicate={handleDuplicatePreset}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
