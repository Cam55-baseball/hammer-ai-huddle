import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Scale, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Target, AlertCircle } from 'lucide-react';
import { useWeightTracking } from '@/hooks/useWeightTracking';
import { WeightLogEntry } from './WeightLogEntry';
import { WeightProgressChart } from './WeightProgressChart';
import { WeightHistoryTable } from './WeightHistoryTable';

export function WeightTrackingSection() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  
  const { 
    entries, 
    stats, 
    loading, 
    addEntry, 
    updateEntry, 
    deleteEntry,
    getProjectedData 
  } = useWeightTracking();

  const projectedData = getProjectedData();

  const getStatusBadge = () => {
    if (!stats.currentWeight || !stats.targetWeight) return null;

    if (stats.onTrack) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-500">
          <TrendingUp className="h-3 w-3" />
          {t('nutrition.weight.onTrack', 'On Track')}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-500">
        <AlertCircle className="h-3 w-3" />
        {t('nutrition.weight.adjustNeeded', 'Adjust Needed')}
      </span>
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {t('nutrition.weight.title', 'Weight Tracking')}
                    {getStatusBadge()}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {stats.currentWeight ? (
                      <span className="flex items-center gap-3">
                        <span>{t('nutrition.weight.current', 'Current')}: <strong>{stats.currentWeight} lbs</strong></span>
                        {stats.targetWeight && (
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {t('nutrition.weight.target', 'Target')}: {stats.targetWeight} lbs
                          </span>
                        )}
                      </span>
                    ) : (
                      t('nutrition.weight.startTracking', 'Start tracking your weight to see progress')
                    )}
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Quick Stats Row */}
            {stats.currentWeight && (
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">{t('nutrition.weight.starting', 'Starting')}</p>
                  <p className="text-lg font-semibold">{stats.startingWeight?.toFixed(1)} lbs</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">{t('nutrition.weight.current', 'Current')}</p>
                  <p className="text-lg font-semibold">{stats.currentWeight.toFixed(1)} lbs</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">{t('nutrition.weight.totalChange', 'Change')}</p>
                  <p className={`text-lg font-semibold ${stats.totalChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {stats.totalChange >= 0 ? '+' : ''}{stats.totalChange.toFixed(1)} lbs
                  </p>
                </div>
              </div>
            )}

            {/* Log Entry Form */}
            <WeightLogEntry 
              onSubmit={addEntry}
              loading={loading}
              currentWeight={stats.currentWeight}
            />

            {/* Progress Chart */}
            <WeightProgressChart
              entries={entries}
              targetWeight={stats.targetWeight}
              projectedData={projectedData}
              stats={stats}
            />

            {/* History Table */}
            <WeightHistoryTable
              entries={entries}
              onUpdate={updateEntry}
              onDelete={deleteEntry}
              loading={loading}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
