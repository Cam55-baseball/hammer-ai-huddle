import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/useLanguage";
import { type LanguageCode } from "@/i18n";

export const LanguageSelector = () => {
  const { currentLanguage, changeLanguage, languages } = useLanguage();

  return (
    <Select value={currentLanguage} onValueChange={(value) => changeLanguage(value as LanguageCode)}>
      <SelectTrigger className="w-[180px]">
        <Globe className="mr-2 h-4 w-4" />
        <SelectValue placeholder="Select language" />
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
