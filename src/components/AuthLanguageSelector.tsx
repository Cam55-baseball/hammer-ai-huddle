import { useLanguage } from "@/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LanguageCode } from "@/i18n";

export const AuthLanguageSelector = () => {
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const { t } = useTranslation();

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Globe className="h-5 w-5 text-primary animate-pulse" />
        <span className="text-sm font-medium text-muted-foreground">
          {t('language.chooseLanguage')}
        </span>
      </div>
      
      <div className="flex flex-wrap justify-center gap-2">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code as LanguageCode, false)}
            className={cn(
              "text-2xl p-2 rounded-lg transition-all hover:scale-110 hover:bg-primary/10",
              currentLanguage === lang.code && 
              "ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/10 animate-glow-pulse"
            )}
            title={lang.name}
            aria-label={`Switch to ${lang.name}`}
          >
            {lang.flag}
          </button>
        ))}
      </div>
    </div>
  );
};
