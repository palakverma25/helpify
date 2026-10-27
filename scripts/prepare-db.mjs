import { spawnSync } from "node:child_process";
import fs from "node:fs";

const schemaPath = "prisma/schema.prisma";
const originalSchema = fs.readFileSync(schemaPath, "utf8");
const postgres = process.env.HELPIFY_DB === "postgres";

if (postgres) {
  fs.writeFileSync(
    schemaPath,
    originalSchema.replace('provider = "sqlite"', 'provider = "postgresql"'),
  );
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { stdio: "inherit", env, shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

try {
  console.log(postgres ? "Generating the Postgres client." : "Generating the SQLite client.");
  run("npx", ["prisma", "generate"]);
  if (postgres) {
    if (!fs.existsSync("prisma/build.db")) fs.writeFileSync("prisma/build.db", "");
  } else {
  const databaseUrl = "file:./build.db";
  const env = { ...process.env, DATABASE_URL: databaseUrl };
  for (const file of ["prisma/build.db", "prisma/build.db-journal"]) {
    fs.rmSync(file, { force: true });
  }
  run("npx", ["prisma", "migrate", "deploy"], env);
  run("npx", ["tsx", "prisma/seed.ts"], env);
  if (!fs.existsSync("prisma/build.db")) {
    console.error("The seeded database was not created.");
    process.exit(1);
  }
  }
} finally {
  if (postgres) fs.writeFileSync(schemaPath, originalSchema);
}
