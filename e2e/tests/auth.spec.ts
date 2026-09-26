import { expect, test } from "@playwright/test";
import { open, register } from "./helpers";

test("protected routes send anonymous users to login", async ({ page }) => {
  await open(page, "/dashboard");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("register, logout, and login", async ({ page }) => {
  const user = await register(page);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
