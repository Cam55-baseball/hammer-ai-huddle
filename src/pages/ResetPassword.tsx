import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const ResetPassword = () => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updatePassword } = useAuth();

  const passwordSchema = z.object({
    password: z.string().min(6, { message: t('resetPassword.errors.passwordMinLength') }),
    confirmPassword: z.string().min(6, { message: t('resetPassword.errors.passwordMinLength') }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('resetPassword.errors.passwordsMismatch'),
    path: ["confirmPassword"],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = passwordSchema.parse({ password, confirmPassword });
      const { error } = await updatePassword(validated.password);

      if (error) {
        toast({
          title: t('common.error'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('resetPassword.success.title'),
          description: t('resetPassword.success.description'),
        });
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: t('auth.validationError'),
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          <div className="text-center mb-6">
            <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-bold text-2xl">H</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">{t('resetPassword.title')}</h1>
            <p className="text-muted-foreground">
              {t('resetPassword.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('resetPassword.newPassword')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('resetPassword.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('resetPassword.updating') : t('resetPassword.updatePassword')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
