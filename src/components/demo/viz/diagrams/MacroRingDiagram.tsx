import { motion } from 'framer-motion';

export function MacroRingDiagram({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const rings = [
    { label: 'Protein', v: protein, color: 'hsl(var(--destructive))' },
    { label: 'Carbs', v: carbs, color: 'hsl(38 92% 55%)' },
    { label: 'Fat', v: fat, color: 'hsl(var(--primary))' },
  ];
  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/20 p-2">
      <svg viewBox="0 0 100 100" className="h-24 w-24">
        {rings.map((r, i) => {
          const radius = 42 - i * 11;
          const c = 2 * Math.PI * radius;
          const off = c * (1 - r.v / 100);
          return (
            <g key={r.label} transform="translate(50 50) rotate(-90)">
              <circle cx="0" cy="0" r={radius} stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
              <motion.circle
                cx="0" cy="0" r={radius}
                stroke={r.color} strokeWidth="6" fill="none" strokeLinecap="round"
                strokeDasharray={c} initial={{ strokeDashoffset: c }}
                animate={{ strokeDashoffset: off }}
                transition={{ duration: 0.9, delay: i * 0.1 }}
              />
            </g>
          );
        })}
      </svg>
      <div className="space-y-1 text-xs">
        {rings.map(r => (
          <div key={r.label} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: r.color }} />
            <span className="font-bold">{r.label}</span>
            <span className="ml-auto font-black">{r.v}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
