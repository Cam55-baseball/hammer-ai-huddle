import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Trophy, Target, AlertTriangle } from "lucide-react";

interface ScorecardItem {
  area: string;
  description: string;
  trend?: string;
}

interface ScoreTrend {
  direction: "improving" | "declining" | "stable";
  average_change: number;
  comparison_to_first: number;
}

interface ScorecardData {
  improvements: ScorecardItem[];
  regressions: ScorecardItem[];
  neutral: ScorecardItem[];
  overall_trend: string;
  score_trend?: ScoreTrend;
  is_first_analysis: boolean;
  historical_scores?: number[];
}

interface TheScorecardProps {
  scorecard: ScorecardData;
  currentScore: number;
}

export function TheScorecard({ scorecard, currentScore }: TheScorecardProps) {
  if (!scorecard) return null;

  const { improvements, regressions, neutral, overall_trend, score_trend, is_first_analysis, historical_scores } = scorecard;

  // First analysis - show baseline message
  if (is_first_analysis) {
    return (
      <Card className="p-4 sm:p-6 bg-gradient-to-br from-primary/5 via-background to-primary/10 border-2 border-primary/30">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary">📊 THE SCORECARD</h3>
              <p className="text-sm text-muted-foreground">Your Progress Report</p>
            </div>
          </div>
          
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">Baseline Established!</span>
            </div>
            <p className="text-sm text-muted-foreground">
              This is your first analysis in this module. Your current score of <span className="font-bold text-foreground">{currentScore}/100</span> will serve as your baseline. 
              Future uploads will track your progress against today's performance.
            </p>
          </div>
          
          <p className="text-xs text-muted-foreground italic">
            Keep training and uploading videos to see your improvement over time!
          </p>
        </div>
      </Card>
    );
  }

  // Format score history display
  const formatScoreHistory = () => {
    if (!historical_scores || historical_scores.length === 0) return null;
    const scores = [...historical_scores, currentScore];
    return scores.join(' → ');
  };

  // Get trend icon and color
  const getTrendDisplay = (direction: string) => {
    switch (direction) {
      case 'improving':
        return { icon: TrendingUp, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' };
      case 'declining':
        return { icon: TrendingDown, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' };
      default:
        return { icon: Minus, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' };
    }
  };

  const trendDisplay = score_trend ? getTrendDisplay(score_trend.direction) : null;
  const TrendIcon = trendDisplay?.icon || Minus;

  return (
    <Card className="p-4 sm:p-6 bg-gradient-to-br from-primary/5 via-background to-secondary/10 border-2 border-primary/30 overflow-hidden">
      <div className="space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shadow-lg">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-primary">📊 THE SCORECARD</h3>
            <p className="text-sm text-muted-foreground">Your Progress Report</p>
          </div>
        </div>

        {/* Score Trend Section */}
        {score_trend && (
          <div className={`p-3 rounded-lg ${trendDisplay?.bg} border border-border/50`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <TrendIcon className={`h-5 w-5 ${trendDisplay?.color}`} />
                <span className={`font-semibold ${trendDisplay?.color}`}>
                  Score Trend: {score_trend.direction === 'improving' ? 'Improving' : score_trend.direction === 'declining' ? 'Declining' : 'Stable'}
                </span>
              </div>
              {score_trend.comparison_to_first !== 0 && (
                <span className={`text-sm font-medium ${score_trend.comparison_to_first > 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {score_trend.comparison_to_first > 0 ? '+' : ''}{score_trend.comparison_to_first} from first
                </span>
              )}
            </div>
            {historical_scores && historical_scores.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1 font-mono">
                {formatScoreHistory()}
              </p>
            )}
          </div>
        )}

        {/* Improvements Section */}
        {improvements && improvements.length > 0 && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-500/50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h4 className="font-semibold text-green-700 dark:text-green-300">IMPROVEMENTS</h4>
            </div>
            <ul className="space-y-2">
              {improvements.map((item, index) => (
                <li key={index} className="text-sm">
                  <span className="font-medium text-green-800 dark:text-green-200">• {item.area}:</span>{' '}
                  <span className="text-green-900 dark:text-green-100">{item.description}</span>
                  {item.trend && (
                    <span className="text-xs text-green-600 dark:text-green-400 ml-1">({item.trend})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Regressions Section */}
        {regressions && regressions.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-500/50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h4 className="font-semibold text-amber-700 dark:text-amber-300">NEEDS ATTENTION</h4>
            </div>
            <ul className="space-y-2">
              {regressions.map((item, index) => (
                <li key={index} className="text-sm">
                  <span className="font-medium text-amber-800 dark:text-amber-200">• {item.area}:</span>{' '}
                  <span className="text-amber-900 dark:text-amber-100">{item.description}</span>
                  {item.trend && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 ml-1">({item.trend})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Neutral/Holding Steady Section */}
        {neutral && neutral.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-500/50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <Minus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h4 className="font-semibold text-blue-700 dark:text-blue-300">HOLDING STEADY</h4>
            </div>
            <ul className="space-y-2">
              {neutral.map((item, index) => (
                <li key={index} className="text-sm">
                  <span className="font-medium text-blue-800 dark:text-blue-200">• {item.area}:</span>{' '}
                  <span className="text-blue-900 dark:text-blue-100">{item.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Overall Trend Summary */}
        {overall_trend && (
          <div className="pt-3 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Overall:</span> {overall_trend}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
