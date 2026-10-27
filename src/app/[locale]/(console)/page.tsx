import { notFound } from "next/navigation";
import { QueueBoard } from "@/components/queue-board";
import { catalog } from "@/i18n/catalog";
import { isLocale } from "@/i18n/locales";
import { getQueue, parseFilters } from "@/server/cases";
import { requireOfficer } from "@/server/session";

export default async function QueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const officer = await requireOfficer(locale);
  const data = await getQueue(officer.id, locale, parseFilters(await searchParams));

  return <QueueBoard locale={locale} copy={catalog(locale)} data={data} />;
}
