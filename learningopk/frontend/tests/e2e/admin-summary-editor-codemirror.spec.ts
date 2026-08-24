import { expect, test, type Page } from "@playwright/test";

const loginAsSeededAdmin = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await Promise.all([
    page.waitForURL(/\/dashboard$/),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
};

test("admin chapter summary editor renders CodeMirror surface", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/content");
  await page.getByTestId("curriculum-tab-chapter").click();
  await page.getByTestId("curriculum-chapter-mode-edit").click();

  await expect(page.getByTestId("curriculum-summary-editor-chapter-select")).toBeVisible();
  await expect(page.getByTestId("curriculum-summary-editor-cm6")).toBeVisible();
});
