import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";

type QuickEditCtx = { open: () => void; close: () => void };
const Ctx = createContext<QuickEditCtx>({ open: () => {}, close: () => {} });

export const useQuickEditProfile = () => useContext(Ctx);

export const QuickEditProfileProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { profile, updateProfile, isUpdating } = useUserProfile();
  const { toast } = useToast();

  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen && profile) {
      setForm({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        position: profile.position ?? "",
        throwing_hand: profile.throwing_hand ?? "",
        batting_side: profile.batting_side ?? "",
        height: profile.height ?? "",
        weight: profile.weight ?? "",
        team_affiliation: profile.team_affiliation ?? "",
        state: profile.state ?? "",
      });
    }
  }, [isOpen, profile]);

  const setField = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try {
      await updateProfile(form);
      toast({ title: "Profile updated", description: "Your defaults are now active across the app." });
      setIsOpen(false);
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Ctx.Provider value={{ open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Quick Edit Profile</SheetTitle>
            <SheetDescription>
              Changes apply instantly across the app — defaults, recommendations, and filters.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First name</Label>
                <Input value={form.first_name ?? ""} onChange={(e) => setField("first_name", e.target.value)} />
              </div>
              <div>
                <Label>Last name</Label>
                <Input value={form.last_name ?? ""} onChange={(e) => setField("last_name", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Position</Label>
              <Input value={form.position ?? ""} onChange={(e) => setField("position", e.target.value)} placeholder="e.g. SS, P, C" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Throws</Label>
                <Select value={form.throwing_hand ?? ""} onValueChange={(v) => setField("throwing_hand", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bats</Label>
                <Select value={form.batting_side ?? ""} onValueChange={(v) => setField("batting_side", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="switch">Switch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Height</Label>
                <Input value={form.height ?? ""} onChange={(e) => setField("height", e.target.value)} placeholder='6&apos;1"' />
              </div>
              <div>
                <Label>Weight</Label>
                <Input value={form.weight ?? ""} onChange={(e) => setField("weight", e.target.value)} placeholder="185" />
              </div>
            </div>
            <div>
              <Label>Team</Label>
              <Input value={form.team_affiliation ?? ""} onChange={(e) => setField("team_affiliation", e.target.value)} />
            </div>
            <div>
              <Label>State</Label>
              <Input value={form.state ?? ""} onChange={(e) => setField("state", e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={isUpdating} className="flex-1">
                {isUpdating ? "Saving..." : "Save changes"}
              </Button>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </Ctx.Provider>
  );
};
