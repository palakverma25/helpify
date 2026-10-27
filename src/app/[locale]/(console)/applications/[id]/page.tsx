import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseFileView } from "@/components/case-file";
import { catalog } from "@/i18n/catalog";
import { isLocale } from "@/i18n/locales";
import { getCase } from "@/server/cases";
import { requireOfficer } from "@/server/session";

export default async function ApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const officer = await requireOfficer(locale);
  const file = await getCase(officer.id, id, locale, { narrative: false });
  const copy = catalog(locale);
  if (!file) {
    return (
      <div className="grid gap-3">
        <p>{copy.file.notFound}</p>
        <Link href={`/${locale}`} className="text-pine">
          {copy.file.back}
        </Link>
      </div>
    );
  }
  const query = await searchParams;
  const noticeValue = Array.isArray(query.notice) ? query.notice[0] : query.error ?? query.saved;
  const raw = Array.isArray(noticeValue) ? noticeValue[0] : noticeValue;
  const notice = raw === "1" || raw === "saved" ? "saved" : raw === "note" || raw === "closed" ? raw : "";

  return <CaseFileView locale={locale} copy={copy} file={file} notice={notice} />;
}
