import { useT, useLocale } from "@/lib/i18n/LocaleContext";
import { LOCALES } from "@/lib/i18n/translations";

// Page Settings — a dedicated area for language, layout, and visual-style
// preferences. Layout + visual-style sections are placeholders pending the
// design pass; only language ships in the first cut.
//
// The bottom-left sidebar entry navigates here. Settings live in localStorage
// (no schema change). Future sections (density, font size, motion, etc.)
// follow the same pattern: a hook reads from localStorage, this page renders
// the toggle.

export default function PageSettings() {
  const t = useT();
  const { locale, setLocale } = useLocale();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-xl font-medium">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("settings.description")}
        </p>
      </header>

      <Section title={t("settings.section.language")}>
        <div role="radiogroup" aria-label={t("settings.section.language")} className="flex flex-col gap-2">
          {LOCALES.map((opt) => {
            const checked = locale === opt.value;
            return (
              <label
                key={opt.value}
                className={
                  "flex cursor-pointer items-center justify-between gap-3 border px-3 py-2 text-sm transition-colors " +
                  (checked
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background hover:bg-muted")
                }
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="locale"
                    value={opt.value}
                    checked={checked}
                    onChange={() => setLocale(opt.value)}
                    className="sr-only"
                  />
                  <span className="font-medium">{opt.nativeLabel}</span>
                  {opt.label !== opt.nativeLabel ? (
                    <span className={checked ? "text-background/70" : "text-muted-foreground"}>
                      {opt.label}
                    </span>
                  ) : null}
                </span>
                <span className="text-xs uppercase tracking-wider opacity-60">
                  {opt.value}
                </span>
              </label>
            );
          })}
        </div>
      </Section>

      <Section title={t("settings.section.layout")} eyebrow={t("settings.comingSoon")}>
        <p className="text-sm text-muted-foreground">
          {t("settings.layout.placeholder")}
        </p>
      </Section>

      <Section title={t("settings.section.visualStyle")} eyebrow={t("settings.comingSoon")}>
        <p className="text-sm text-muted-foreground">
          {t("settings.visualStyle.placeholder")}
        </p>
      </Section>
    </div>
  );
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-border pt-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em]">{title}</h2>
        {eyebrow ? (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}
