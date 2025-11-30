import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Calendar, CheckCircle2, Sparkles } from "lucide-react";
import { getDailyQuote } from "@/lib/motivationalQuotes";

interface ProgressTrackerProps {
  completionPercentage: number;
  completedWorkouts: number;
  totalWorkouts: number;
  currentBlock: number;
  daysRemaining: number;
  exitVelocity?: number | null;
  exitVelocityPrevious?: number | null;
  exitVelocityLastUpdated?: string | null;
  distance?: number | null;
  distancePrevious?: number | null;
  distanceLastUpdated?: string | null;
  progressId?: string;
  onUpdateMetrics?: (exitVelocity: number, distance: number) => Promise<void>;
  moduleType?: 'hitting' | 'pitching';
}

export function ProgressTracker({
  completionPercentage,
  completedWorkouts,
  totalWorkouts,
  currentBlock,
  daysRemaining,
  exitVelocity,
  exitVelocityPrevious,
  exitVelocityLastUpdated,
  distance,
  distancePrevious,
  distanceLastUpdated,
  progressId,
  onUpdateMetrics,
  moduleType = 'hitting',
}: ProgressTrackerProps) {
  const [localExitVelocity, setLocalExitVelocity] = React.useState<string>(exitVelocity?.toString() || '');
  const [localDistance, setLocalDistance] = React.useState<string>(distance?.toString() || '');
  const [isUpdating, setIsUpdating] = React.useState(false);

  const canUnlockNextBlock = completionPercentage >= 70;
  const quote = getDailyQuote();

  const metric1Label = moduleType === 'pitching' ? 'Velocity' : 'Exit Velocity';
  const metric2Label = moduleType === 'pitching' ? 'Long Toss Distance' : 'Distance';
  const metricsDescription = moduleType === 'pitching' 
    ? 'Track your pitching power metrics! Update your Velocity and Long Toss Distance every 2 months to measure your improvement.'
    : 'Track your hitting power metrics! Update your Exit Velocity and Distance every 2 months to measure your improvement.';

  // Check if user can update metrics (2 months = 60 days)
  const canUpdateMetrics = React.useMemo(() => {
    if (!exitVelocityLastUpdated && !distanceLastUpdated) return true; // First entry
    
    const lastUpdate = exitVelocityLastUpdated || distanceLastUpdated;
    if (!lastUpdate) return true;
    
    const lastUpdateDate = new Date(lastUpdate);
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    
    return lastUpdateDate <= twoMonthsAgo;
  }, [exitVelocityLastUpdated, distanceLastUpdated]);

  // Calculate days until next update
  const daysUntilUpdate = React.useMemo(() => {
    if (canUpdateMetrics) return 0;
    
    const lastUpdate = exitVelocityLastUpdated || distanceLastUpdated;
    if (!lastUpdate) return 0;
    
    const lastUpdateDate = new Date(lastUpdate);
    const nextUpdateDate = new Date(lastUpdateDate);
    nextUpdateDate.setMonth(nextUpdateDate.getMonth() + 2);
    
    const daysRemaining = Math.ceil((nextUpdateDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
  }, [canUpdateMetrics, exitVelocityLastUpdated, distanceLastUpdated]);

  const showExitVelocityImprovement = exitVelocity && exitVelocityPrevious && exitVelocity > exitVelocityPrevious;
  const showDistanceImprovement = distance && distancePrevious && distance > distancePrevious;

  const handleUpdateClick = async () => {
    if (!onUpdateMetrics || !progressId) return;
    
    const exitVelValue = parseFloat(localExitVelocity);
    const distanceValue = parseFloat(localDistance);
    
    if (isNaN(exitVelValue) || isNaN(distanceValue)) {
      alert('Please enter valid numbers for both metrics');
      return;
    }
    
    if (exitVelValue <= 0 || distanceValue <= 0) {
      alert('Values must be greater than 0');
      return;
    }
    
    setIsUpdating(true);
    try {
      await onUpdateMetrics(exitVelValue, distanceValue);
    } finally {
      setIsUpdating(false);
    }
  };

  React.useEffect(() => {
    if (exitVelocity) setLocalExitVelocity(exitVelocity.toString());
    if (distance) setLocalDistance(distance.toString());
  }, [exitVelocity, distance]);

  return (
    <Card className="p-4 sm:p-6 space-y-4">
      {/* Daily Motivational Quote */}
      <div className="pb-3 border-b">
        <div className="flex items-start gap-2">
          <Sparkles className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm sm:text-base font-medium bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent leading-relaxed">
              "{quote.text}"
            </p>
            <p className="text-xs text-muted-foreground mt-1">— {quote.author}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Your Progress</h3>
        <Trophy className={canUnlockNextBlock ? "h-5 w-5 text-primary" : "h-5 w-5 text-muted-foreground"} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Completion</span>
          <span className="font-medium">{completionPercentage.toFixed(0)}%</span>
        </div>
        <Progress value={completionPercentage} className="h-2" />
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Workouts</span>
          </div>
          <p className="text-lg sm:text-xl font-bold">{completedWorkouts}/{totalWorkouts}</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Days Left</span>
          </div>
          <p className="text-lg sm:text-xl font-bold">{daysRemaining}</p>
        </div>
      </div>

      {canUnlockNextBlock ? (
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-primary">
            <Trophy className="h-5 w-5" />
            <p className="text-sm font-medium">Ready to unlock Block {currentBlock + 1}!</p>
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Complete {Math.ceil((70 - completionPercentage) * totalWorkouts / 100)} more workouts to unlock the next block
          </p>
        </div>
      )}

      {/* Power Metrics Section */}
      <div className="pt-4 border-t space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          📊 Power Metrics
        </h4>
        
        <p className="text-xs text-muted-foreground">
          {metricsDescription}
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Metric 1 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {metric1Label} (mph)
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={localExitVelocity}
                onChange={(e) => setLocalExitVelocity(e.target.value)}
                disabled={!canUpdateMetrics || isUpdating}
                placeholder={exitVelocity ? exitVelocity.toString() : '0.0'}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                step="0.1"
                min="0"
              />
              {showExitVelocityImprovement && (
                <span className="text-green-500 text-lg" title="Improved!">↑</span>
              )}
            </div>
            {exitVelocityLastUpdated && (
              <p className="text-xs text-muted-foreground">
                Last: {new Date(exitVelocityLastUpdated).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Metric 2 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {metric2Label} (ft)
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={localDistance}
                onChange={(e) => setLocalDistance(e.target.value)}
                disabled={!canUpdateMetrics || isUpdating}
                placeholder={distance ? distance.toString() : '0.0'}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                step="0.1"
                min="0"
              />
              {showDistanceImprovement && (
                <span className="text-green-500 text-lg" title="Improved!">↑</span>
              )}
            </div>
            {distanceLastUpdated && (
              <p className="text-xs text-muted-foreground">
                Last: {new Date(distanceLastUpdated).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Update Button */}
        <button
          onClick={handleUpdateClick}
          disabled={!canUpdateMetrics || isUpdating || !onUpdateMetrics}
          className="w-full h-9 px-4 py-2 bg-primary text-primary-foreground shadow hover:bg-primary/90 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          {isUpdating ? 'Updating...' : canUpdateMetrics ? 'Update Metrics' : `⏳ ${daysUntilUpdate} days until next update`}
        </button>
      </div>
    </Card>
  );
}