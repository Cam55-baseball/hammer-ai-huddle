import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CircleSlash } from "lucide-react";
import { missingSignalSentence } from "@/lib/digest/sentences";

export function MissingSignalCard({ topics }: { topics: string[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CircleSlash className="h-4 w-4 text-muted-foreground" />
          Missing signals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-foreground">{missingSignalSentence(topics)}</p>
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <Badge key={t} variant="outline" className="font-mono text-xs">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
