import { defineConfig, devices } from "@playwright/test";
import fs from "fs";
import path from "path";

function readEnv(filePath: string) {
  const values: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return values;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

const root = path.resolve(__dirname, "..");
const fileEnv = readEnv(path.join(root, ".env"));

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: [
    {
      command: "npm run start -w api",
      cwd: root,
      url: "http://127.0.0.1:3001/health",
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        ...fileEnv,
        PORT: "3001",
        NODE_ENV: "test",
        AI_ALLOW_MOCK: "true",
        GITHUB_USE_FIXTURES: "true",
      },
    },
    {
      command: "npm run dev -w web",
      cwd: root,
      url: "http://127.0.0.1:3000/login",
      timeout: 180_000,
      reuseExistingServer: false,
    },
  ],
});
