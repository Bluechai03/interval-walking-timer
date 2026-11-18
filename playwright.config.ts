import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;

// Runs against a production build talking to a local Supabase. Start everything
// with `pnpm test:e2e`, which sets that up (it needs Docker).
export default defineConfig({
  testDir: "e2e",
  // The two browsers in a test share one room, so tests go one at a time.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "phones", use: { ...devices["iPhone 14"], browserName: "chromium" } }],
  webServer: {
    command: "pnpm start",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
