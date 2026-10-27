import type { Locale } from "@/i18n/locales";
import type { OnFail, RuleCode, Severity } from "@/lib/rules/types";

export type Localized = Record<Locale, string>;

export type ServicePack = {
  department: {
    code: string;
    name: Localized;
  };
  service: {
    code: string;
    slaDays: number;
    certificateTemplate?: string;
    name: Localized;
    description: Localized;
  };
  fields: Array<{
    key: string;
    type: "text" | "money" | "date";
    sortOrder: number;
    label: Localized;
  }>;
  documents: Array<{
    code: string;
    required: boolean;
    sortOrder: number;
    label: Localized;
  }>;
  rules: Array<{
    code: RuleCode;
    severity: Severity;
    onFail: OnFail;
    params: Record<string, unknown>;
    sortOrder: number;
    summary: Localized;
  }>;
};
