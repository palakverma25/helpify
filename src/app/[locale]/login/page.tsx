import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/auth";
import { LoginForm } from "@/components/login-form";
import { demoOfficers, demoPassword } from "@/content/demo";
import { catalog } from "@/i18n/catalog";
import { isLocale } from "@/i18n/locales";
import { prisma } from "@/lib/db";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const officer = await prisma.officer.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    if (officer) redirect(`/${locale}`);
  }
  const copy = catalog(locale);

  return (
    <main className="mx-auto grid min-h-full max-w-lg gap-6 px-4 py-12">
      <div>
        <p className="text-sm text-muted">{copy.brand.office}</p>
        <h1 className="mt-1 text-3xl font-semibold">{copy.brand.name}</h1>
        <p className="mt-2 text-muted">{copy.login.subtitle}</p>
      </div>
      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="text-xl font-semibold">{copy.login.title}</h2>
        <div className="mt-4">
          <LoginForm
            locale={locale}
            labels={{
              email: copy.login.email,
              password: copy.login.password,
              submit: copy.login.submit,
              pending: copy.login.pending,
              invalid: copy.login.invalid,
            }}
          />
        </div>
      </section>
      <section className="rounded-xl border border-dashed border-line p-4 text-sm">
        <h2 className="font-semibold">{copy.login.demoTitle}</h2>
        <ul className="mt-2 grid gap-1">
          {demoOfficers.map((officer) => (
            <li key={officer.email}>
              {officer.name} · {officer.designation} · {officer.email}
            </li>
          ))}
        </ul>
        <p className="mt-2">
          {copy.login.demoPassword}: {demoPassword}
        </p>
      </section>
    </main>
  );
}
