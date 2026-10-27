export const locales = ["hi", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "hi";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
