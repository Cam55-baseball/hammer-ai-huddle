import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isSafeRelativePath } from "@/lib/auth/postLoginRoute";

/**
 * Shown when a third-party sign-in gives us no name. Apple only releases the
 * name on the very first authorization, so a returning Apple user whose
 * profile was never filled in has to type it once here. We never write a
 * blank profile and never guess a name from the email address.
 */
const CompleteProfileName = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const redirectParam = searchParams.get("redirect");
  const next = isSafeRelativePath(redirectParam) ? redirectParam : "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = fullName.trim();
    if (trimmed.length < 2) {
      toast({
        title: "Enter your name",
        description: "Please type your first and last name so we know what to call you.",
        variant: "destructive",
      });
      return;
    }
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: trimmed })
      .eq("id", user.id);
    setIsSaving(false);

    if (error) {
      toast({
        title: "Couldn't save your name",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }
    navigate(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold mb-2">What should we call you?</h1>
        <p className="text-muted-foreground mb-6">
          Apple keeps your name private unless you share it, so we don't have it yet. Add it once
          and you're done.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="completeFullName">Full name</Label>
            <Input
              id="completeFullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Rivera"
              autoFocus
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? "Saving…" : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfileName;
