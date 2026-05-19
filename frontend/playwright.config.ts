import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  // The MVP backend is single-user / single-board, so specs share one server
  // state. Serialize to keep parallel workers from stomping each other.
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://localhost:8000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "docker compose -f ../docker-compose.yml up --build",
    url: "http://localhost:8000/api/health",
    reuseExistingServer: true,
    timeout: 240_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
