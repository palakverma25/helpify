import { describe, expect, it } from "vitest";
import { incomeCertificate, incomeCeiling } from "@/content/services/income-certificate";
import { daysUntilDue, compareQueue } from "@/lib/priority";
import { evaluate, kolkataDate, suggest, topFinding } from "./engine";
import type { DocumentSnapshot, RuleBinding, RuleContext } from "./types";

const now = new Date("2026-10-27T08:00:00+05:30");
const bindings: RuleBinding[] = incomeCertificate.rules.map((rule) => ({
  code: rule.code,
  severity: rule.severity,
  onFail: rule.onFail,
  params: rule.params,
  sortOrder: rule.sortOrder,
}));
const requiredDocumentCodes = incomeCertificate.documents
  .filter((document) => document.required)
  .map((document) => document.code);

const address = "वार्ड 4, ग्राम रमपुरा, डेमो तहसील, ज़िला नमूना";

function documents(
  overrides: Partial<Record<string, DocumentSnapshot["status"]>> = {},
  expiry = "2099-01-01",
): DocumentSnapshot[] {
  return incomeCertificate.documents.map((document) => ({
    code: document.code,
    status: overrides[document.code] ?? "present",
    expiresOn: document.code === "identity_proof" ? expiry : null,
  }));
}

function context(patch: Partial<RuleContext> = {}): RuleContext {
  return {
    applicationId: "app-1",
    identityKey: "DEMO-ID-1001",
    fieldValues: {
      fatherOrSpouse: "राम दीन",
      occupation: "कृषि",
      familyIncome: 72_000,
      assessedIncome: 72_000,
      address,
      idAddress: address,
      purpose: "छात्रवृत्ति",
    },
    documents: documents(),
    requiredDocumentCodes,
    peers: [],
    now,
    bindings,
    ...patch,
  };
}

