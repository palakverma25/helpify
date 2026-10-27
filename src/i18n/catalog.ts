import type { Locale } from "./locales";
import en from "../../messages/en.json";
import hi from "../../messages/hi.json";

export type Catalog = typeof hi;

const catalogs: Record<Locale, Catalog> = { hi, en };

export function catalog(locale: Locale) {
  return catalogs[locale];
}
