import { Slider } from '@/components/ui/slider';

const gradeLabels: Record<number, string> = {
  1: 'Needs Work',
  2: 'Developing',
  3: 'Solid',
  4: 'Strong',
  5: 'Elite',
};

// Maps 1-5 slider to 20-80 scout scale
function sliderToScoutGrade(value: number): number {
  return Math.round(20 + ((value - 1) / 4) * 60);
}

function scoutGradeToSlider(grade: number): number {
  return Math.round(1 + ((grade - 20) / 60) * 4);
}

interface ExecutionSliderProps {
  value: number; // 20-80 scale
  onChange: (value: number) => void;
}

export function ExecutionSlider({ value, onChange }: ExecutionSliderProps) {
  const sliderValue = scoutGradeToSlider(value);
  const label = gradeLabels[sliderValue] ?? 'Solid';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-muted-foreground">Execution</label>
        <span className="text-sm font-semibold text-primary">{label} ({value})</span>
      </div>
      <Slider
        min={1}
        max={5}
        step={1}
        value={[sliderValue]}
        onValueChange={([v]) => onChange(sliderToScoutGrade(v))}
        className="w-full"
      />
      <div className="flex justify-between mt-1">
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} className="text-[10px] text-muted-foreground">{n}</span>
        ))}
      </div>
    </div>
  );
}
