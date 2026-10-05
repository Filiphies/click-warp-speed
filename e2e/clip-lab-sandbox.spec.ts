import { expect, test } from "@playwright/test";

import { dragToolcraftSliderToValue } from "./performance-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";

const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
  <rect width="1920" height="1080" fill="black"/>
  <path d="M180 820 C520 140 1060 930 1760 230 L1790 810 C1100 980 480 470 180 820 Z" fill="white"/>
</svg>`;

test.beforeEach(async ({ page }) => {
  await page.goto("/clip-lab/sandbox");
});

test("browser: speed rays sandbox keeps extreme styling independent", async ({ page }) => {
  await expect(page.getByText("Speed Rays Sandbox", { exact: true })).toBeVisible();
  const output = page.locator<SVGSVGElement>("[data-toolcraft-product-output]");
  await page.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from(maskSvg),
    mimeType: "image/svg+xml",
    name: "sandbox-mask.svg",
  });
  await expect(output).toHaveAttribute("data-mask-ready", "true");
  await expect.poll(async () => Number(await output.getAttribute("data-segment-count"))).toBeGreaterThan(0);

  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Width", 100));
  await expect(output).toHaveAttribute("data-ray-width", "100");

  const speedFields = page.locator('[data-slot="field"]').filter({ has: page.getByText("Speed", { exact: true }) });
  await speedFields.nth(1).getByRole("slider").press("End");
  await expect(output).toHaveAttribute("data-motion-speed", "100");

  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Strength", 100));
  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Radius", 80));
  await expect(output).toHaveAttribute("data-bloom-strength", "100");
  await expect(output).toHaveAttribute("data-bloom-radius", "80");
  await expect(output.locator('[data-clip-sandbox-bloom]')).toHaveCount(1);

  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Amount", 100));
  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Scale", 64));
  await speedFields.nth(0).getByRole("slider").press("End");
  await expect(output).toHaveAttribute("data-noise-amount", "100");
  await expect(output).toHaveAttribute("data-noise-scale", "64");
  await expect(output).toHaveAttribute("data-noise-speed", "20");

  const phaseBefore = await output.getAttribute("data-noise-phase");
  await page.getByRole("button", { name: "Play playback" }).click();
  await expect.poll(async () => output.getAttribute("data-noise-phase")).not.toBe(phaseBefore);
  await page.getByRole("button", { name: "Pause playback" }).click();
  const pausedPhase = await output.getAttribute("data-noise-phase");
  await page.waitForTimeout(120);
  await expect(output).toHaveAttribute("data-noise-phase", pausedPhase ?? "");
});

test("browser: original speed rays limits remain unchanged", async ({ page }) => {
  await page.goto("/clip-lab");
  const width = page.locator('[data-slot="field"]').filter({ has: page.getByText("Width", { exact: true }) }).getByRole("slider");
  const speed = page.locator('[data-slot="field"]').filter({ has: page.getByText("Speed", { exact: true }) }).getByRole("slider");
  await expect(width).toHaveAttribute("max", "5");
  await expect(speed).toHaveAttribute("max", "10");
});
