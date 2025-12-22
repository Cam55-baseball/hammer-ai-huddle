import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Target,
  Shield,
  AlertTriangle,
  Play,
  ChevronRight,
  Zap,
  Brain,
  Eye,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { S2RadarChart } from './S2RadarChart';
import { s2BaseballTranslations, getScoreLabel, scoreLabels } from '@/data/s2BaseballTranslations';
import { getUniqueDrillList } from '@/data/s2DrillRecommendations';

interface S2ResultsAnalysisProps {
  scores: {
    processing_speed: number;
    decision_efficiency: number;
    visual_motor: number;
    visual_tracking: number;
    peripheral_awareness: number;
    processing_under_load: number;
    impulse_control: number;
    fatigue_index: number;
  };
  previousScores?: {
    processing_speed: number | null;
    decision_efficiency: number | null;
    visual_motor: number | null;
    visual_tracking: number | null;
    peripheral_awareness: number | null;
    processing_under_load: number | null;
    impulse_control: number | null;
    fatigue_index: number | null;
  } | null;
  comparison?: {
    processing_speed_change: number | null;
    decision_efficiency_change: number | null;
    visual_motor_change: number | null;
    visual_tracking_change: number | null;
    peripheral_awareness_change: number | null;
    processing_under_load_change: number | null;
    impulse_control_change: number | null;
    fatigue_index_change: number | null;
    overall_change: number | null;
  } | null;
  onDone: () => void;
}

const scoreKeys = [
  { key: 'processing_speed', label: 'Processing Speed', changeKey: 'processing_speed_change' },
  { key: 'decision_efficiency', label: 'Decision Efficiency', changeKey: 'decision_efficiency_change' },
  { key: 'visual_motor', label: 'Visual-Motor', changeKey: 'visual_motor_change' },
  { key: 'visual_tracking', label: 'Visual Tracking', changeKey: 'visual_tracking_change' },
  { key: 'peripheral_awareness', label: 'Peripheral Awareness', changeKey: 'peripheral_awareness_change' },
  { key: 'processing_under_load', label: 'Processing Under Load', changeKey: 'processing_under_load_change' },
  { key: 'impulse_control', label: 'Impulse Control', changeKey: 'impulse_control_change' },
  { key: 'fatigue_index', label: 'Fatigue Index', changeKey: 'fatigue_index_change' },
];

