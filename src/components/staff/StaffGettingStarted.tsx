/**
 * StaffGettingStarted — the coach/scout equivalent of athlete onboarding.
 *
 * Coaches and scouts were previously shown the athlete setup flow, which asks
 * for training goals, schedule and body measurements — none of which apply to
 * them. This card is their onboarding: what to do first, in order, in plain
 * language, with the "how do I find an athlete" step spelled out explicitly.
 *
 * Read-only. Dismissal is per-account and stored locally.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Search, UserPlus, ClipboardList, Inbox } from "lucide-react";

const KEY = "staff-getting-started-dismissed";

export function StaffGettingStarted({ role }: { role: "coach" | "scout" }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const searchHref = role === "coach" ? "/coach-dashboard" : "/scout-dashboard";

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-lg">
            Getting started as a {role}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Four steps. You don't need an athlete's ID number for any of them.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Dismiss"
          onClick={() => {
            try {
              localStorage.setItem(KEY, "1");
            } catch {
              /* ignore */
            }
            setDismissed(true);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Step
          n={1}
          icon={<Search className="h-4 w-4" />}
          title="Find the athlete by name"
          body="Use the player search on this page and type at least 2 letters of their name — the same name they signed up with. There is no ID to enter and nothing for them to send you first."
        />
        <Step
          n={2}
          icon={<UserPlus className="h-4 w-4" />}
          title="Send a follow request"
          body="Press Follow on their result. They get a request and approve it. Until they approve, you can see their public profile but not their training data."
        />
        <Step
          n={3}
          icon={<ClipboardList className="h-4 w-4" />}
          title="File an evaluation"
          body="Once you can see an athlete, use Evaluate on their card. Your submitted reports live under Evaluations → Filed by me. The athlete confirms they attended before grades are released to them."
        />
        <Step
          n={4}
          icon={<Inbox className="h-4 w-4" />}
          title="Watch the Reports Inbox"
          body="Progress reports on the athletes you follow arrive automatically — weekly digests, plus a monthly deep report for athletes with recorded activity."
        />
        <div className="pt-1">
          <Button asChild size="sm" variant="outline">
            <Link to={searchHref}>Go to player search</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-medium">
          {n}. {title}
        </p>
        <p className="text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
