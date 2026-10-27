import Link from "next/link";
import type { Catalog } from "@/i18n/catalog";
import type { Locale } from "@/i18n/locales";
import { fill } from "@/lib/present";
import type { QueueFilters, QueueRow } from "@/server/cases";

type QueueData = {
  filters: QueueFilters;
  services: Array<{ code: string; name: string; description: string }>;
  stats: {
    open: number;
    missing: number;
    duplicates: number;
    sla: number;
    decidedToday: number;
  };
  rows: QueueRow[];
};

export function QueueBoard({
  locale,
  copy,
  data,
}: {
  locale: Locale;
  copy: Catalog;
  data: QueueData;
}) {
  const description =
    data.services.find((service) => service.code === data.filters.service)?.description ??
    (data.services.length === 1 ? data.services[0]?.description : "");

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">{copy.queue.title}</h1>
        <p className="mt-1 max-w-3xl text-muted">{copy.queue.subtitle}</p>
        {description ? <p className="mt-2 max-w-3xl text-sm">{description}</p> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          href={href(locale, { status: "open" })}
          label={copy.queue.pending}
          value={data.stats.open}
          active={data.filters.attention === "" && data.filters.status === "open"}
        />
        <Stat
          href={href(locale, { status: "open", attention: "missing" })}
          label={copy.queue.missingDocs}
          value={data.stats.missing}
          active={data.filters.attention === "missing"}
        />
        <Stat
          href={href(locale, { status: "open", attention: "duplicate" })}
          label={copy.queue.duplicates}
          value={data.stats.duplicates}
          active={data.filters.attention === "duplicate"}
        />
        <Stat
          href={href(locale, { status: "open", attention: "sla" })}
          label={copy.queue.slaRisk}
          value={data.stats.sla}
          active={data.filters.attention === "sla"}
        />
        <Stat
          href={href(locale, { attention: "today" })}
          label={copy.queue.decidedToday}
          value={data.stats.decidedToday}
          active={data.filters.attention === "today"}
        />
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        {data.filters.attention ? (
          <input type="hidden" name="attention" value={data.filters.attention} />
        ) : null}
        <label className="grid gap-1 text-sm font-medium">
          {copy.queue.filterService}
          <select
            name="service"
            defaultValue={data.filters.service}
            className="h-10 min-w-48 rounded-md border border-line bg-card px-2"
          >
            <option value="">{copy.queue.allServices}</option>
            {data.services.map((service) => (
              <option key={service.code} value={service.code}>
                {service.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          {copy.queue.filterStatus}
          <select
            name="status"
            defaultValue={data.filters.status}
            className="h-10 rounded-md border border-line bg-card px-2"
          >
            <option value="open">{copy.queue.statusOpen}</option>
            <option value="pending">{copy.queue.statusPending}</option>
            <option value="returned">{copy.queue.statusReturned}</option>
            <option value="approved">{copy.queue.statusApproved}</option>
            <option value="rejected">{copy.queue.statusRejected}</option>
          </select>
        </label>
        <button type="submit" className="h-10 rounded-md bg-pine px-4 font-medium text-paper">
          {copy.queue.apply}
        </button>
      </form>

      <p className="text-sm text-muted">
        {fill(copy.queue.showing, { count: data.rows.length })} · {copy.queue.orderHint}
      </p>

      {data.rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-card px-4 py-8 text-center text-muted">
          {copy.queue.empty}
        </p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-card md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">{copy.queue.reference}</th>
                  <th className="px-3 py-2 font-medium">{copy.queue.applicant}</th>
                  <th className="px-3 py-2 font-medium">{copy.queue.service}</th>
                  <th className="px-3 py-2 font-medium">{copy.queue.sla}</th>
                  <th className="px-3 py-2 font-medium">{copy.queue.attention}</th>
                  <th className="px-3 py-2 font-medium">{copy.queue.constraints}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id} className="border-t border-line align-top">
                    <td className="px-3 py-3">
                      <Link href={`/${locale}/applications/${row.id}`} className="font-semibold text-pine underline-offset-2 hover:underline">
                        {row.referenceNo}
                      </Link>
                      <Status copy={copy} status={row.status} />
                    </td>
                    <td className="px-3 py-3">
                      <span className="block font-medium">{row.applicantName}</span>
                      <span className="text-muted">{row.locality}</span>
                    </td>
                    <td className="px-3 py-3">{row.serviceName}</td>
                    <td className={`px-3 py-3 ${row.daysLeft < 0 ? "text-brick" : row.daysLeft <= 2 ? "text-amber" : ""}`}>
                      {row.slaLabel}
                      <span className="block text-muted">{row.submittedLabel}</span>
                    </td>
                    <td className="px-3 py-3">{row.reason}</td>
                    <td className="px-3 py-3">
                      {row.failedConstraints === 0
                        ? copy.queue.allMet
                        : fill(copy.queue.failedCount, { count: row.failedConstraints })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {data.rows.map((row) => (
              <Link
                key={row.id}
                href={`/${locale}/applications/${row.id}`}
                className="rounded-xl border border-line bg-card p-3"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{row.referenceNo}</span>
                  <Status copy={copy} status={row.status} />
                </span>
                <span className="mt-1 block font-medium">{row.applicantName}</span>
                <span className="block text-sm text-muted">
                  {row.locality} · {row.serviceName}
                </span>
                <span className="mt-2 block text-sm">{row.reason}</span>
                <span className={`mt-1 block text-sm ${row.daysLeft <= 2 ? "text-amber" : "text-muted"}`}>
                  {row.slaLabel}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  href: destination,
  label,
  value,
  active,
}: {
  href: string;
  label: string;
  value: number;
  active: boolean;
}) {
  return (
    <Link
      href={destination}
      aria-current={active ? "page" : undefined}
      className={`rounded-xl border px-3 py-3 ${active ? "border-pine bg-moss" : "border-line bg-card"}`}
    >
      <span className="block text-2xl font-semibold">{value}</span>
      <span className="block text-sm text-muted">{label}</span>
    </Link>
  );
}

function Status({ copy, status }: { copy: Catalog; status: string }) {
  const label = statusLabel(copy, status);
  const tone =
    status === "approved"
      ? "bg-moss text-pine"
      : status === "rejected"
        ? "bg-brick-soft text-brick"
        : status === "returned"
          ? "bg-amber-soft text-amber"
          : "bg-stone text-ink";
  return <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${tone}`}>{label}</span>;
}

function statusLabel(copy: Catalog, status: string) {
  if (status === "pending" || status === "returned" || status === "approved" || status === "rejected") {
    return copy.status[status];
  }
  return status;
}

function href(locale: string, filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return `/${locale}${query ? `?${query}` : ""}`;
}
