import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const InitializeOwner = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('initialize-owner', {
        body: { email, secretKey }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: t('initializeOwner.success.title'),
          description: t('initializeOwner.success.description'),
        });
        navigate("/auth");
      } else {
        throw new Error(data.error || t('initializeOwner.error.defaultMessage'));
      }
    } catch (error: any) {
      console.error('Error initializing owner:', error);
      toast({
        title: t('initializeOwner.error.title'),
        description: error.message || t('initializeOwner.error.description'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-2xl">H</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">{t('initializeOwner.title')}</h1>
          <p className="text-sm text-muted-foreground">
            ⚠️ {t('initializeOwner.warning')}
          </p>
        </div>

        <form onSubmit={handleInitialize} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">{t('initializeOwner.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('initializeOwner.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {t('initializeOwner.emailHelper')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secretKey">{t('initializeOwner.secretKey')}</Label>
            <Input
              id="secretKey"
              type="password"
              placeholder={t('initializeOwner.secretKeyPlaceholder')}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {t('initializeOwner.secretKeyHelper')}
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? t('initializeOwner.initializing') : t('initializeOwner.initializeButton')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => navigate("/")}>
            ← {t('initializeOwner.backToHome')}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default InitializeOwner;
