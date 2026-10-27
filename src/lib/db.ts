import "server-only";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

function ensureDatabaseUrl() {
  const configured = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!configured.startsWith("file:")) return;
  const serverless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (!serverless) return;

  const target = "/tmp/helpify.db";
  if (!fs.existsSync(target)) {
    const candidates = [
      path.join(process.cwd(), "prisma", "build.db"),
      path.join(process.cwd(), "prisma", "dev.db"),
    ];
    const source = candidates.find((item) => fs.existsSync(item));
    if (source) fs.copyFileSync(source, target);
  }
  process.env.DATABASE_URL = `file:${target}`;
}

ensureDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
