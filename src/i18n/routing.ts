import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "./locales";

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always",
  localeDetection: false,
});