export const S2ResultsAnalysis = ({ scores, previousScores, comparison, onDone }: S2ResultsAnalysisProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate overall score
  const overallScore = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
  );
  const scoreInfo = getScoreLabel(overallScore);

  // Get strengths and limiters (top 3 and bottom 3)
  const sortedScores = Object.entries(scores)
    .map(([key, value]) => ({ key, value, translation: s2BaseballTranslations[key] }))
    .sort((a, b) => b.value - a.value);

  const strengths = sortedScores.slice(0, 3);
  const limiters = sortedScores.slice(-3).reverse();

  // Get drill recommendations
  const recommendedDrills = getUniqueDrillList(scores);

  const getChangeDisplay = (change: number | null) => {
    if (change === null) return { icon: <Minus className="h-3 w-3" />, text: 'NEW', color: 'text-muted-foreground' };
    if (change > 0) return { icon: <TrendingUp className="h-3 w-3" />, text: `+${change}`, color: 'text-emerald-500' };
    if (change < 0) return { icon: <TrendingDown className="h-3 w-3" />, text: `${change}`, color: 'text-amber-500' };
    return { icon: <Minus className="h-3 w-3" />, text: '0', color: 'text-muted-foreground' };
  };

  const handleStartDrill = (drillId: string) => {
    // Navigate to Tex Vision with drill selected
    navigate('/tex-vision', { state: { startDrill: drillId } });
    onDone();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-4 max-w-2xl mx-auto"
    >
      {/* A. Overall Score Card */}
      <Card className={`${scoreInfo.borderColor} ${scoreInfo.bgColor}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-teal-400" />
              S2 Cognition Score
            </CardTitle>
            <Badge className={`${scoreInfo.bgColor} ${scoreInfo.color} border ${scoreInfo.borderColor}`}>
              {scoreInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={`text-5xl font-black ${scoreInfo.color}`}>{overallScore}</div>
              <div className="text-xs text-muted-foreground">out of 100</div>
            </div>
            <div className="flex-1 space-y-2">
              <Progress value={overallScore} className="h-3" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                {Object.values(scoreLabels).reverse().map(label => (
                  <span key={label.label} className={overallScore >= label.min && overallScore <= label.max ? label.color : ''}>
                    {label.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {comparison?.overall_change !== null && comparison?.overall_change !== undefined && (
            <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
              {comparison.overall_change > 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : comparison.overall_change < 0 ? (
                <TrendingDown className="h-4 w-4 text-amber-500" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm">
                {comparison.overall_change > 0 
                  ? `+${comparison.overall_change} points vs previous test` 
                  : comparison.overall_change < 0 
                    ? `${comparison.overall_change} points vs previous test`
                    : 'No change from previous test'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="overview" className="text-xs py-2">Overview</TabsTrigger>
          <TabsTrigger value="breakdown" className="text-xs py-2">Breakdown</TabsTrigger>
          <TabsTrigger value="field" className="text-xs py-2">On Field</TabsTrigger>
          <TabsTrigger value="training" className="text-xs py-2">Training</TabsTrigger>
        </TabsList>

        {/* B. Overview Tab - Radar Chart */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4 text-teal-400" />
                Cognitive Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <S2RadarChart scores={scores} previousScores={previousScores} />
              <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-teal-500 rounded" />
                  <span>Current</span>
                </div>
                {previousScores && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-muted-foreground rounded border-dashed" style={{ borderStyle: 'dashed' }} />
                    <span>Previous</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* D. Strengths vs Limiters */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-1.5 text-emerald-400">
                  <Target className="h-3.5 w-3.5" />
                  Cognitive Strengths
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {strengths.map(({ key, value, translation }) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="truncate">{translation?.area || key}</span>
                    <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">
                      {value}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-1.5 text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Cognitive Limiters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {limiters.map(({ key, value, translation }) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="truncate">{translation?.area || key}</span>
                    <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-[10px]">
                      {value}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* B. Detailed Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-3">
          {scoreKeys.map(({ key, label, changeKey }) => {
            const score = scores[key as keyof typeof scores];
            const change = comparison?.[changeKey as keyof typeof comparison] as number | null;
            const changeDisplay = getChangeDisplay(change);
            const itemScoreInfo = getScoreLabel(score);

            return (
              <Card key={key} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{label}</span>
                        <Badge className={`${itemScoreInfo.bgColor} ${itemScoreInfo.color} text-[10px]`}>
                          {itemScoreInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-bold ${itemScoreInfo.color}`}>{score}</span>
                        <div className={`flex items-center gap-0.5 text-xs ${changeDisplay.color}`}>
                          {changeDisplay.icon}
                          <span>{changeDisplay.text}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-16">
                      <Progress value={score} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* C. On Field / Baseball Translation Tab */}
        <TabsContent value="field" className="space-y-3">
          <Alert className="bg-teal-500/10 border-teal-500/30">
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs">
              How your cognitive scores translate to on-field performance
            </AlertDescription>
          </Alert>

          {scoreKeys.map(({ key }) => {
            const score = scores[key as keyof typeof scores];
            const translation = s2BaseballTranslations[key];
            if (!translation) return null;

            const isStrength = score >= 70;

            return (
              <Card key={key} className={`border-border/50 ${isStrength ? 'bg-emerald-500/5' : 'bg-amber-500/5'}`}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{translation.area}</span>
                    <Badge className={isStrength ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}>
                      {score} - {getScoreLabel(score).label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isStrength ? translation.highScoreMessage : translation.lowScoreMessage}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* E. Training Recommendations Tab */}
        <TabsContent value="training" className="space-y-3">
          <Alert className="bg-teal-500/10 border-teal-500/30">
            <Zap className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Recommended drills based on your cognitive limiters
            </AlertDescription>
          </Alert>

          {recommendedDrills.map((drill) => (
            <Card key={drill.drillId} className="border-border/50 hover:border-teal-500/30 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{drill.drillName}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {drill.tier}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{drill.description}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {drill.duration}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-teal-400 border-teal-500/30 hover:bg-teal-500/10"
                    onClick={() => handleStartDrill(drill.drillId)}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Start
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* F. Next Test Date */}
      <Alert className="bg-background/50 border-border/50">
        <Clock className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Your next S2 assessment will be available in 16 weeks on{' '}
          <strong>{format(addDays(new Date(), 112), 'MMMM d, yyyy')}</strong>
        </AlertDescription>
      </Alert>

      {/* Done Button */}
      <Button onClick={onDone} className="w-full bg-teal-600 hover:bg-teal-700">
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Done
      </Button>
    </motion.div>
  );
};
