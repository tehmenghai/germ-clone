import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "tests/e2e/reports", open: "never" }]],
  use: {
    baseURL: "http://localhost:3007",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3007",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
