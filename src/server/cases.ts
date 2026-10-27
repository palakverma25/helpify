import "server-only";
import type { Prisma } from "@prisma/client";
import type { Locale } from "@/i18n/locales";
import { catalog } from "@/i18n/catalog";
import { narrate } from "@/lib/ai/narrate";
import { prisma } from "@/lib/db";
import {
  formatDate,
  formatFieldValue,
  formatIsoDate,
  formatMoney,
  isSameKolkataDay,
} from "@/lib/format";
import { compareQueue, daysUntilDue } from "@/lib/priority";
import { describeFinding, fill } from "@/lib/present";
import {
  evaluate,
  failedBindingOrders,
  severityWeight,
  suggest,
  topFinding,
} from "@/lib/rules/engine";
import {
  ruleCodes,
  type DecisionAction,
  type DocumentSnapshot,
  type Finding,
  type OnFail,
  type RuleBinding,
  type RuleCode,
  type Severity,
} from "@/lib/rules/types";

const applicationInclude = {
  documents: true,
  decisions: {
    include: { officer: { select: { name: true } } },
    orderBy: { createdAt: "desc" as const },
  },
  service: {
    include: {
      translations: true,
      department: { include: { translations: true } },
      fields: { include: { translations: true }, orderBy: { sortOrder: "asc" as const } },
      documents: { include: { translations: true }, orderBy: { sortOrder: "asc" as const } },
      rules: { orderBy: { sortOrder: "asc" as const } },
    },
  },
} satisfies Prisma.ApplicationInclude;

type ApplicationRecord = Prisma.ApplicationGetPayload<{ include: typeof applicationInclude }>;

type StoredBinding = RuleBinding & { summaries: Prisma.JsonValue };

export type QueueFilters = {
  status: "open" | "pending" | "returned" | "approved" | "rejected";
  service: string;
  attention: "" | "missing" | "duplicate" | "sla" | "today";
};

export type QueueRow = {
  id: string;
  referenceNo: string;
  applicantName: string;
  locality: string;
  serviceName: string;
  serviceCode: string;
  status: string;
  submittedLabel: string;
  slaLabel: string;
  daysLeft: number;
  reason: string;
  failedConstraints: number;
  suggestion: DecisionAction;
};

export type ChecklistItem = {
  sortOrder: number;
  summary: string;
  passed: boolean;
  details: string[];
};

export type CaseFile = {
  id: string;
  referenceNo: string;
  status: string;
  applicantName: string;
  locality: string;
  identityKey: string;
  serviceName: string;
  serviceDescription: string;
  departmentName: string;
  slaDays: number;
  submittedLabel: string;
  slaLabel: string;
  daysLeft: number;
  fields: Array<{ label: string; value: string }>;
  documents: Array<{
    label: string;
    status: string;
    required: boolean;
    expiresLabel: string | null;
  }>;
  checklist: ChecklistItem[];
  failedConstraints: number;
  suggestion: DecisionAction;
  confidence: "high" | "medium";
  summary: string;
  narrativeSource: "template" | "model";
  canDecide: boolean;
  history: Array<{
    id: string;
    action: string;
    note: string;
    officerName: string;
    when: string;
    suggestedAction: string;
    overridden: boolean;
    lines: string[];
  }>;
  certificate: null | {
    template: string;
    fatherOrSpouse: string;
    familyIncome: string;
    purpose: string;
    decidedOn: string;
  };
};

const openStatuses = new Set(["pending", "returned"]);

export function parseFilters(
  query: Record<string, string | string[] | undefined>,
): QueueFilters {
  const one = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const status = one("status");
  const attention = one("attention");
  const statuses = ["open", "pending", "returned", "approved", "rejected"] as const;
  const attentions = ["missing", "duplicate", "sla", "today"] as const;
  return {
    status: statuses.find((item) => item === status) ?? "open",
    service: one("service") ?? "",
    attention: attentions.find((item) => item === attention) ?? "",
  };
}

