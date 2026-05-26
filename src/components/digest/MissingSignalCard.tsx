import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleSlash } from "lucide-react";
import { TopicLabel } from "@/components/command/TopicLabel";
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
              <span
                key={t}
                className="rounded-md border bg-background px-2 py-1 text-xs"
              >
                <TopicLabel id={t} inline />
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
