import { motion } from 'framer-motion';

export interface TunnelPitch { id: string; color: string; endX: number; endY: number; bend?: number; label: string; }

export function PitchTunnelDiagram({ pitches, highlightId }: { pitches: TunnelPitch[]; highlightId?: string }) {
  return (
    <svg viewBox="0 0 220 130" className="h-32 w-full">
      <rect x="80" y="80" width="60" height="40" stroke="hsl(var(--border))" strokeWidth="1.5" fill="hsl(var(--muted) / 0.3)" />
      {[1, 2].map(i => <line key={`zv${i}`} x1={80 + i * 20} y1="80" x2={80 + i * 20} y2="120" stroke="hsl(var(--border))" strokeWidth="0.5" />)}
      {[1, 2].map(i => <line key={`zh${i}`} x1="80" y1={80 + i * 13} x2="140" y2={80 + i * 13} stroke="hsl(var(--border))" strokeWidth="0.5" />)}
      <circle cx="110" cy="55" r="2" fill="hsl(var(--primary) / 0.6)" />
      <text x="115" y="52" fontSize="7" fill="hsl(var(--muted-foreground))">Tunnel</text>
      <circle cx="110" cy="8" r="3" fill="hsl(var(--foreground))" />
      {pitches.map((p, i) => {
        const isHi = highlightId === p.id;
        const ctrlX = 110 + (p.bend ?? 0);
        const d = `M110 8 Q ${ctrlX} 30 110 55 T ${p.endX} ${p.endY}`;
        return (
          <g key={p.id}>
            <motion.path
              d={d} stroke={p.color} strokeWidth={isHi ? 2.2 : 1.2}
              opacity={isHi ? 1 : 0.45} fill="none"
              strokeDasharray={isHi ? '0' : '2 2'}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 0.7, delay: i * 0.08 }}
            />
            <motion.circle cx={p.endX} cy={p.endY} r={isHi ? 4 : 2.5} fill={p.color}
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7 + i * 0.08 }} />
            <text x={p.endX + 5} y={p.endY + 2} fontSize="6.5" fill="hsl(var(--foreground))" opacity={isHi ? 1 : 0.6}>{p.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
