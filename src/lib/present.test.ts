import { describe, expect, it } from "vitest";
import { describeFinding, fill } from "./present";
import type { Finding } from "./rules/types";

const copy = {
  required_field: "{field} खाली है।",
  required_documents_missing: "{document} नहीं है।",
  required_documents_illegible: "{document} अस्पष्ट है।",
  document_expired: "{document} {expiresOn} को समाप्त।",
  duplicate_identity: "दूसरी फ़ाइल {reference}।",
  compare_fields: "{left} और {right} अलग हैं।",
  threshold_gt: "{field} {value} से अधिक है।",
  threshold_diff: "{left} और {right} में {percent} प्रतिशत से अधिक अंतर।",
  threshold_invalid: "{field} संख्या नहीं है।",
};

const labels = {
  fields: { familyIncome: "घोषित आय", assessedIncome: "प्रमाण की आय" },
  documents: { affidavit: "शपथ पत्र" },
};

describe("finding sentences", () => {
  it("fills Hindi labels and the scheme amounts", () => {
    const finding: Finding = {
      code: "threshold_gt",
      severity: "high",
      onFail: "REJECT",
      bindingOrder: 60,
      params: { fieldKey: "familyIncome", value: 100_000 },
    };
    expect(
      describeFinding(finding, copy, labels, {
        money: (value) => `₹${value}`,
        date: (iso) => iso,
      }),
    ).toBe("घोषित आय ₹100000 से अधिक है।");
    expect(fill("{name} जी", { name: "सीमा" })).toBe("सीमा जी");
  });
});
