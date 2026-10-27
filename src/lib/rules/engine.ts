import type { Finding, RuleBinding, RuleContext, Severity, Suggestion } from "./types";

const openStatuses = new Set(["pending", "returned"]);

export function evaluate(context: RuleContext): Finding[] {
  return [...context.bindings]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .flatMap((binding) => applyBinding(context, binding));
}

export function suggest(findings: Finding[]): Suggestion {
  const decisive = findings.filter(
    (finding) => finding.onFail === "REJECT" || finding.onFail === "RETURN",
  );

  if (decisive.length === 0) {
    return {
      action: "approved",
      confidence: findings.length > 0 ? "medium" : "high",
    };
  }

  const rejected = decisive.some((finding) => finding.onFail === "REJECT");
  const winners = decisive.filter(
    (finding) => finding.onFail === (rejected ? "REJECT" : "RETURN"),
  );

  return {
    action: rejected ? "rejected" : "returned",
    confidence: winners.some((finding) => finding.severity === "high")
      ? "high"
      : "medium",
  };
}

export function severityWeight(severity: Severity) {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

export function topFinding(findings: Finding[]) {
  const rejected = findings.some((finding) => finding.onFail === "REJECT");
  const returned = findings.some((finding) => finding.onFail === "RETURN");
  const pool = rejected
    ? findings.filter((finding) => finding.onFail === "REJECT")
    : returned
      ? findings.filter((finding) => finding.onFail === "RETURN")
      : findings;

  return pool
    .slice()
    .sort(
      (left, right) =>
        severityWeight(right.severity) - severityWeight(left.severity) ||
        left.bindingOrder - right.bindingOrder,
    )[0];
}

export function failedBindingOrders(findings: Finding[]) {
  return new Set(findings.map((finding) => finding.bindingOrder));
}

function applyBinding(context: RuleContext, binding: RuleBinding): Finding[] {
  switch (binding.code) {
    case "required_fields":
      return requiredFields(context, binding);
    case "required_documents":
      return requiredDocuments(context, binding);
    case "document_expired":
      return expiredDocuments(context, binding);
    case "duplicate_identity":
      return duplicates(context, binding);
    case "compare_fields":
      return compareFields(context, binding);
    case "threshold":
      return threshold(context, binding);
    default:
      throw new Error(`Unknown rule: ${String(binding.code)}`);
  }
}

function requiredFields(context: RuleContext, binding: RuleBinding): Finding[] {
  return stringList(binding, "fields").flatMap((fieldKey) => {
    if (!isEmpty(context.fieldValues[fieldKey])) return [];
    return [stamp(binding, { code: "required_field", params: { fieldKey } })];
  });
}

function requiredDocuments(context: RuleContext, binding: RuleBinding): Finding[] {
  return context.requiredDocumentCodes.flatMap((documentCode) => {
    const document = context.documents.find((item) => item.code === documentCode);
    if (!document || document.status === "missing") {
      return [
        stamp(binding, {
          code: "required_documents",
          params: { documentCode, problem: "missing" },
        }),
      ];
    }
    if (document.status === "illegible") {
      return [
        stamp(binding, {
          code: "required_documents",
          params: { documentCode, problem: "illegible" },
        }),
      ];
    }
    return [];
  });
}

function expiredDocuments(context: RuleContext, binding: RuleBinding): Finding[] {
  const today = kolkataDate(context.now);
  return context.documents.flatMap((document) => {
    if (document.status !== "present" || !document.expiresOn) return [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(document.expiresOn)) {
      throw new Error(`Invalid expiry date for ${document.code}`);
    }
    if (document.expiresOn >= today) return [];
    return [
      stamp(binding, {
        code: "document_expired",
        params: { documentCode: document.code, expiresOn: document.expiresOn },
      }),
    ];
  });
}

function duplicates(context: RuleContext, binding: RuleBinding): Finding[] {
  if (!context.identityKey.trim()) return [];
  return context.peers.flatMap((peer) => {
    const sameOpenFile =
      peer.id !== context.applicationId &&
      peer.identityKey === context.identityKey &&
      openStatuses.has(peer.status);
    if (!sameOpenFile) return [];
    return [
      stamp(binding, {
        code: "duplicate_identity",
        params: { referenceNo: peer.referenceNo },
      }),
    ];
  });
}

function compareFields(context: RuleContext, binding: RuleBinding): Finding[] {
  const operator = requiredString(binding, "operator");
  if (operator !== "neq") {
    throw new Error(`Unsupported compare operator: ${operator}`);
  }
  const leftKey = requiredString(binding, "left");
  const rightKey = requiredString(binding, "right");
  const left = context.fieldValues[leftKey];
  const right = context.fieldValues[rightKey];
  if (isEmpty(left) || isEmpty(right)) return [];
  if (normalizeText(left) === normalizeText(right)) return [];
  return [stamp(binding, { code: "compare_fields", params: { leftKey, rightKey } })];
}

function threshold(context: RuleContext, binding: RuleBinding): Finding[] {
  const operator = requiredString(binding, "operator");

  if (operator === "gt") {
    const fieldKey = requiredString(binding, "field");
    const limit = requiredNumber(binding, "value");
    const actual = readNumber(context, fieldKey, binding);
    if (typeof actual !== "number") return actual;
    if (actual <= limit) return [];
    return [stamp(binding, { code: "threshold_gt", params: { fieldKey, value: limit } })];
  }

  if (operator === "relative_diff_gt") {
    const leftKey = requiredString(binding, "left");
    const rightKey = requiredString(binding, "right");
    const tolerance = requiredNumber(binding, "tolerance");
    if (tolerance < 0 || tolerance >= 1) {
      throw new Error("Relative tolerance must be between 0 and 1");
    }
    const left = readNumber(context, leftKey, binding);
    const right = readNumber(context, rightKey, binding);
    if (!Array.isArray(left) && typeof left !== "number") return left;
    if (!Array.isArray(right) && typeof right !== "number") return right;
    if (typeof left !== "number" || typeof right !== "number") {
      return [...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])];
    }
    const base = Math.max(Math.abs(right), 1);
    if (Math.abs(left - right) / base <= tolerance) return [];
    return [
      stamp(binding, {
        code: "threshold_diff",
        params: {
          leftKey,
          rightKey,
          tolerancePercent: Math.round(tolerance * 100),
        },
      }),
    ];
  }

  throw new Error(`Unsupported threshold operator: ${operator}`);
}

