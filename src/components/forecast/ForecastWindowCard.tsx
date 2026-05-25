import { TrendingUp } from "lucide-react";
import { DigestCardShell } from "@/components/digest/DigestCardShell";
import {
  continuationSentence,
  FORECAST_BOUNDARY_DISCLAIMER,
} from "@/lib/digest/sentences";
import type { DigestProjection } from "@/lib/digest/projections";

interface Props {
  title: string;
  label: string;
  projection: DigestProjection & { horizonDays?: number };
}

export function ForecastWindowCard({ title, label, projection }: Props) {
  return (
    <DigestCardShell
      title={title}
      icon={<TrendingUp className="h-4 w-4 text-primary" />}
      projection={projection}
      sentence={`${continuationSentence(projection, label)} ${FORECAST_BOUNDARY_DISCLAIMER}`}
    />
  );
}
