import "server-only";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import type { Locale } from "@/i18n/locales";
import { prisma } from "@/lib/db";

export async function requireOfficer(locale: Locale) {
  const session = await getServerSession(authOptions);
  const officerId = session?.user?.id;
  if (!officerId) redirect(`/${locale}/login`);

  const officer = await prisma.officer.findUnique({ where: { id: officerId } });
  if (!officer) redirect(`/${locale}/login`);
  return officer;
}
