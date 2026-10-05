import { expect, test } from "@playwright/test";

import { expectToolcraftCanvasBackingPixelsForRenderScale } from "./performance-helpers";

const scenarioUsesRenderScaleFixture = false;
void scenarioUsesRenderScaleFixture;
void expectToolcraftCanvasBackingPixelsForRenderScale;

test("browser perf: Clip Lab root preserves native SVG preview resolution", async ({ page }) => {
  await page.goto("/clip-lab");
  const output = page.locator<SVGSVGElement>("[data-toolcraft-product-output]");
  await expect(output).toHaveAttribute("viewBox", "0 0 1920 1080");
  const { width: previewWidth, height: previewHeight } = await output.evaluate((svg) => svg.getBoundingClientRect());
  expect(previewWidth).toBeGreaterThan(0);
  expect(previewHeight).toBeGreaterThan(0);
  expect(previewWidth / previewHeight).toBeCloseTo(1920 / 1080, 2);
});
