import { useState, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import translations, { Language } from '@/constants/translations';

export const [LanguageProvider, useLanguage] = createContextHook(() => {
  const [language, setLanguage] = useState<Language>('en');

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'en' ? 'hi' : 'en'));
  }, []);

  const t = useCallback(
    (key: keyof typeof translations.en, replacements?: Record<string, string>): string => {
      let text: string = translations[language][key] || translations.en[key] || key;
      if (replacements) {
        Object.entries(replacements).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, v);
        });
      }
      return text;
    },
    [language],
  );

  const isHindi = language === 'hi';

  return { language, toggleLanguage, t, isHindi };
});
