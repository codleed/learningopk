import { expect, test } from "@playwright/test";

test("global theme defaults to light mode tokens", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  const theme = await page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);

    return {
      colorScheme: rootStyle.colorScheme,
      backgroundToken: rootStyle.getPropertyValue("--background").trim(),
      cardToken: rootStyle.getPropertyValue("--card").trim(),
      primaryToken: rootStyle.getPropertyValue("--primary").trim(),
      bodyBackground: bodyStyle.backgroundColor
    };
  });

  expect(theme.colorScheme).toBe("light");
  expect(theme.backgroundToken).toBe("#f8f8ff");
  expect(theme.cardToken).toBe("#f8f8ff");
  expect(theme.primaryToken).toBe("#65a30d");
  expect(theme.bodyBackground).toBe("rgb(248, 248, 255)");
});
