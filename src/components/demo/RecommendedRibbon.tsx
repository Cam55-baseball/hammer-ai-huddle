import { Star } from 'lucide-react';

export function RecommendedRibbon() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
      <Star className="h-3 w-3" /> Most athletes start here
    </span>
  );
}
