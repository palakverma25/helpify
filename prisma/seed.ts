import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { demoOfficers, demoPassword } from "../src/content/demo";
import { persistServicePack } from "../src/content/persist";
import { servicePacks } from "../src/content/registry";
import { sampleApplications } from "../src/content/sample-applications";

const prisma = new PrismaClient();

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(6, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.applicationDocument.deleteMany();
  await prisma.application.deleteMany();
  await prisma.officerAssignment.deleteMany();
  await prisma.officer.deleteMany();
  await prisma.department.deleteMany();

  const passwordHash = await hash(demoPassword, 10);
  const officers = new Map<string, string>();
  for (const officer of demoOfficers) {
    const created = await prisma.officer.create({
      data: { ...officer, passwordHash },
    });
    officers.set(officer.email, created.id);
  }

  for (const pack of servicePacks) {
    const { departmentId, serviceId } = await persistServicePack(prisma, pack);
    for (const officer of officers.values()) {
      await prisma.officerAssignment.create({
        data: { officerId: officer, departmentId },
      });
    }

    if (pack.service.code !== "income-certificate") continue;

    for (const sample of sampleApplications) {
      const created = await prisma.application.create({
        data: {
          serviceId,
          referenceNo: sample.referenceNo,
          status: sample.status,
          submittedAt: daysAgo(sample.daysAgo),
          identityKey: sample.identityKey,
          applicantName: sample.applicantName,
          locality: sample.locality,
          fieldValues: sample.fieldValues,
          documents: {
            create: sample.documents.map((document) => ({
              documentCode: document.code,
              status: document.status,
              expiresOn: document.expiresOn,
            })),
          },
        },
      });

      for (const decision of sample.decisions ?? []) {
        const officerId = officers.get(decision.officerEmail);
        if (!officerId) throw new Error(`Missing officer ${decision.officerEmail}`);
        const createdAt = decision.daysAgo === "now" ? new Date() : daysAgo(decision.daysAgo);
        await prisma.decision.create({
          data: {
            applicationId: created.id,
            officerId,
            action: decision.action,
            note: decision.note,
            suggestedAction: decision.suggestedAction,
            suggestionOverridden: decision.action !== decision.suggestedAction,
            findingsSnapshot: { lines: decision.lines },
            createdAt,
          },
        });
        await prisma.auditLog.create({
          data: {
            applicationId: created.id,
            officerId,
            event: "decision",
            payload: {
              action: decision.action,
              suggestedAction: decision.suggestedAction,
              referenceNo: sample.referenceNo,
            },
            createdAt,
          },
        });
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
