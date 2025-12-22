import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

interface S2RadarChartProps {
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
}

const areaLabels: Record<string, string> = {
  processing_speed: 'Processing',
  decision_efficiency: 'Decision',
  visual_motor: 'Visual-Motor',
  visual_tracking: 'Tracking',
  peripheral_awareness: 'Peripheral',
  processing_under_load: 'Under Load',
  impulse_control: 'Impulse',
  fatigue_index: 'Fatigue',
};

export const S2RadarChart = ({ scores, previousScores }: S2RadarChartProps) => {
  const data = Object.entries(scores).map(([key, value]) => ({
    area: areaLabels[key] || key,
    current: value,
    previous: previousScores?.[key as keyof typeof previousScores] ?? null,
    fullMark: 100,
  }));

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.3} />
          <PolarAngleAxis 
            dataKey="area" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickLine={false}
          />
          <PolarRadiusAxis 
            angle={22.5} 
            domain={[0, 100]} 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
            axisLine={false}
            tickCount={5}
          />
          {previousScores && (
            <Radar
              name="Previous"
              dataKey="previous"
              stroke="hsl(var(--muted-foreground))"
              fill="hsl(var(--muted-foreground))"
              fillOpacity={0.1}
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          )}
          <Radar
            name="Current"
            dataKey="current"
            stroke="hsl(180 60% 50%)"
            fill="hsl(180 60% 50%)"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string) => [
              `${value}`,
              name === 'current' ? 'Current' : 'Previous'
            ]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
