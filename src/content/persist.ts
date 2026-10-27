import type { Prisma, PrismaClient } from "@prisma/client";
import type { ServicePack } from "./types";

export async function persistServicePack(db: PrismaClient, pack: ServicePack) {
  const department = await db.department.create({
    data: {
      code: pack.department.code,
      translations: {
        create: Object.entries(pack.department.name).map(([locale, name]) => ({
          locale,
          name,
        })),
      },
    },
  });

  const service = await db.service.create({
    data: {
      code: pack.service.code,
      departmentId: department.id,
      slaDays: pack.service.slaDays,
      certificateTemplate: pack.service.certificateTemplate,
      translations: {
        create: (["hi", "en"] as const).map((locale) => ({
          locale,
          name: pack.service.name[locale],
          description: pack.service.description[locale],
        })),
      },
      fields: {
        create: pack.fields.map((field) => ({
          key: field.key,
          type: field.type,
          sortOrder: field.sortOrder,
          translations: {
            create: Object.entries(field.label).map(([locale, label]) => ({
              locale,
              label,
            })),
          },
        })),
      },
      documents: {
        create: pack.documents.map((document) => ({
          code: document.code,
          required: document.required,
          sortOrder: document.sortOrder,
          translations: {
            create: Object.entries(document.label).map(([locale, label]) => ({
              locale,
              label,
            })),
          },
        })),
      },
      rules: {
        create: pack.rules.map((rule) => ({
          code: rule.code,
          severity: rule.severity,
          onFail: rule.onFail,
          params: rule.params as Prisma.InputJsonValue,
          summaries: rule.summary as Prisma.InputJsonValue,
          sortOrder: rule.sortOrder,
        })),
      },
    },
  });

  return { departmentId: department.id, serviceId: service.id };
}
