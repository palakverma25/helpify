export type SampleDocument = {
  code: string;
  status: "present" | "missing" | "illegible";
  expiresOn?: string;
};

export type SampleDecision = {
  action: "approved" | "rejected" | "returned";
  daysAgo: number | "now";
  note: string;
  suggestedAction: "approved" | "rejected" | "returned";
  officerEmail: string;
  lines: string[];
};

export type SampleApplication = {
  referenceNo: string;
  status: "pending" | "returned" | "approved" | "rejected";
  daysAgo: number;
  identityKey: string;
  applicantName: string;
  locality: string;
  fieldValues: Record<string, string | number>;
  documents: SampleDocument[];
  decisions?: SampleDecision[];
};

const validUntil = "2099-01-01";
const documentCodes = [
  "identity_proof",
  "address_proof",
  "income_proof",
  "affidavit",
  "photo",
  "bank_passbook",
];

function place(village: string, ward: string) {
  return `वार्ड ${ward}, ग्राम ${village}, डेमो तहसील, ज़िला नमूना`;
}

function papers(
  overrides: Partial<Record<string, SampleDocument["status"]>> = {},
  identityExpiry = validUntil,
): SampleDocument[] {
  return documentCodes.map((code) => ({
    code,
    status: overrides[code] ?? "present",
    expiresOn: code === "identity_proof" ? identityExpiry : undefined,
  }));
}

function file(input: {
  referenceNo: string;
  name: string;
  village: string;
  ward: string;
  identityKey: string;
  daysAgo: number;
  income: number;
  assessed?: number;
  purpose: string;
  occupation?: string;
  fatherOrSpouse?: string;
  idVillage?: string;
  idWard?: string;
  status?: SampleApplication["status"];
  documents?: SampleDocument[];
  purposeText?: string;
  decisions?: SampleDecision[];
}): SampleApplication {
  const locality = input.village;
  const address = place(input.village, input.ward);
  return {
    referenceNo: input.referenceNo,
    status: input.status ?? "pending",
    daysAgo: input.daysAgo,
    identityKey: input.identityKey,
    applicantName: input.name,
    locality,
    fieldValues: {
      fatherOrSpouse: input.fatherOrSpouse ?? "राम दीन",
      occupation: input.occupation ?? "कृषि",
      familyIncome: input.income,
      assessedIncome: input.assessed ?? input.income,
      address,
      idAddress: place(input.idVillage ?? input.village, input.idWard ?? input.ward),
      purpose: input.purposeText ?? input.purpose,
    },
    documents: input.documents ?? papers(),
    decisions: input.decisions,
  };
}

