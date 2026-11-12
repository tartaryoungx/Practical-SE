import { defineConfig, devices } from "@playwright/test";

const apiURL = "http://localhost:18110";
const appURL = "http://localhost:13100";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  globalTeardown: "./tests/browser/global-teardown.ts",
  use: {
    baseURL: appURL,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: "bash tests/browser/isolated-api.sh",
      url: `${apiURL}/health`,
      timeout: 180_000,
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 13100",
      url: appURL,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_BASE_URL: apiURL,
        NEXT_DIST_DIR: ".next-browser",
      },
    },
  ],
});
