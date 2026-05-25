import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreferences,
} from "@/hooks/command/useNotificationPreferences";

type Channel = keyof NotificationPreferences;

const ROWS: { key: Channel; label: string; help: string; disabled?: boolean; disabledNote?: string }[] = [
  {
    key: "in_app",
    label: "In-app",
    help: "Escalations appear in the header bell and as a banner on Command Center.",
  },
  {
    key: "email",
    label: "Email",
    help: "Each email links to the source event's replay view. Requires email delivery to be enabled.",
  },
  {
    key: "push",
    label: "Push",
    help: "Browser/mobile push for unacknowledged escalations.",
  },
];

export function NotificationsPreferencesPanel() {
  const { data, isLoading } = useNotificationPreferences();
  const mutate = useUpdateNotificationPreferences();

  const update = (patch: Partial<NotificationPreferences>) => {
    if (!data) return;
    mutate.mutate({ ...data, ...patch });
  };

  if (isLoading || !data) {
    return <div className="text-sm text-muted-foreground">Loading preferences…</div>;
  }

  return (
    <div className="space-y-4">
      {ROWS.map((row) => (
        <div key={row.key} className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
          <div className="min-w-0 flex-1">
            <Label htmlFor={`notif-${row.key}`} className="text-sm font-medium">
              {row.label}
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">{row.help}</p>
          </div>
          <Switch
            id={`notif-${row.key}`}
            checked={data[row.key]}
            onCheckedChange={(v) => update({ [row.key]: v })}
            disabled={mutate.isPending}
          />
        </div>
      ))}
    </div>
  );
}
