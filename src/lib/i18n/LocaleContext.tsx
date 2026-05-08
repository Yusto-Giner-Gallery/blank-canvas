import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { resolve, type Locale } from "./translations";

// Locale provider for the app shell. Persists to localStorage so the chosen
// language survives reloads. Exposes `t(key)` for translation and `setLocale`
// for the Page Settings UI. No external i18n library — the translations table
// is small enough to live in-tree, and a Lovable port stays trivial.

const STORAGE_KEY = "ygm.locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /** Translate a key. Optional `vars` interpolates {placeholders} —
   *  e.g. `t("inventory.summary", { filtered: 3, total: 12, plural: "s" })`. */
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "es") return stored;
  return "en";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readInitialLocale());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, locale);
    // Reflect on <html lang=> so spell-check + screen readers honour it.
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let s = resolve(key, locale);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return s;
    },
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Fallback so a forgotten Provider in a leaf doesn't crash — strings
    // pass through as-is (English keys).
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
