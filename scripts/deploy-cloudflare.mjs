import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parse } from "dotenv";

// Send only application runtime secrets, through stdin, never through CLI arguments.
const envFile = new URL("../.env", import.meta.url);
const environment = { ...(existsSync(envFile) ? parse(readFileSync(envFile)) : {}), ...process.env };
const databaseUrl = process.env.DATABASE_POOL_URL ?? process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? environment.DATABASE_POOL_URL ?? environment.POSTGRES_PRISMA_URL ?? environment.POSTGRES_URL ?? environment.DATABASE_URL;
const secrets = { DATABASE_URL: databaseUrl };
for (const key of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "AUTH_SECRET", "ZIP_PASS", "READONLY_VIEW_PASSWORD", "DATABASE_POOL_MAX", "DATABASE_CONNECTION_TIMEOUT_MS"]) {
  if (environment[key]) secrets[key] = environment[key];
}
for (const key of ["DATABASE_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "AUTH_SECRET", "ZIP_PASS"]) {
  if (!secrets[key]) throw new Error(`Thiếu cấu hình ${key}; chưa triển khai và chưa thay đổi database.`);
}
const result = spawnSync("pnpm", ["exec", "cf", "deploy", "--prebuilt", "--worker", "dh", "--force", "--secrets-file", "/dev/stdin"], {
  input: JSON.stringify(secrets),
  stdio: ["pipe", "inherit", "inherit"],
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
