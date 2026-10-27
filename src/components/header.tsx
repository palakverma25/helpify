"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Catalog } from "@/i18n/catalog";
import type { Locale } from "@/i18n/locales";

export function Header({
  locale,
  officer,
  copy,
}: {
  locale: Locale;
  officer: { name: string; designation: string };
  copy: Catalog;
}) {
  const pathname = usePathname() || `/${locale}`;
  const rest = pathname.replace(/^\/(hi|en)/, "");

  return (
    <header className="shrink-0 border-b border-pine-deep bg-pine text-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link href={`/${locale}`} className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-paper text-lg font-semibold text-pine">
            त
          </span>
          <span>
            <span className="block text-lg font-semibold leading-tight">{copy.brand.name}</span>
            <span className="block text-sm text-paper/80">{copy.brand.office}</span>
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <nav aria-label={copy.nav.language} className="flex rounded-md bg-white/10 p-0.5">
            <Link
              href={`/hi${rest}`}
              hrefLang="hi"
              className={locale === "hi" ? "rounded bg-paper px-2 py-1 text-pine" : "px-2 py-1"}
            >
              हिंदी
            </Link>
            <Link
              href={`/en${rest}`}
              hrefLang="en"
              className={locale === "en" ? "rounded bg-paper px-2 py-1 text-pine" : "px-2 py-1"}
            >
              English
            </Link>
          </nav>
          <p className="text-right leading-tight">
            <span className="block font-medium">{officer.name}</span>
            <span className="block text-paper/75">{officer.designation}</span>
          </p>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
            className="rounded-md border border-paper/30 px-3 py-1.5"
          >
            {copy.nav.logout}
          </button>
        </div>
      </div>
    </header>
  );
}