export const sampleApplications: SampleApplication[] = [
  file({
    referenceNo: "AY-2026-1001",
    name: "सीता देवी",
    village: "रमपुरा",
    ward: "4",
    identityKey: "DEMO-ID-1001",
    daysAgo: 2,
    income: 72_000,
    purpose: "छात्रवृत्ति",
    occupation: "सिलाई",
    fatherOrSpouse: "राम दीन",
  }),
  file({
    referenceNo: "AY-2026-1019",
    name: "ओम प्रकाश",
    village: "देवली",
    ward: "1",
    identityKey: "DEMO-ID-1019",
    daysAgo: 3,
    income: 100_000,
    purpose: "चिकित्सा सहायता",
    occupation: "मजदूरी",
    fatherOrSpouse: "शिव चरण",
  }),
  file({
    referenceNo: "AY-2026-1021",
    name: "नरेश कुमार",
    village: "बेलपुरा",
    ward: "3",
    identityKey: "DEMO-ID-1021",
    daysAgo: 4,
    income: 96_000,
    assessed: 108_000,
    purpose: "राशन कार्ड",
    occupation: "दुकान",
    fatherOrSpouse: "मोती लाल",
  }),
  file({
    referenceNo: "AY-2026-1002",
    name: "मोहन लाल",
    village: "श्यामनगर",
    ward: "2",
    identityKey: "DEMO-ID-1002",
    daysAgo: 4,
    income: 64_000,
    purpose: "राशन कार्ड",
    fatherOrSpouse: "सुख राम",
    documents: papers({ affidavit: "missing" }),
  }),
  file({
    referenceNo: "AY-2026-1003",
    name: "गीता शर्मा",
    village: "बेलपुरा",
    ward: "5",
    identityKey: "DEMO-ID-1003",
    daysAgo: 6,
    income: 48_000,
    purpose: "छात्रवृत्ति",
    occupation: "गृह कार्य",
    fatherOrSpouse: "महेश शर्मा",
    documents: papers({}, "2024-01-01"),
  }),
  file({
    referenceNo: "AY-2026-1004",
    name: "अजय यादव",
    village: "देवली",
    ward: "2",
    identityKey: "DEMO-ID-1004",
    daysAgo: 3,
    income: 54_000,
    purpose: "वृद्धावस्था पेंशन",
    fatherOrSpouse: "बुद्ध राम",
    idVillage: "चंदपुरा",
    idWard: "9",
  }),
  file({
    referenceNo: "AY-2026-1005",
    name: "रमेश पटेल",
    village: "चंदपुरा",
    ward: "6",
    identityKey: "DEMO-ID-1005",
    daysAgo: 5,
    income: 240_000,
    purpose: "गृह ऋण",
    occupation: "व्यापार",
    fatherOrSpouse: "हरि पटेल",
  }),
  file({
    referenceNo: "AY-2026-1006",
    name: "कमला बाई",
    village: "रमपुरा",
    ward: "7",
    identityKey: "DEMO-ID-1006",
    daysAgo: 8,
    income: 90_000,
    assessed: 150_000,
    purpose: "चिकित्सा सहायता",
    occupation: "कृषि",
    fatherOrSpouse: "फूल चंद",
  }),
  file({
    referenceNo: "AY-2026-1007",
    name: "इमरान खान",
    village: "श्यामनगर",
    ward: "8",
    identityKey: "DEMO-ID-2007",
    daysAgo: 7,
    income: 70_000,
    purpose: "छात्रवृत्ति",
    occupation: "दर्जी",
    fatherOrSpouse: "अब्दुल सत्तार",
  }),
  file({
    referenceNo: "AY-2026-1008",
    name: "इमरान खान",
    village: "श्यामनगर",
    ward: "8",
    identityKey: "DEMO-ID-2007",
    daysAgo: 1,
    income: 70_000,
    purpose: "छात्रवृत्ति",
    occupation: "दर्जी",
    fatherOrSpouse: "अब्दुल सत्तार",
  }),
  file({
    referenceNo: "AY-2026-1009",
    name: "सुनीता कुमारी",
    village: "बेलपुरा",
    ward: "1",
    identityKey: "DEMO-ID-1009",
    daysAgo: 1,
    income: 36_000,
    purpose: "राशन कार्ड",
    occupation: "गृह कार्य",
    fatherOrSpouse: "विजय कुमार",
    documents: papers({ income_proof: "illegible" }),
  }),
  file({
    referenceNo: "AY-2026-1010",
    name: "प्रकाश वर्मा",
    village: "देवली",
    ward: "4",
    identityKey: "DEMO-ID-1010",
    daysAgo: 18,
    income: 42_000,
    purpose: "वृद्धावस्था पेंशन",
    occupation: "मजदूरी",
    fatherOrSpouse: "राम स्वरूप",
  }),
  file({
    referenceNo: "AY-2026-1011",
    name: "हरी राम",
    village: "चंदपुरा",
    ward: "3",
    identityKey: "DEMO-ID-1011",
    daysAgo: 14,
    income: 55_000,
    purpose: "छात्रवृत्ति",
    fatherOrSpouse: "घनश्याम",
  }),
  file({
    referenceNo: "AY-2026-1012",
    name: "लक्ष्मी बाई",
    village: "रमपुरा",
    ward: "5",
    identityKey: "DEMO-ID-1012",
    daysAgo: 2,
    income: 61_000,
    purpose: "चिकित्सा सहायता",
    occupation: "सिलाई",
    fatherOrSpouse: "राम सिंह",
    decisions: [
      {
        action: "returned",
        daysAgo: 6,
        note: "शपथ पत्र की प्रति स्पष्ट नहीं थी। नई प्रति लगाएँ।",
        suggestedAction: "returned",
        officerEmail: "seema.yadav@demo.local",
        lines: ["शपथ पत्र स्पष्ट नहीं है।"],
      },
    ],
  }),
  file({
    referenceNo: "AY-2026-1013",
    name: "दिनेश कुमार",
    village: "देवली",
    ward: "6",
    identityKey: "DEMO-ID-1013",
    daysAgo: 9,
    income: 80_000,
    purpose: "छात्रवृत्ति",
    occupation: "कृषि",
    fatherOrSpouse: "जगदीश",
    status: "approved",
    decisions: [
      {
        action: "approved",
        daysAgo: "now",
        note: "",
        suggestedAction: "approved",
        officerEmail: "seema.yadav@demo.local",
        lines: [],
      },
    ],
  }),
  file({
    referenceNo: "AY-2026-1014",
    name: "फरहीन बानो",
    village: "श्यामनगर",
    ward: "9",
    identityKey: "DEMO-ID-1014",
    daysAgo: 12,
    income: 310_000,
    purpose: "गृह ऋण",
    occupation: "व्यापार",
    fatherOrSpouse: "याकूब अली",
    status: "rejected",
    decisions: [
      {
        action: "rejected",
        daysAgo: 1,
        note: "घोषित पारिवारिक आय ₹1,00,000 की सीमा से अधिक है।",
        suggestedAction: "rejected",
        officerEmail: "rahul.verma@demo.local",
        lines: ["घोषित पारिवारिक वार्षिक आय ₹1,00,000 से अधिक है।"],
      },
    ],
  }),
  file({
    referenceNo: "AY-2026-1015",
    name: "बबलू सिंह",
    village: "बेलपुरा",
    ward: "7",
    identityKey: "DEMO-ID-1015",
    daysAgo: 10,
    income: 33_000,
    purpose: "राशन कार्ड",
    occupation: "मजदूरी",
    fatherOrSpouse: "करण सिंह",
    status: "returned",
    documents: papers({ photo: "missing" }),
    decisions: [
      {
        action: "returned",
        daysAgo: 3,
        note: "पासपोर्ट आकार का फोटो संलग्न नहीं है।",
        suggestedAction: "returned",
        officerEmail: "rahul.verma@demo.local",
        lines: ["पासपोर्ट फोटो संलग्न नहीं है।"],
      },
    ],
  }),
  file({
    referenceNo: "AY-2026-1016",
    name: "कविता सिंह",
    village: "चंदपुरा",
    ward: "2",
    identityKey: "DEMO-ID-1016",
    daysAgo: 11,
    income: 180_000,
    purpose: "गृह ऋण",
    occupation: "दुकान",
    fatherOrSpouse: "सुरेश सिंह",
    documents: papers({ affidavit: "missing" }),
  }),
  file({
    referenceNo: "AY-2026-1017",
    name: "नंदकिशोर",
    village: "देवली",
    ward: "8",
    identityKey: "DEMO-ID-1017",
    daysAgo: 0,
    income: 28_000,
    purpose: "वृद्धावस्था पेंशन",
    occupation: "मजदूरी",
    fatherOrSpouse: "बेनी प्रसाद",
    documents: papers({ bank_passbook: "missing" }),
  }),
  file({
    referenceNo: "AY-2026-1018",
    name: "शबनम",
    village: "रमपुरा",
    ward: "3",
    identityKey: "DEMO-ID-1018",
    daysAgo: 9,
    income: 45_000,
    purpose: "छात्रवृत्ति",
    occupation: "सिलाई",
    fatherOrSpouse: "इरफान",
    purposeText: "",
  }),
];
