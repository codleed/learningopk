import { expect, test } from "@playwright/test";

test("login handles auth network failures without runtime crash", async ({ page }) => {
  await page.route("**/api/auth/sign-in/email", async (route) => {
    await route.abort();
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill("resilience_user@example.com");
  await page.getByLabel("Password").fill("StrongPass123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(
    page.getByText("Unable to reach authentication server. Ensure backend is running on port 3001.")
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
