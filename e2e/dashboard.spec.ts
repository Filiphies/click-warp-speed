import { expect, test } from "@playwright/test";

test("browser: minimal launcher opens all creative modes", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Click Tools");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", /^data:image\/png;base64,/);
  await expect(page.getByRole("img", { name: "Click" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Speed Rays" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Speed Blur" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Mix" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Meme P&L" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Paper Texture" })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("navigation", { name: "Creative modes" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.getByRole("link", { name: "Speed Rays" }).click();
  await expect(page).toHaveURL(/\/clip-lab$/);
  await expect(page.getByText("Radial Clip Lab", { exact: true })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Speed Blur" }).click();
  await expect(page).toHaveURL(/\/warp$/);
  await expect(page.getByText("Radial Warp", { exact: true })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Mix" }).click();
  await expect(page).toHaveURL(/\/mix$/);
  await expect(page.getByText("Mix", { exact: true })).toBeVisible();

});

test("browser: removed products stay out of the route tree", async ({ page }) => {
  await page.goto("/paper-texture");
  await expect(page.getByText("Paper Texture Batch", { exact: true })).toHaveCount(0);
  await expect(page.locator("[data-toolcraft-product-output]")).toHaveCount(0);

  await page.goto("/meme-card");
  await expect(page.getByText("Meme P&L", { exact: true })).toHaveCount(0);
  await expect(page.locator("[data-toolcraft-product-output]")).toHaveCount(0);
});