describe("income certificate scheme", () => {
  it("keeps the ceiling, tolerance, and mandatory documents explicit", () => {
    const ceiling = incomeCertificate.rules.find(
      (rule) => rule.params.operator === "gt",
    );
    const tolerance = incomeCertificate.rules.find(
      (rule) => rule.params.operator === "relative_diff_gt",
    );
    expect(ceiling?.params.value).toBe(incomeCeiling);
    expect(ceiling?.onFail).toBe("REJECT");
    expect(tolerance?.params.tolerance).toBe(0.15);
    expect(tolerance?.onFail).toBe("RETURN");
    expect(requiredDocumentCodes).toEqual([
      "identity_proof",
      "address_proof",
      "income_proof",
      "affidavit",
      "photo",
    ]);
    expect(incomeCertificate.documents.find((item) => item.code === "bank_passbook")?.required).toBe(
      false,
    );
  });

  it("approves an exact ceiling and a difference inside 15 percent", () => {
    const exact = evaluate(
      context({
        fieldValues: {
          ...context().fieldValues,
          familyIncome: 100_000,
          assessedIncome: 100_000,
        },
      }),
    );
    expect(suggest(exact)).toEqual({ action: "approved", confidence: "high" });

    const near = evaluate(
      context({
        fieldValues: {
          ...context().fieldValues,
          familyIncome: 96_000,
          assessedIncome: 108_000,
        },
      }),
    );
    expect(suggest(near).action).toBe("approved");
  });

  it("rejects income above the ceiling even when another gap would only return the file", () => {
    const findings = evaluate(
      context({
        fieldValues: {
          ...context().fieldValues,
          familyIncome: 180_000,
          assessedIncome: 180_000,
        },
        documents: documents({ affidavit: "missing" }),
      }),
    );
    expect(findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["required_documents", "threshold_gt"]),
    );
    expect(suggest(findings)).toEqual({ action: "rejected", confidence: "high" });
    expect(topFinding(findings)?.code).toBe("threshold_gt");
    expect(evaluate(context({
      fieldValues: { ...context().fieldValues, familyIncome: 100_001, assessedIncome: 100_001 },
    })).some((finding) => finding.code === "threshold_gt")).toBe(true);
  });

  it("returns income mismatches above 15 percent and ignores a missing optional document", () => {
    const mismatch = suggest(
      evaluate(
        context({
          fieldValues: {
            ...context().fieldValues,
            familyIncome: 90_000,
            assessedIncome: 150_000,
          },
        }),
      ),
    );
    expect(mismatch).toEqual({ action: "returned", confidence: "high" });

    const optional = evaluate(context({ documents: documents({ bank_passbook: "missing" }) }));
    expect(optional).toEqual([]);
  });

  it("returns blank details, illegible proofs, expired identity, address mismatch, and open duplicates", () => {
    expect(
      suggest(
        evaluate(
          context({
            fieldValues: { ...context().fieldValues, purpose: "  " },
          }),
        ),
      ).action,
    ).toBe("returned");

    expect(
      evaluate(context({ documents: documents({ income_proof: "illegible" }) }))[0]?.code,
    ).toBe("required_documents");

    expect(
      evaluate(context({ documents: documents({}, "2024-01-01") }))[0]?.code,
    ).toBe("document_expired");

    expect(
      evaluate(context({ documents: documents({}, kolkataDate(now)) })),
    ).toEqual([]);

    const mismatched = evaluate(
      context({
        fieldValues: {
          ...context().fieldValues,
          idAddress: "वार्ड 9, ग्राम चंदपुरा, डेमो तहसील",
        },
      }),
    );
    expect(suggest(mismatched)).toEqual({ action: "returned", confidence: "medium" });

    const spaced = evaluate(
      context({
        fieldValues: {
          ...context().fieldValues,
          idAddress: `  ${address.replace(/, /g, ",  ")} `,
        },
      }),
    );
    expect(spaced).toEqual([]);

    const duplicate = suggest(
      evaluate(
        context({
          peers: [
            {
              id: "app-2",
              referenceNo: "AY-2026-1008",
              identityKey: "DEMO-ID-1001",
              status: "pending",
            },
          ],
        }),
      ),
    );
    expect(duplicate.action).toBe("returned");

    const closedPeer = evaluate(
      context({
        peers: [
          {
            id: "app-2",
            referenceNo: "AY-2026-1008",
            identityKey: "DEMO-ID-1001",
            status: "approved",
          },
        ],
      }),
    );
    expect(closedPeer).toEqual([]);
  });

  it("does not treat a missing or non-numeric income as being over the ceiling", () => {
    const missing = evaluate(
      context({
        fieldValues: { ...context().fieldValues, familyIncome: undefined },
      }),
    );
    expect(missing.some((finding) => finding.code === "threshold_gt")).toBe(false);
    expect(missing.some((finding) => finding.code === "required_field")).toBe(true);

    const text = evaluate(
      context({
        fieldValues: { ...context().fieldValues, familyIncome: "बहुत अधिक" },
      }),
    );
    expect(text.some((finding) => finding.code === "threshold_invalid")).toBe(true);
    expect(text.some((finding) => finding.code === "threshold_gt")).toBe(false);
  });
});

describe("queue order", () => {
  it("puts severe failures ahead of an overdue clean file, then older files", () => {
    const severe = { severity: 3, daysLeft: 4, submittedAt: 3 };
    const overdue = { severity: 0, daysLeft: -3, submittedAt: 1 };
    const fresh = { severity: 0, daysLeft: 14, submittedAt: 2 };
    const olderSevere = { severity: 3, daysLeft: 4, submittedAt: 1 };
    expect(compareQueue(severe, overdue)).toBeLessThan(0);
    expect(compareQueue(overdue, fresh)).toBeLessThan(0);
    expect(compareQueue(olderSevere, severe)).toBeLessThan(0);
    expect(daysUntilDue(new Date("2026-10-13T08:00:00+05:30"), 15, now)).toBe(1);
  });
});