function readNumber(
  context: RuleContext,
  fieldKey: string,
  binding: RuleBinding,
): number | Finding[] {
  const value = context.fieldValues[fieldKey];
  if (isEmpty(value)) return [];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return [stamp(binding, { code: "threshold_invalid", params: { fieldKey } })];
}

function stamp<T extends Omit<Finding, "severity" | "onFail" | "bindingOrder">>(
  binding: RuleBinding,
  body: T,
): Finding {
  return {
    ...body,
    severity: binding.severity,
    onFail: binding.onFail,
    bindingOrder: binding.sortOrder,
  } as Finding;
}

export function kolkataDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function isEmpty(value: unknown) {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

function normalizeText(value: unknown) {
  return String(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function requiredString(binding: RuleBinding, key: string) {
  const value = binding.params[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Rule ${binding.code} is missing text parameter "${key}"`);
  }
  return value;
}

function requiredNumber(binding: RuleBinding, key: string) {
  const value = binding.params[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Rule ${binding.code} is missing numeric parameter "${key}"`);
  }
  return value;
}

function stringList(binding: RuleBinding, key: string) {
  const value = binding.params[key];
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.trim() === "")
  ) {
    throw new Error(`Rule ${binding.code} parameter "${key}" must be a list of field keys`);
  }
  return value;
}
