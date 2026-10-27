import type { Finding } from "./rules/types";

export type FindingCopy = {
  required_field: string;
  required_documents_missing: string;
  required_documents_illegible: string;
  document_expired: string;
  duplicate_identity: string;
  compare_fields: string;
  threshold_gt: string;
  threshold_diff: string;
  threshold_invalid: string;
};

export type FindingLabels = {
  fields: Record<string, string>;
  documents: Record<string, string>;
};

export function fill(template: string, params: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ""));
}

export function describeFinding(
  finding: Finding,
  copy: FindingCopy,
  labels: FindingLabels,
  format: {
    money: (value: number) => string;
    date: (iso: string) => string;
  },
) {
  const field = (key: string) => labels.fields[key] ?? key;
  const document = (code: string) => labels.documents[code] ?? code;

  switch (finding.code) {
    case "required_field":
      return fill(copy.required_field, { field: field(finding.params.fieldKey) });
    case "required_documents":
      return fill(
        finding.params.problem === "illegible"
          ? copy.required_documents_illegible
          : copy.required_documents_missing,
        { document: document(finding.params.documentCode) },
      );
    case "document_expired":
      return fill(copy.document_expired, {
        document: document(finding.params.documentCode),
        expiresOn: format.date(finding.params.expiresOn),
      });
    case "duplicate_identity":
      return fill(copy.duplicate_identity, { reference: finding.params.referenceNo });
    case "compare_fields":
      return fill(copy.compare_fields, {
        left: field(finding.params.leftKey),
        right: field(finding.params.rightKey),
      });
    case "threshold_gt":
      return fill(copy.threshold_gt, {
        field: field(finding.params.fieldKey),
        value: format.money(finding.params.value),
      });
    case "threshold_diff":
      return fill(copy.threshold_diff, {
        left: field(finding.params.leftKey),
        right: field(finding.params.rightKey),
        percent: finding.params.tolerancePercent,
      });
    case "threshold_invalid":
      return fill(copy.threshold_invalid, { field: field(finding.params.fieldKey) });
    default:
      return "";
  }
}
