import { defineConfig } from "@playwright/test";

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: {
    timeout: 15_000
  },
  reporter: "list",
  globalSetup: "./tests/e2e/global-setup.mjs",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: [
    {
      command: `${pnpmCommand} --filter backend dev`,
      url: "http://localhost:3001/api/ready",
      cwd: "..",
      reuseExistingServer: false,
      timeout: 180_000
    },
    {
      command: `${pnpmCommand} --filter frontend dev`,
      url: "http://localhost:3000",
      cwd: "..",
      reuseExistingServer: false,
      timeout: 240_000
    }
  ]
});
