import "server-only";
import { prisma } from "@/lib/db";
import { postgresInitSql } from "@/server/postgres-init";
import { seedContent } from "../../prisma/seed";

let ready: Promise<void> | null = null;

function statements(script: string) {
  return script
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.replace(/--[^\n]*/g, "").trim().length > 0);
}

async function tablesExist() {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT to_regclass('public."Officer"') IS NOT NULL AS "exists"`,
  );
  return Boolean(rows[0]?.exists);
}

async function prepareHostedDatabase() {
  if (!(await tablesExist())) {
    try {
      await prisma.$transaction(
        async (tx) => {
          for (const statement of statements(postgresInitSql)) {
            await tx.$executeRawUnsafe(statement);
          }
        },
        { timeout: 60_000, maxWait: 15_000 },
      );
    } catch (error) {
      if (!(await tablesExist())) throw error;
    }
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const officers = await tx.officer.count();
        if (officers === 0) await seedContent(tx);
      },
      { timeout: 120_000, maxWait: 15_000 },
    );
  } catch (error) {
    const officers = await prisma.officer.count();
    if (officers === 0) throw error;
  }
}

export function ensureHostedDatabase() {
  if (!process.env.NETLIFY_DB_URL) return Promise.resolve();
  ready ??= prepareHostedDatabase().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}
