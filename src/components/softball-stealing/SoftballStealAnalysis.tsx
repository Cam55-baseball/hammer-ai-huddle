import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Trophy, Target, Zap, TrendingUp, Footprints, Shield, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SoftballStealProfile, Grade } from '@/lib/softballStealAnalytics';

interface Props {
  profile: SoftballStealProfile;
  avgTime: number;
  bestTime: number;
  baseDist: number;
  repsCount: number;
}

function gradeColor(g: Grade) {
  switch (g) {
    case 'Elite': return 'text-green-500';
    case 'Above Average': return 'text-blue-500';
    case 'Average': return 'text-yellow-500';
    case 'Below Average': return 'text-red-500';
  }
}

function gradeBadgeVariant(g: Grade): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (g) {
    case 'Elite': return 'default';
    case 'Above Average': return 'secondary';
    case 'Average': return 'outline';
    case 'Below Average': return 'destructive';
  }
}

export function SoftballStealAnalysis({ profile, avgTime, bestTime, baseDist, repsCount }: Props) {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold flex items-center justify-center gap-2">
          <Target className="h-5 w-5 text-primary" /> Performance Intelligence
        </h2>
        <p className="text-sm text-muted-foreground">{baseDist}ft · {repsCount} reps analyzed</p>
      </div>

      {/* Steal Efficiency Score */}
      <Card className="border-primary/30">
        <CardContent className="pt-5 text-center space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Steal Efficiency Score</p>
          <p className="text-5xl font-black text-primary">{profile.stealEfficiencyScore}</p>
          <Progress value={profile.stealEfficiencyScore} className="h-2" />
        </CardContent>
      </Card>

      {/* Performance Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Jump Quality', grade: profile.jumpQuality.grade, value: `${profile.jumpQuality.percentile}%` },
            { label: 'Acceleration', grade: profile.accelerationEfficiency.grade, value: `${profile.accelerationEfficiency.pct}%` },
            { label: 'Stride Efficiency', grade: profile.strideEfficiency.grade, value: `${profile.strideEfficiency.strideLength} ft/step` },
            { label: 'Steal Time', grade: profile.stealTimeRating.grade, value: `Top ${100 - profile.stealTimeRating.percentile}%` },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-sm">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">{item.value}</span>
                <Badge variant={gradeBadgeVariant(item.grade)} className="text-xs">{item.grade}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Elite Analytics #1: Catcher Pop-Time Matchup */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Catcher Pop-Time Matchup Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Projected steal success rate (avg pitcher)</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'vs Elite', value: profile.catcherMatchup.vsElite, sub: '1.70s pop' },
              { label: 'vs Average', value: profile.catcherMatchup.vsAverage, sub: '1.85s pop' },
              { label: 'vs Slow', value: profile.catcherMatchup.vsSlow, sub: '2.00s pop' },
            ].map(c => (
              <div key={c.label} className="p-3 rounded-lg bg-muted/40">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold">{c.value}%</p>
                <p className="text-[10px] text-muted-foreground">{c.sub}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Elite Analytics #2: Optimal Stride Model */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Footprints className="h-4 w-4 text-primary" /> Optimal Stride Model
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-lg bg-muted/40">
              <p className="text-xs text-muted-foreground">Current Stride</p>
              <p className="text-xl font-bold">{profile.strideModel.currentStride} ft</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <p className="text-xs text-muted-foreground">Optimal Stride</p>
              <p className="text-xl font-bold text-primary">{profile.strideModel.optimalStride} ft</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic">{profile.strideModel.recommendation}</p>
        </CardContent>
      </Card>

      {/* Elite Analytics #3: Explosive Start Index */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Explosive Start Index
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-2">
          <p className="text-5xl font-black">{profile.explosiveStartIndex}</p>
          <Badge variant={gradeBadgeVariant(profile.explosiveStartGrade)} className="text-sm">
            {profile.explosiveStartGrade}
          </Badge>
          <p className="text-xs text-muted-foreground">Scale: 0–100 · Elite runners score 85+</p>
        </CardContent>
      </Card>

      {/* Benchmark Comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Session Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg Time to Base</span>
            <span className="font-semibold tabular-nums">{avgTime.toFixed(2)}s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Best Time</span>
            <span className="font-semibold tabular-nums">{bestTime.toFixed(2)}s</span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => navigate('/practice')}>
          Back to Practice Hub
        </Button>
        <Button className="flex-1" onClick={() => navigate('/players-club')}>
          Players Club <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
