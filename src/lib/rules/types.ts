export const severities = ["high", "medium", "low"] as const;
export type Severity = (typeof severities)[number];

export const dispositions = ["REJECT", "RETURN", "FLAG"] as const;
export type OnFail = (typeof dispositions)[number];

export const decisionActions = ["approved", "rejected", "returned"] as const;
export type DecisionAction = (typeof decisionActions)[number];

export type Confidence = "high" | "medium";

export const ruleCodes = [
  "required_fields",
  "required_documents",
  "document_expired",
  "duplicate_identity",
  "compare_fields",
  "threshold",
] as const;
export type RuleCode = (typeof ruleCodes)[number];

export type RuleBinding = {
  code: RuleCode;
  severity: Severity;
  onFail: OnFail;
  params: Record<string, unknown>;
  sortOrder: number;
};

export type DocumentSnapshot = {
  code: string;
  status: "present" | "missing" | "illegible";
  expiresOn: string | null;
};

export type PeerApplication = {
  id: string;
  referenceNo: string;
  identityKey: string;
  status: string;
};

type FindingBase = {
  severity: Severity;
  onFail: OnFail;
  bindingOrder: number;
};

export type Finding = FindingBase &
  (
    | {
        code: "required_field";
        params: { fieldKey: string };
      }
    | {
        code: "required_documents";
        params: { documentCode: string; problem: "missing" | "illegible" };
      }
    | {
        code: "document_expired";
        params: { documentCode: string; expiresOn: string };
      }
    | {
        code: "duplicate_identity";
        params: { referenceNo: string };
      }
    | {
        code: "compare_fields";
        params: { leftKey: string; rightKey: string };
      }
    | {
        code: "threshold_gt";
        params: { fieldKey: string; value: number };
      }
    | {
        code: "threshold_diff";
        params: { leftKey: string; rightKey: string; tolerancePercent: number };
      }
    | {
        code: "threshold_invalid";
        params: { fieldKey: string };
      }
  );

export type RuleContext = {
  applicationId: string;
  identityKey: string;
  fieldValues: Record<string, unknown>;
  documents: DocumentSnapshot[];
  requiredDocumentCodes: string[];
  peers: PeerApplication[];
  now: Date;
  bindings: RuleBinding[];
};

export type Suggestion = {
  action: DecisionAction;
  confidence: Confidence;
};

export function isDecisionAction(value: unknown): value is DecisionAction {
  return (
    typeof value === "string" &&
    (decisionActions as readonly string[]).includes(value)
  );
}
