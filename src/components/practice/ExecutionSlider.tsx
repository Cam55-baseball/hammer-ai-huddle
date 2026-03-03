import { cn } from '@/lib/utils';

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
  const steps = [1, 2, 3, 4, 5];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-muted-foreground">Execution</label>
        <span className="text-sm font-semibold text-primary">{label} ({value})</span>
      </div>
      <div className="flex items-center gap-0">
        {steps.map((n, i) => (
          <div key={n} className="flex items-center">
            <button
              type="button"
              onClick={() => onChange(sliderToScoutGrade(n))}
              className={cn(
                'relative flex flex-col items-center gap-1 group'
              )}
            >
              {/* Dot */}
              <div className={cn(
                'w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center text-[9px] font-bold',
                sliderValue === n
                  ? 'bg-primary border-primary text-primary-foreground scale-125 shadow-md'
                  : sliderValue > n
                    ? 'bg-primary/30 border-primary/50 text-primary'
                    : 'bg-muted border-border text-muted-foreground group-hover:border-primary/50'
              )}>
                {n}
              </div>
              {/* Label below */}
              <span className={cn(
                'text-[8px] leading-tight whitespace-nowrap',
                sliderValue === n ? 'text-primary font-semibold' : 'text-muted-foreground'
              )}>
                {gradeLabels[n]}
              </span>
            </button>
            {/* Connecting line */}
            {i < steps.length - 1 && (
              <div className={cn(
                'h-0.5 w-6 sm:w-8 mx-0.5',
                sliderValue > n ? 'bg-primary/40' : 'bg-border'
              )} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
