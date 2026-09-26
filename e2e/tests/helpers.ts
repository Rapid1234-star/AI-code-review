import { expect, type Page } from "@playwright/test";

export async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true");
}

export async function register(page: Page, name = "Test User") {
  const email = `user-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
  await open(page, "/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  return { email, password: "password123", name };
}

export async function createProject(page: Page, name: string) {
  await open(page, "/projects");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Description").fill("Assessment project");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
}
