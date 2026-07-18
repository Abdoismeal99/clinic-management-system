import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { type Lang, translations, type TranslationKey } from "@/lib/translations";

interface ClinicSettings {
  language: Lang;
  timezone: string;
  dateFormat: string;
  currency: string;
  appointmentDuration: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  clinicName: string;
  clinicLogo: string;
}

interface SettingsContextValue extends ClinicSettings {
  t: (section: TranslationKey, key: string) => string;
  setLanguageOverride: (lang: Lang) => void;
}

const defaultSettings: ClinicSettings = {
  language: "ar",
  timezone: "Africa/Cairo",
  dateFormat: "DD/MM/YYYY",
  currency: "EGP",
  appointmentDuration: "30",
  workingHoursStart: "09:00",
  workingHoursEnd: "17:00",
  clinicName: "",
  clinicLogo: "",
};

const SettingsContext = createContext<SettingsContextValue>({
  ...defaultSettings,
  t: (section, key) => {
    const sectionData = translations[section] as Record<string, { ar: string; en: string }>;
    return sectionData?.[key]?.["ar"] ?? key;
  },
  setLanguageOverride: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: settingsData } = trpc.settings.getAll.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Language override allows instant switching before DB save
  const [langOverride, setLangOverride] = useState<Lang | null>(null);

  const settings: ClinicSettings = { ...defaultSettings };

  if (settingsData) {
    const get = (key: string) => (settingsData as any[]).find((s) => s.key === key)?.value ?? "";
    const savedLang = get("language");
    settings.language = (savedLang === "en" ? "en" : "ar") as Lang;
    settings.timezone = get("timezone") || "Africa/Cairo";
    settings.dateFormat = get("date_format") || "DD/MM/YYYY";
    settings.currency = get("currency") || "EGP";
    settings.appointmentDuration = get("appointment_duration") || "30";
    settings.workingHoursStart = get("working_hours_start") || "09:00";
    settings.workingHoursEnd = get("working_hours_end") || "17:00";
    settings.clinicName = get("clinic_name") || "";
    settings.clinicLogo = get("clinic_logo") || "";
  }

  const activeLang: Lang = langOverride ?? settings.language;

  // Apply language direction and locale to document
  useEffect(() => {
    const isRTL = activeLang === "ar";
    document.documentElement.lang = activeLang;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
  }, [activeLang]);

  const translate = useCallback(
    (section: TranslationKey, key: string): string => {
      const sectionData = translations[section] as Record<string, { ar: string; en: string }>;
      return sectionData?.[key]?.[activeLang] ?? sectionData?.[key]?.["ar"] ?? key;
    },
    [activeLang]
  );

  const value: SettingsContextValue = {
    ...settings,
    language: activeLang,
    t: translate,
    setLanguageOverride: setLangOverride,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}

/** Shorthand hook: const { t } = useT(); t("common", "save") */
export function useT() {
  const ctx = useContext(SettingsContext);
  return { t: ctx.t, lang: ctx.language };
}

/**
 * Format a date using the clinic's saved timezone
 */
export function useFormatDate() {
  const { timezone, language } = useContext(SettingsContext);
  return (date: Date | string | number | null | undefined): string => {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    try {
      const locale = language === "ar" ? "ar-EG" : "en-GB";
      return d.toLocaleDateString(locale, {
        timeZone: timezone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return d.toLocaleDateString();
    }
  };
}
