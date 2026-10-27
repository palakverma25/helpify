import Link from "next/link";
import { CaseChat } from "@/components/case-chat";
import { FileSummary } from "@/components/file-summary";
import type { Catalog } from "@/i18n/catalog";
import type { Locale } from "@/i18n/locales";
import { fill } from "@/lib/present";
import type { CaseFile } from "@/server/cases";
import { decideApplication } from "@/server/actions";

export function CaseFileView({
  locale,
  copy,
  file,
  notice,
}: {
  locale: Locale;
  copy: Catalog;
  file: CaseFile;
  notice: "" | "saved" | "note" | "closed";
}) {
  const suggestion = decisionLabel(copy, file.suggestion);

  return (
    <div className="grid gap-5 pb-8">
      <div>
        <Link href={`/${locale}`} className="text-sm font-medium text-pine">
          ← {copy.file.back}
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{file.referenceNo}</h1>
            <p className="mt-1">
              {file.applicantName} · {file.serviceName} · {file.locality}
            </p>
            <p className="text-sm text-muted">
              {file.departmentName} · {fill(copy.file.slaRule, { days: file.slaDays })} {file.slaLabel}
            </p>
          </div>
          <span className="rounded-full bg-stone px-3 py-1 text-sm">{statusLabel(copy, file.status)}</span>
        </div>
        <p className="mt-3 max-w-3xl text-sm">{file.serviceDescription}</p>
      </div>

      {notice === "saved" ? <Notice tone="ok">{copy.actions.saved}</Notice> : null}
      {notice === "note" ? <Notice tone="warn">{copy.actions.noteMissing}</Notice> : null}
      {notice === "closed" ? <Notice tone="warn">{copy.actions.closed}</Notice> : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div className="grid gap-5">
          <section className="rounded-xl border border-line bg-card p-4">
            <h2 className="text-lg font-semibold">{copy.file.facts}</h2>
            <p className="mt-2 text-sm text-muted">
              {copy.file.identity}: {file.identityKey}
            </p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {file.fields.map((field) => (
                <div key={field.label}>
                  <dt className="text-sm text-muted">{field.label}</dt>
                  <dd className="font-medium">{field.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl border border-line bg-card p-4">
            <h2 className="text-lg font-semibold">{copy.file.documents}</h2>
            <ul className="mt-3 divide-y divide-line">
              {file.documents.map((document) => (
                <li key={document.label} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <span>
                    <span className="block font-medium">{document.label}</span>
                    <span className="text-muted">
                      {document.required ? copy.file.required : copy.file.optional}
                      {document.expiresLabel ? ` · ${document.expiresLabel}` : ""}
                    </span>
                  </span>
                  <span className={document.status === "present" ? "text-pine" : "text-brick"}>
                    {documentStatus(copy, document.status)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-line bg-card p-4">
            <h2 className="text-lg font-semibold">{copy.file.history}</h2>
            {file.history.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{copy.file.noHistory}</p>
            ) : (
              <ol className="mt-3 grid gap-3">
                {file.history.map((decision) => (
                  <li key={decision.id} className="border-t border-line pt-3 text-sm first:border-t-0 first:pt-0">
                    <p className="font-medium">
                      {decisionLabel(copy, decision.action)} · {decision.officerName} · {decision.when}
                    </p>
                    <p className="text-muted">
                      {fill(copy.actions.suggestedWas, {
                        action: decisionLabel(copy, decision.suggestedAction),
                      })}
                      {decision.overridden ? ` ${copy.actions.overridden}` : ""}
                    </p>
                    {decision.note ? <p className="mt-1">{decision.note}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="rounded-xl border border-line bg-card p-4 lg:sticky lg:top-4">
          <p className="text-sm text-muted">{copy.assist.kicker}</p>
          <h2 className="text-lg font-semibold">{copy.assist.title}</h2>
          <FileSummary
            locale={locale}
            applicationId={file.id}
            summary={file.summary}
            sourceTemplate={copy.assist.sourceTemplate}
            sourceModel={copy.assist.sourceModel}
          />
          <p className="mt-4 text-sm">
            <span className="text-muted">{copy.assist.suggestion}: </span>
            <strong className="text-base">{suggestion}</strong>
          </p>
          <p className="text-sm">
            <span className="text-muted">{copy.assist.confidence}: </span>
            <strong>
              {file.confidence === "high"
                ? copy.assist.confidenceHigh
                : copy.assist.confidenceMedium}
            </strong>
          </p>
          <p className="mt-3 text-sm">{copy.assist.disclaimer}</p>
          <h3 className="mt-5 font-semibold">{copy.file.scheme}</h3>
          <ul className="mt-2 grid gap-3">
            {file.checklist.map((item) => (
              <li key={item.sortOrder} className="rounded-lg border border-line p-3 text-sm">
                <p className={item.passed ? "font-medium text-pine" : "font-medium text-brick"}>
                  {item.passed ? copy.assist.passed : copy.assist.failed}
                </p>
                <p className="mt-1">{item.summary}</p>
                {item.details.length > 0 ? (
                  <ul className="mt-2 list-disc pl-4 text-brick">
                    {item.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
          <CaseChat
            locale={locale}
            applicationId={file.id}
            labels={{
              title: copy.assist.chatTitle,
              hint: copy.assist.chatHint,
              placeholder: copy.assist.chatPlaceholder,
              submit: copy.assist.chatSubmit,
              pending: copy.assist.chatPending,
              empty: copy.assist.chatEmpty,
              unavailable: copy.assist.chatUnavailable,
            }}
          />
        </aside>
      </div>

      {file.certificate ? <Certificate copy={copy} file={file} /> : null}

      {file.canDecide ? (
        <form action={decideApplication} className="rounded-xl border border-line bg-card p-4">
          <h2 className="text-lg font-semibold">{copy.actions.final}</h2>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="applicationId" value={file.id} />
          <label className="mt-3 grid gap-1 text-sm font-medium">
            {copy.actions.note}
            <textarea
              name="note"
              rows={3}
              className="rounded-md border border-line px-3 py-2 font-normal"
            />
          </label>
          <p className="mt-1 text-sm text-muted">{copy.actions.noteHint}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button name="action" value="approved" className="rounded-md bg-pine px-4 py-2 font-semibold text-paper">
              {copy.actions.approved}
            </button>
            <button name="action" value="returned" className="rounded-md bg-amber px-4 py-2 font-semibold text-paper">
              {copy.actions.returned}
            </button>
            <button name="action" value="rejected" className="rounded-md bg-brick px-4 py-2 font-semibold text-paper">
              {copy.actions.rejected}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function Certificate({ copy, file }: { copy: Catalog; file: CaseFile }) {
  if (!file.certificate) return null;
  const generic = file.certificate.template !== "income-certificate";
  return (
    <section className="relative overflow-hidden rounded-xl border-2 border-pine bg-card p-6">
      <p className="pointer-events-none absolute inset-0 grid place-items-center text-3xl font-semibold text-brick/20 rotate-[-12deg]">
        {copy.certificate.watermark}
      </p>
      <div className="relative">
        <p className="text-sm text-muted">{copy.brand.office}</p>
        <h2 className="mt-1 text-xl font-semibold">
          {generic ? copy.certificate.genericTitle : copy.certificate.title}
        </h2>
        <p className="mt-3 text-sm">
          {copy.certificate.number}: {file.referenceNo}
        </p>
        <p className="text-sm">
          {copy.certificate.date}: {file.certificate.decidedOn}
        </p>
        <p className="mt-4 max-w-3xl leading-7">
          {generic
            ? copy.certificate.genericBody
            : fill(copy.certificate.body, {
                name: file.applicantName,
                relation: file.certificate.fatherOrSpouse,
                locality: file.locality,
                income: file.certificate.familyIncome,
                purpose: file.certificate.purpose,
              })}
        </p>
        <p className="mt-4 text-sm text-brick">{copy.certificate.footer}</p>
      </div>
    </section>
  );
}

function Notice({ children, tone }: { children: string; tone: "ok" | "warn" }) {
  return (
    <p
      role="status"
      className={`rounded-lg px-3 py-2 text-sm ${tone === "ok" ? "bg-moss text-pine" : "bg-amber-soft text-amber"}`}
    >
      {children}
    </p>
  );
}

function statusLabel(copy: Catalog, status: string) {
  if (status === "pending" || status === "returned" || status === "approved" || status === "rejected") {
    return copy.status[status];
  }
  return status;
}

function decisionLabel(copy: Catalog, action: string) {
  if (action === "approved" || action === "rejected" || action === "returned") {
    return copy.decision[action];
  }
  return action;
}

function documentStatus(copy: Catalog, status: string) {
  if (status === "present") return copy.file.docPresent;
  if (status === "illegible") return copy.file.docIllegible;
  return copy.file.docMissing;
}
