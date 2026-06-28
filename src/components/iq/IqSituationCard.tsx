import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import type { IqSituation } from "@/lib/iq/types";
import { LENS_ACCENT, LENS_LABELS } from "@/lib/iq/types";

interface Props {
  situation: IqSituation;
  mastery?: number;
  onClick: () => void;
}

export function IqSituationCard({ situation, mastery, onClick }: Props) {
  const accent = situation.lens_tags[0] ? LENS_ACCENT[situation.lens_tags[0]] : "hsl(var(--primary))";
  return (
    <Card
      onClick={onClick}
      className="group p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 h-1 w-full" style={{ background: accent }} />
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {situation.lens_tags.map((l) => (
              <Badge key={l} variant="outline" className="text-[10px] uppercase tracking-wider"
                     style={{ borderColor: LENS_ACCENT[l], color: LENS_ACCENT[l] }}>
                {LENS_LABELS[l]}
              </Badge>
            ))}
            <Badge variant="secondary" className="text-[10px] capitalize">{situation.difficulty}</Badge>
            {situation.triple_check_count >= 3 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-green-500">
                <CheckCircle2 className="h-3 w-3" /> Triple-checked
              </span>
            )}
          </div>
          <h3 className="font-bold text-lg leading-tight mb-1">{situation.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{situation.summary}</p>
          {typeof mastery === "number" && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all"
                     style={{ width: `${mastery}%`, background: accent }} />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{mastery}%</span>
            </div>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
      </div>
    </Card>
  );
}
