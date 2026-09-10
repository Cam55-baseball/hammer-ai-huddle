/**
 * Neutral "not available" state used wherever purchase UI must be hidden.
 *
 * Deliberately contains NO price, NO "subscribe/upgrade/plan", NO link and no
 * hint that the feature can be bought anywhere else. Steering language is what
 * gets apps rejected under Apple's anti-steering rules.
 */
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PurchaseUnavailableProps {
  featureName?: string;
  variant?: "inline" | "full";
  className?: string;
}

export function PurchaseUnavailable({
  featureName,
  variant = "inline",
  className,
}: PurchaseUnavailableProps) {
  const body = featureName
    ? `${featureName} isn't available on your account yet.`
    : "This isn't available on your account yet.";

  if (variant === "full") {
    return (
      <div className={`flex items-center justify-center min-h-[300px] p-6 ${className ?? ""}`}>
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center text-center pt-8 pb-6 space-y-3">
            <div className="p-4 rounded-full bg-muted">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{body}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className={`border-dashed ${className ?? ""}`}>
      <CardContent className="flex items-center gap-3 py-3 px-4">
        <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