export async function getQueue(officerId: string, locale: Locale, filters: QueueFilters) {
  const copy = catalog(locale);
  const now = new Date();
  const [applications, services] = await Promise.all([
    loadApplications(officerId),
    prisma.service.findMany({
      where: { department: { assignments: { some: { officerId } } } },
      include: { translations: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const scored = applications.map((application) =>
    score(application, applications, locale, now),
  );
  const inService = filters.service
    ? scored.filter((item) => item.serviceCode === filters.service)
    : scored;
  const open = inService.filter((item) => openStatuses.has(item.status));

  let rows = inService;
  if (filters.attention === "today") {
    rows = inService.filter((item) => item.decidedToday);
  } else {
    rows =
      filters.status === "open"
        ? open
        : inService.filter((item) => item.status === filters.status);
    if (filters.attention === "missing") {
      rows = rows.filter((item) => item.flags.has("missing"));
    }
    if (filters.attention === "duplicate") {
      rows = rows.filter((item) => item.flags.has("duplicate"));
    }
    if (filters.attention === "sla") {
      rows = rows.filter((item) => item.flags.has("sla"));
    }
  }

  rows.sort((left, right) =>
    compareQueue(
      {
        severity: left.severity,
        daysLeft: left.daysLeft,
        submittedAt: left.submittedAt,
      },
      {
        severity: right.severity,
        daysLeft: right.daysLeft,
        submittedAt: right.submittedAt,
      },
    ),
  );

  return {
    filters,
    services: services.map((service) => ({
      code: service.code,
      name: byLocale(service.translations, locale, "name"),
      description: byLocale(service.translations, locale, "description"),
    })),
    stats: {
      open: open.length,
      missing: open.filter((item) => item.flags.has("missing")).length,
      duplicates: open.filter((item) => item.flags.has("duplicate")).length,
      sla: open.filter((item) => item.flags.has("sla")).length,
      decidedToday: inService.filter((item) => item.decidedToday).length,
    },
    rows: rows.map((item) => toQueueRow(item, copy, locale)),
  };
}

export async function getCase(
  officerId: string,
  applicationId: string,
  locale: Locale,
  options: { narrative?: boolean } = {},
) {
  const applications = await loadApplications(officerId);
  const application = applications.find((item) => item.id === applicationId);
  if (!application) return null;
  const scored = score(application, applications, locale, new Date());
  const copy = catalog(locale);
  const file = toCaseFile(scored, copy, locale);
  if (options.narrative === false) return file;
  const narrative = await narrate({
    locale,
    fallback: file.summary,
    suggestedAction: file.suggestion,
    referenceNo: file.referenceNo,
    failedLines: file.checklist.flatMap((item) => item.details),
  });
  return {
    ...file,
    summary: narrative.summary,
    narrativeSource: narrative.source,
  };
}

async function loadApplications(officerId: string) {
  return prisma.application.findMany({
    where: {
      service: { department: { assignments: { some: { officerId } } } },
    },
    include: applicationInclude,
  });
}

function score(
  application: ApplicationRecord,
  applications: ApplicationRecord[],
  locale: Locale,
  now: Date,
) {
  const copy = catalog(locale).findings;
  const bindings = application.service.rules.map(toBinding);
  const fieldValues = asFields(application.fieldValues);
  const documents = application.documents.map(toDocument);
  const peers = applications
    .filter(
      (other) => other.serviceId === application.serviceId && other.id !== application.id,
    )
    .map((other) => ({
      id: other.id,
      referenceNo: other.referenceNo,
      identityKey: other.identityKey,
      status: other.status,
    }));

  const findings = evaluate({
    applicationId: application.id,
    identityKey: application.identityKey,
    fieldValues,
    documents,
    requiredDocumentCodes: application.service.documents
      .filter((document) => document.required)
      .map((document) => document.code),
    peers,
    now,
    bindings,
  });
  const suggestion = suggest(findings);
  const daysLeft = daysUntilDue(application.submittedAt, application.service.slaDays, now);
  const labels = {
    fields: Object.fromEntries(
      application.service.fields.map((field) => [
        field.key,
        byLocale(field.translations, locale, "label"),
      ]),
    ),
    documents: Object.fromEntries(
      application.service.documents.map((document) => [
        document.code,
        byLocale(document.translations, locale, "label"),
      ]),
    ),
  };
  const format = {
    money: (value: number) => formatMoney(value, locale),
    date: (iso: string) => formatIsoDate(iso, locale),
  };
  const detailsFor = (finding: Finding) => describeFinding(finding, copy, labels, format);
  const failed = failedBindingOrders(findings);
  const flags = new Set<string>();
  if (findings.some((finding) => finding.code === "required_documents")) flags.add("missing");
  if (findings.some((finding) => finding.code === "duplicate_identity")) flags.add("duplicate");
  if (openStatuses.has(application.status) && daysLeft <= 2) flags.add("sla");

  return {
    application,
    fieldValues,
    findings,
    suggestion,
    daysLeft,
    labels,
    detailsFor,
    failed,
    flags,
    bindings,
    severity: findings.reduce(
      (highest, finding) => Math.max(highest, severityWeight(finding.severity)),
      0,
    ),
    submittedAt: application.submittedAt.getTime(),
    serviceCode: application.service.code,
    serviceName: byLocale(application.service.translations, locale, "name"),
    serviceDescription: byLocale(application.service.translations, locale, "description"),
    departmentName: byLocale(application.service.department.translations, locale, "name"),
    status: application.status,
    decidedToday: application.decisions.some((decision) =>
      isSameKolkataDay(decision.createdAt, now),
    ),
    top: topFinding(findings),
  };
}

function toQueueRow(
  item: ReturnType<typeof score>,
  copy: ReturnType<typeof catalog>,
  locale: Locale,
): QueueRow {
  const reason = item.top
    ? item.detailsFor(item.top)
    : item.daysLeft < 0
      ? copy.queue.slaOverdue
      : item.daysLeft <= 2
        ? copy.queue.slaSoon
        : copy.queue.clear;

  return {
    id: item.application.id,
    referenceNo: item.application.referenceNo,
    applicantName: item.application.applicantName,
    locality: item.application.locality,
    serviceName: item.serviceName,
    serviceCode: item.serviceCode,
    status: item.status,
    submittedLabel: formatDate(item.application.submittedAt, locale),
    slaLabel: slaLabel(item.daysLeft, copy),
    daysLeft: item.daysLeft,
    reason,
    failedConstraints: item.failed.size,
    suggestion: item.suggestion.action,
  };
}

function toCaseFile(item: ReturnType<typeof score>, copy: ReturnType<typeof catalog>, locale: Locale): CaseFile {
  const fallback =
    item.suggestion.action === "approved" && item.findings.length === 0
      ? copy.assist.summaryApproved
      : item.suggestion.action === "approved"
        ? copy.assist.summaryApprovedFlags
        : item.suggestion.action === "returned"
          ? copy.assist.summaryReturned
          : copy.assist.summaryRejected;
  const latestApproval = item.application.decisions.find(
    (decision) => decision.action === "approved",
  );

  return {
    id: item.application.id,
    referenceNo: item.application.referenceNo,
    status: item.status,
    applicantName: item.application.applicantName,
    locality: item.application.locality,
    identityKey: item.application.identityKey,
    serviceName: item.serviceName,
    serviceDescription: item.serviceDescription,
    departmentName: item.departmentName,
    slaDays: item.application.service.slaDays,
    submittedLabel: formatDate(item.application.submittedAt, locale),
    slaLabel: slaLabel(item.daysLeft, copy),
    daysLeft: item.daysLeft,
    fields: item.application.service.fields.map((field) => ({
      label: byLocale(field.translations, locale, "label"),
      value: formatFieldValue(field.type, item.fieldValues[field.key], locale),
    })),
    documents: item.application.service.documents.map((documentType) => {
      const attached = item.application.documents.find(
        (document) => document.documentCode === documentType.code,
      );
      return {
        label: byLocale(documentType.translations, locale, "label"),
        status: attached?.status ?? "missing",
        required: documentType.required,
        expiresLabel: attached?.expiresOn ? formatIsoDate(attached.expiresOn, locale) : null,
      };
    }),
    checklist: item.bindings.map((binding) => ({
      sortOrder: binding.sortOrder,
      summary: summaryIn(binding.summaries, locale),
      passed: !item.failed.has(binding.sortOrder),
      details: item.findings
        .filter((finding) => finding.bindingOrder === binding.sortOrder)
        .map((finding) => item.detailsFor(finding)),
    })),
    failedConstraints: item.failed.size,
    suggestion: item.suggestion.action,
    confidence: item.suggestion.confidence,
    summary: fallback,
    narrativeSource: "template",
    canDecide: openStatuses.has(item.status),
    history: item.application.decisions.map((decision) => ({
      id: decision.id,
      action: decision.action,
      note: decision.note,
      officerName: decision.officer.name,
      when: formatDate(decision.createdAt, locale),
      suggestedAction: decision.suggestedAction,
      overridden: decision.suggestionOverridden,
      lines: snapshotLines(decision.findingsSnapshot),
    })),
    certificate:
      item.status === "approved" && item.application.service.certificateTemplate
        ? {
            template: item.application.service.certificateTemplate,
            fatherOrSpouse: String(item.fieldValues.fatherOrSpouse ?? "—"),
            familyIncome:
              typeof item.fieldValues.familyIncome === "number"
                ? formatMoney(item.fieldValues.familyIncome, locale)
                : "—",
            purpose: String(item.fieldValues.purpose ?? "—"),
            decidedOn: latestApproval
              ? formatDate(latestApproval.createdAt, locale)
              : formatDate(new Date(), locale),
          }
        : null,
  };
}

function slaLabel(daysLeft: number, copy: ReturnType<typeof catalog>) {
  if (daysLeft < 0) return fill(copy.queue.daysOverdue, { count: Math.abs(daysLeft) });
  if (daysLeft === 0) return copy.queue.dueToday;
  return fill(copy.queue.daysLeft, { count: daysLeft });
}

function toBinding(rule: ApplicationRecord["service"]["rules"][number]): StoredBinding {
  if (!(ruleCodes as readonly string[]).includes(rule.code)) {
    throw new Error(`Unknown stored rule: ${rule.code}`);
  }
  return {
    code: rule.code as RuleCode,
    severity: rule.severity as Severity,
    onFail: rule.onFail as OnFail,
    params: asRecord(rule.params),
    sortOrder: rule.sortOrder,
    summaries: rule.summaries,
  };
}

function toDocument(document: ApplicationRecord["documents"][number]): DocumentSnapshot {
  const status =
    document.status === "present" || document.status === "illegible"
      ? document.status
      : "missing";
  return {
    code: document.documentCode,
    status,
    expiresOn: document.expiresOn,
  };
}

function asRecord(value: Prisma.JsonValue): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asFields(value: Prisma.JsonValue) {
  const record = asRecord(value);
  const fields: Record<string, string | number> = {};
  for (const [key, item] of Object.entries(record)) {
    if (typeof item === "string" || typeof item === "number") fields[key] = item;
  }
  return fields;
}

function summaryIn(value: Prisma.JsonValue, locale: string) {
  const record = asRecord(value);
  const picked = record[locale] ?? record.hi ?? record.en;
  return typeof picked === "string" ? picked : "";
}

function byLocale(
  entries: Array<{ locale: string; name?: string; label?: string; description?: string }>,
  locale: string,
  key: "name" | "label" | "description",
) {
  const match = entries.find((entry) => entry.locale === locale) ?? entries.find((entry) => entry.locale === "hi");
  return match?.[key] ?? "";
}

function snapshotLines(value: Prisma.JsonValue) {
  const record = asRecord(value);
  const lines = record.lines;
  if (!Array.isArray(lines)) return [];
  return lines.filter((line): line is string => typeof line === "string");
}
