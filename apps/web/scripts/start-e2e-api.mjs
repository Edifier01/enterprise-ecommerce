/**
 * Bootstrap API for Playwright E2E: migrate, seed, then run uvicorn.
 * Cross-platform entrypoint used by playwright.config.ts webServer.
 */
import { execSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(__dirname, "../../api");

const env = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql+asyncpg://postgres:postgres@localhost:5433/ecommerce",
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER ?? "stub",
  ENVIRONMENT: process.env.ENVIRONMENT ?? "development",
  CORS_ORIGINS: process.env.CORS_ORIGINS ?? '["http://localhost:3000"]',
};

function run(command, args) {
  execSync([command, ...args].join(" "), {
    cwd: apiDir,
    env,
    stdio: "inherit",
    shell: true,
  });
}

run("python", ["-m", "alembic", "upgrade", "head"]);
run("python", ["-m", "scripts.seed_dev"]);
run("python", ["-m", "scripts.seed_moysklad_e2e"]);
run("python", ["-m", "scripts.reset_e2e_checkout"]);

const apiPort = process.env.E2E_API_PORT ?? "8001";

const uvicorn = spawn(
  "python",
  ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", apiPort],
  { cwd: apiDir, env, stdio: "inherit" }
);

uvicorn.on("exit", (code) => process.exit(code ?? 0));

process.on("SIGINT", () => uvicorn.kill("SIGINT"));
process.on("SIGTERM", () => uvicorn.kill("SIGTERM"));
