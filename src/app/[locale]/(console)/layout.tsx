import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { catalog } from "@/i18n/catalog";
import { isLocale } from "@/i18n/locales";
import { requireOfficer } from "@/server/session";

export default async function ConsoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const officer = await requireOfficer(locale);
  const copy = catalog(locale);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header
        locale={locale}
        copy={copy}
        officer={{ name: officer.name, designation: officer.designation }}
      />
      <main className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto px-4 py-6">{children}</main>
    </div>
  );
}
