import type { ServicePack } from "../types";

/** Training scheme. These figures are not a live state rule. */
export const incomeCeiling = 100_000;
export const incomeTolerance = 0.15;
export const incomeSlaDays = 15;

const requiredFields = [
  "fatherOrSpouse",
  "occupation",
  "familyIncome",
  "assessedIncome",
  "address",
  "idAddress",
  "purpose",
];

export const incomeCertificate: ServicePack = {
  department: {
    code: "revenue",
    name: {
      hi: "राजस्व विभाग",
      en: "Revenue department",
    },
  },
  service: {
    code: "income-certificate",
    slaDays: incomeSlaDays,
    certificateTemplate: "income-certificate",
    name: {
      hi: "आय प्रमाण पत्र",
      en: "Income certificate",
    },
    description: {
      hi: "पारिवारिक वार्षिक आय ₹1,00,000 तक होने पर प्रमाण पत्र। अधूरी फ़ाइल वापस जाती है। सीमा से ऊपर की आय पर अस्वीकृति होती है।",
      en: "Certificate when annual family income is at most ₹1,00,000. Incomplete files are returned. Income above the ceiling is rejected.",
    },
  },
  fields: [
    {
      key: "fatherOrSpouse",
      type: "text",
      sortOrder: 10,
      label: { hi: "पिता / पति का नाम", en: "Father or spouse" },
    },
    {
      key: "occupation",
      type: "text",
      sortOrder: 20,
      label: { hi: "व्यवसाय", en: "Occupation" },
    },
    {
      key: "familyIncome",
      type: "money",
      sortOrder: 30,
      label: { hi: "घोषित पारिवारिक वार्षिक आय", en: "Declared annual family income" },
    },
    {
      key: "assessedIncome",
      type: "money",
      sortOrder: 40,
      label: { hi: "प्रमाण में अंकित आय", en: "Income on the supporting proof" },
    },
    {
      key: "address",
      type: "text",
      sortOrder: 50,
      label: { hi: "आवेदन पर पता", en: "Address on the application" },
    },
    {
      key: "idAddress",
      type: "text",
      sortOrder: 60,
      label: { hi: "पहचान पत्र पर पता", en: "Address on the identity proof" },
    },
    {
      key: "purpose",
      type: "text",
      sortOrder: 70,
      label: { hi: "प्रमाण पत्र का उद्देश्य", en: "Purpose of the certificate" },
    },
  ],
  documents: [
    {
      code: "identity_proof",
      required: true,
      sortOrder: 10,
      label: { hi: "पहचान पत्र", en: "Identity proof" },
    },
    {
      code: "address_proof",
      required: true,
      sortOrder: 20,
      label: { hi: "पते का प्रमाण", en: "Address proof" },
    },
    {
      code: "income_proof",
      required: true,
      sortOrder: 30,
      label: { hi: "आय का प्रमाण", en: "Income proof" },
    },
    {
      code: "affidavit",
      required: true,
      sortOrder: 40,
      label: { hi: "शपथ पत्र", en: "Affidavit" },
    },
    {
      code: "photo",
      required: true,
      sortOrder: 50,
      label: { hi: "पासपोर्ट फोटो", en: "Passport photo" },
    },
    {
      code: "bank_passbook",
      required: false,
      sortOrder: 60,
      label: { hi: "बैंक पासबुक", en: "Bank passbook" },
    },
  ],
  rules: [
    {
      code: "required_fields",
      severity: "high",
      onFail: "RETURN",
      sortOrder: 10,
      params: { fields: requiredFields },
      summary: {
        hi: "पिता/पति, व्यवसाय, दोनों आय राशियाँ, दोनों पते और उद्देश्य भरे होने चाहिए। खाली विवरण पर फ़ाइल वापस जाती है।",
        en: "Father or spouse, occupation, both income figures, both addresses, and the purpose must be filled in. A blank detail returns the file.",
      },
    },
    {
      code: "required_documents",
      severity: "high",
      onFail: "RETURN",
      sortOrder: 20,
      params: {},
      summary: {
        hi: "पहचान पत्र, पते का प्रमाण, आय का प्रमाण, शपथ पत्र और फोटो अनिवार्य हैं। न होना या अस्पष्ट होना फ़ाइल वापस भेजता है। बैंक पासबुक ऐच्छिक है।",
        en: "Identity proof, address proof, income proof, affidavit, and photo are mandatory. A missing or illegible one returns the file. The bank passbook is optional.",
      },
    },
    {
      code: "document_expired",
      severity: "high",
      onFail: "RETURN",
      sortOrder: 30,
      params: {},
      summary: {
        hi: "जिस दस्तावेज़ पर समाप्ति तिथि है, वह आज तक वैध होना चाहिए। समाप्त दस्तावेज़ पर फ़ाइल वापस जाती है।",
        en: "A document that carries an expiry date must still be valid today. An expired document returns the file.",
      },
    },
    {
      code: "compare_fields",
      severity: "medium",
      onFail: "RETURN",
      sortOrder: 40,
      params: { left: "address", right: "idAddress", operator: "neq" },
      summary: {
        hi: "आवेदन का पता और पहचान पत्र का पता एक ही होना चाहिए। अंतर होने पर फ़ाइल पते के सुधार के लिए वापस जाती है।",
        en: "The application address and the identity-proof address must match. A mismatch returns the file for correction.",
      },
    },
    {
      code: "threshold",
      severity: "high",
      onFail: "RETURN",
      sortOrder: 50,
      params: {
        left: "familyIncome",
        right: "assessedIncome",
        operator: "relative_diff_gt",
        tolerance: incomeTolerance,
      },
      summary: {
        hi: "घोषित आय और प्रमाण की आय का अंतर 15 प्रतिशत से अधिक होने पर फ़ाइल वापस जाती है। 15 प्रतिशत तक का अंतर चल सकता है।",
        en: "If declared income and the proof differ by more than 15 percent, the file is returned. A gap of up to 15 percent is allowed.",
      },
    },
    {
      code: "threshold",
      severity: "high",
      onFail: "REJECT",
      sortOrder: 60,
      params: { field: "familyIncome", operator: "gt", value: incomeCeiling },
      summary: {
        hi: "पारिवारिक वार्षिक आय ₹1,00,000 से अधिक होने पर आवेदन अस्वीकृत होता है। ठीक ₹1,00,000 सीमा के अंदर है।",
        en: "Family income above ₹1,00,000 a year is rejected. Exactly ₹1,00,000 is still inside the ceiling.",
      },
    },
    {
      code: "duplicate_identity",
      severity: "high",
      onFail: "RETURN",
      sortOrder: 70,
      params: {},
      summary: {
        hi: "इसी पहचान संख्या पर दूसरा खुला आवेदन नहीं होना चाहिए। हो तो यह फ़ाइल वापस जाती है और दूसरे संदर्भ का उल्लेख होता है।",
        en: "There must not be another open application on the same identity number. If there is, this file is returned and the other reference is cited.",
      },
    },
  ],
};
