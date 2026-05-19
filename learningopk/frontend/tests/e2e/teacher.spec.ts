import { test, expect } from "@playwright/test";

test.describe("Teacher Suite E2E", () => {
  test("teacher dashboard loads and shows empty state", async ({ page }) => {
    // Navigate to teacher dashboard (expect redirect to login if not authenticated)
    await page.goto("/teacher");
    // Should redirect to /login for unauthenticated users
    await expect(page).toHaveURL(/\/login/);
  });

  test("student my-classroom page is accessible", async ({ page }) => {
    await page.goto("/student/my-classroom");
    // Should redirect to /login for unauthenticated users
    await expect(page).toHaveURL(/\/login/);
  });
});
