import { createContext, useContext } from "react";
import { resolve, type Locale } from "./translations";

// Hook + context split out from LocaleContext.tsx so React Fast Refresh
// doesn't invalidate the provider every edit (mixed component + hook
// exports trigger "incompatible" HMR and cause a hooks-mismatch crash
// until a full reload).

export type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: "en",
      setLocale: () => {},
      t: (key: string) => resolve(key, "en"),
    };
  }
  return ctx;
}

export function useT() {
  return useLocale().t;
}
