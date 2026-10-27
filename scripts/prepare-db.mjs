import { spawnSync } from "node:child_process";
import fs from "node:fs";

const databaseUrl = "file:./build.db";
const env = { ...process.env, DATABASE_URL: databaseUrl };

for (const file of ["prisma/build.db", "prisma/build.db-journal"]) {
  fs.rmSync(file, { force: true });
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env, shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npx", ["prisma", "migrate", "deploy"]);
run("npx", ["tsx", "prisma/seed.ts"]);

if (!fs.existsSync("prisma/build.db")) {
  console.error("The seeded database was not created.");
  process.exit(1);
}
