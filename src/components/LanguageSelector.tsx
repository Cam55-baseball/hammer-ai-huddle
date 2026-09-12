import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/useLanguage";
import { type LanguageCode } from "@/i18n";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  /**
   * Collapse to a flag-only control on narrow screens (phones), expanding to
   * the full "flag + language name" trigger from the `sm` breakpoint up.
   * Desktop and tablet are unaffected.
   */
  responsive?: boolean;
  className?: string;
}

export const LanguageSelector = ({ responsive = false, className }: LanguageSelectorProps) => {
  const { currentLanguage, currentLanguageInfo, changeLanguage, languages } = useLanguage();

  return (
    <Select value={currentLanguage} onValueChange={(value) => changeLanguage(value as LanguageCode)}>
      <SelectTrigger
        className={cn(
          responsive ? "w-auto min-w-0 px-2 sm:w-[180px] sm:px-3" : "w-[180px]",
          className,
        )}
        aria-label="Select language"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Globe className={cn("h-4 w-4 shrink-0", responsive && "hidden sm:block")} />
          <span>{currentLanguageInfo.flag}</span>
          <span className={cn("truncate", responsive && "hidden sm:inline")}>
            {currentLanguageInfo.name}
          </span>
        </span>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="flex items-center gap-2">
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
