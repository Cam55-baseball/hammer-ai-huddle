import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { languages, type LanguageCode } from '@/i18n';

export const useLanguage = () => {
  const { i18n, t } = useTranslation();
  const { toast } = useToast();

  const currentLanguage = i18n.language as LanguageCode;
  
  const currentLanguageInfo = languages.find(l => l.code === currentLanguage) || languages[0];

  const changeLanguage = useCallback(async (langCode: LanguageCode, saveToDatabase = true) => {
    try {
      // Change i18n language
      await i18n.changeLanguage(langCode);
      
      // Save to localStorage
      localStorage.setItem('i18nextLng', langCode);

      // Save to database if user is authenticated
      if (saveToDatabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from('profiles')
            .update({ preferred_language: langCode })
            .eq('id', user.id);
          
          if (error) {
            console.error('Failed to save language preference:', error);
          }
        }
      }

      toast({
        title: t('toast.languageChanged'),
        description: languages.find(l => l.code === langCode)?.name,
      });
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  }, [i18n, toast, t]);

  const loadUserLanguage = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profile?.preferred_language && profile.preferred_language !== currentLanguage) {
          await i18n.changeLanguage(profile.preferred_language);
          localStorage.setItem('i18nextLng', profile.preferred_language);
        }
      }
    } catch (error) {
      console.error('Failed to load user language:', error);
    }
  }, [i18n, currentLanguage]);

  return {
    currentLanguage,
    currentLanguageInfo,
    changeLanguage,
    loadUserLanguage,
    languages,
    t,
  };
};
