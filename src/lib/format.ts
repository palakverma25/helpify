import type { Locale } from "@/i18n/locales";

const intlLocale: Record<Locale, string> = {
  hi: "hi-IN",
  en: "en-IN",
};

export function formatMoney(value: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: Date, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

export function formatIsoDate(iso: string, locale: Locale) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return formatDate(new Date(Date.UTC(year, month - 1, day, 12)), locale);
}

export function isSameKolkataDay(left: Date, right: Date) {
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return format.format(left) === format.format(right);
}

export function formatFieldValue(
  type: string,
  value: string | number | undefined,
  locale: Locale,
) {
  if (value == null || value === "") return "—";
  if (type === "money" && typeof value === "number") return formatMoney(value, locale);
  if (type === "date" && typeof value === "string") return formatIsoDate(value, locale);
  return String(value);
}
