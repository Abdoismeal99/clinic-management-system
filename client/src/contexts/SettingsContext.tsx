import { createContext, useContext, useEffect, ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface ClinicSettings {
  language: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  appointmentDuration: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  clinicName: string;
  clinicLogo: string;
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

const SettingsContext = createContext<ClinicSettings>(defaultSettings);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: settingsData } = trpc.settings.getAll.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const settings: ClinicSettings = { ...defaultSettings };

  if (settingsData) {
    const get = (key: string) => (settingsData as any[]).find((s) => s.key === key)?.value ?? "";
    settings.language = get("language") || "ar";
    settings.timezone = get("timezone") || "Africa/Cairo";
    settings.dateFormat = get("date_format") || "DD/MM/YYYY";
    settings.currency = get("currency") || "EGP";
    settings.appointmentDuration = get("appointment_duration") || "30";
    settings.workingHoursStart = get("working_hours_start") || "09:00";
    settings.workingHoursEnd = get("working_hours_end") || "17:00";
    settings.clinicName = get("clinic_name") || "";
    settings.clinicLogo = get("clinic_logo") || "";
  }

  // Apply language direction and locale to document
  useEffect(() => {
    const lang = settings.language;
    const isRTL = ["ar", "he", "fa", "ur"].includes(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
  }, [settings.language]);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

/**
 * Format a date using the clinic's saved date format and timezone
 */
export function useFormatDate() {
  const { dateFormat, timezone } = useSettings();
  return (date: Date | string | number | null | undefined): string => {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    try {
      return d.toLocaleDateString("ar-EG", { timeZone: timezone, day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return d.toLocaleDateString("ar-EG");
    }
  };
}
