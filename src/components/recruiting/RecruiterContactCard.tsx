/**
 * Encouraged-but-optional recruiter contact card. Shown on the standards console
 * and nudged the first time a rep has standards but no contact details on file.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Phone, Save, UserCheck } from "lucide-react";
import { useRecruiterContact } from "@/hooks/useRecruiterContact";

export function RecruiterContactCard({ nudge = false }: { nudge?: boolean }) {
  const { contact, save, hasContact } = useRecruiterContact();
  const [form, setForm] = useState({
    contact_name: "",
    contact_title: "",
    contact_email: "",
    contact_phone: "",
  });

  useEffect(() => {
    if (contact.data) {
      setForm({
        contact_name: contact.data.contact_name ?? "",
        contact_title: contact.data.contact_title ?? "",
        contact_email: contact.data.contact_email ?? "",
        contact_phone: contact.data.contact_phone ?? "",
      });
    }
  }, [contact.data]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card className={nudge && !hasContact ? "border-primary/60" : undefined}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserCheck className="h-4 w-4" /> Your contact details
          {hasContact ? (
            <Badge variant="secondary">On file</Badge>
          ) : (
            <Badge variant="outline">Optional — strongly encouraged</Badge>
          )}
        </CardTitle>
        <CardDescription>
          {hasContact
            ? "Included in every athlete match email so they can reach back directly."
            : "Not required to create a standard. But a ping with no way to answer it rarely becomes a real conversation — if you add an email (phone optional), it goes out with the athlete's notification."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rc-name">Your name</Label>
            <Input id="rc-name" value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} placeholder="Jordan Ellis" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rc-title">Role / title</Label>
            <Input id="rc-title" value={form.contact_title} onChange={(e) => set("contact_title", e.target.value)} placeholder="Recruiting Coordinator" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rc-email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Contact email
            </Label>
            <Input id="rc-email" type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} placeholder="you@stateu.edu" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rc-phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Phone (optional)
            </Label>
            <Input id="rc-phone" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} placeholder="(555) 555-0134" />
          </div>
        </div>
        <Button
          disabled={save.isPending}
          onClick={() =>
            save.mutate(form, {
              onSuccess: () => toast.success("Contact details saved"),
              onError: (e: unknown) => toast.error((e as Error).message),
            })
          }
        >
          <Save className="h-4 w-4 mr-1" /> Save contact details
        </Button>
      </CardContent>
    </Card>
  );
}
