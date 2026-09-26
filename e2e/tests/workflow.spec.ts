import AdmZip from "adm-zip";
import fs from "fs";
import os from "os";
import path from "path";
import { expect, test } from "@playwright/test";
import { createProject, open, register } from "./helpers";

test("review, test, report, and detect a GitHub change", async ({ page }) => {
  await register(page);
  await createProject(page, "Sample service");

  const zipPath = path.join(os.tmpdir(), `strix-${Date.now()}.zip`);
  const zip = new AdmZip();
  zip.addFile(
    "src/app.js",
    Buffer.from("function login(user, password) {\n  return password === 'secret';\n}\nmodule.exports = { login };\n"),
  );
  zip.writeZip(zipPath);

  await page.getByRole("link", { name: "Files", exact: true }).click();
  await page.getByLabel("Project archive").setInputFiles(zipPath);
  await expect(page.getByRole("button", { name: "src/app.js" })).toBeVisible();
  await page.getByRole("button", { name: "src/app.js" }).click();
  await expect(page.getByRole("heading", { name: "src/app.js" })).toBeVisible();
  fs.unlinkSync(zipPath);

  await open(page, "/settings/providers");
  await page.getByLabel("Name").fill("Mock");
  await page.getByLabel("Provider type").selectOption("mock");
  await page.getByLabel("API key").fill("mock-key-1234");
  await page.getByRole("button", { name: "Save provider" }).click();
  await expect(page.getByRole("heading", { name: "Mock" })).toBeVisible();
  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(page.getByText(/Connected/)).toBeVisible();

  await open(page, "/projects");
  await page.getByRole("link", { name: /Sample service/ }).click();
  await page.getByRole("link", { name: "Reviews", exact: true }).click();
  await page.getByLabel("Review mode").selectOption("security");
  await page.getByRole("button", { name: "Run review" }).click();
  await expect(page.getByRole("heading", { name: "Hardcoded credential in sample" })).toBeVisible();
  await page.getByRole("link", { name: /src\/app.js/ }).click();
  await expect(page.getByRole("heading", { name: "src/app.js" })).toBeVisible();

  await page.getByRole("link", { name: "Tests", exact: true }).click();
  await page.getByRole("button", { name: "Generate tests" }).click();
  await expect(page.getByRole("button", { name: ".strix-tests/sample.test.js" })).toBeVisible();
  await page.getByRole("button", { name: "Run tests" }).click();
  await expect(page.getByRole("heading", { name: /Test run #/ })).toBeVisible();
  await expect(page.getByText("should reject invalid credentials")).toBeVisible();
  await expect(page.getByText("AI-generated analysis")).toBeVisible();

  await page.getByRole("link", { name: "Reports", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download HTML report" }).click();
  const download = await downloadPromise;
  const reportPath = path.join(os.tmpdir(), download.suggestedFilename());
  await download.saveAs(reportPath);
  const html = fs.readFileSync(reportPath, "utf8");
  expect(html).toContain("Strix test report");
  expect(html).toContain("Sample service");
  expect(html).not.toContain("<script");
  fs.unlinkSync(reportPath);

  await page.getByRole("link", { name: "GitHub", exact: true }).click();
  await page.getByLabel("Repository URL").fill("https://github.com/example/project");
  await page.getByRole("button", { name: "Connect repository" }).click();
  await expect(page.getByText("GitHub connected")).toBeVisible();
  await page.getByRole("button", { name: "Check for updates" }).click();
  await expect(page.getByText("src/auth/login.ts")).toBeVisible();
  await expect(page.getByText(/Tests affected/)).toBeVisible();
});
