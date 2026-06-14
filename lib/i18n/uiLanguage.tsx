"use client";

import { createContext, useContext } from "react";

export type UiLanguage = "en" | "zh";

type UiLanguageContextValue = {
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
};

const UiLanguageContext = createContext<UiLanguageContextValue>({
  language: "en",
  setLanguage: () => {},
});

export function UiLanguageProvider({
  language,
  setLanguage,
  children,
}: UiLanguageContextValue & { children: React.ReactNode }) {
  return (
    <UiLanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </UiLanguageContext.Provider>
  );
}

export function useUiLanguage() {
  return useContext(UiLanguageContext);
}

export function uiText(language: UiLanguage, en: string, zh: string) {
  return language === "zh" ? zh : en;
}
