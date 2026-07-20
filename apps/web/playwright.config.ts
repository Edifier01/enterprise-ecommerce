import { defineConfig } from "@playwright/test";

const apiPort = Number(process.env.E2E_API_PORT ?? 8001);
const webPort = Number(process.env.E2E_WEB_PORT ?? 3002);
const apiBaseUrl = `http://localhost:${apiPort}`;
const webBaseUrl = `http://localhost:${webPort}`;

const E2E_JWT_SECRET = "dev-secret-change-in-production";

export default defineConfig({
  testDir: "./e2e",
  reporter: "list",
  timeout: 90_000,
  use: {
    baseURL: webBaseUrl,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
      testIgnore: [/mobile-admin\.spec\.ts/, /mobile-storefront\.spec\.ts/],
    },
    {
      name: "mobile-chrome",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      command: "node scripts/start-e2e-api.mjs",
      url: `${apiBaseUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        E2E_API_PORT: String(apiPort),
        DATABASE_URL:
          process.env.DATABASE_URL ??
          "postgresql+asyncpg://postgres:postgres@localhost:5433/ecommerce",
        PAYMENT_PROVIDER: "stub",
        ENVIRONMENT: "test",
        JWT_SECRET_KEY: E2E_JWT_SECRET,
        CORS_ORIGINS: `["http://localhost:${webPort}"]`,
      },
    },
    {
      command: `npm run dev -- --port ${webPort}`,
      url: webBaseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_URL: apiBaseUrl,
        NEXT_PUBLIC_PAYMENT_MODE: "stub",
        JWT_SECRET_KEY: E2E_JWT_SECRET,
      },
    },
  ],
});
