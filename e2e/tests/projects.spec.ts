import { expect, test } from "@playwright/test";
import { createProject, register } from "./helpers";

test("create, view, and delete a project", async ({ page }) => {
  await register(page);
  await createProject(page, "Delete me");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete project" }).click();
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Delete me/ })).toHaveCount(0);
});
