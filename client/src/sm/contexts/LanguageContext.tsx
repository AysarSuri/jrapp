import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type Lang, type TranslationKey, getTranslation, LANG_META } from "@/sm/i18n/translations";

export type { Lang };

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "ar",
  setLang: () => {},
  t: (key) => key,
  dir: "rtl",
});

const VALID_LANGS: Lang[] = ["ar", "bad", "tr", "en", "de"];

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("app_lang") as Lang | null;
    return stored && VALID_LANGS.includes(stored) ? stored : "ar";
  });

  const setLang = (l: Lang) => {
    localStorage.setItem("app_lang", l);
    setLangState(l);
  };

  const t = (key: TranslationKey): string => getTranslation(lang, key);
  const dir = LANG_META[lang].dir;

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang, dir]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
