import { stat } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { warpPerformance } from "../src/app/warp-performance";
import {
  dragToolcraftSliderToValue,
  expectToolcraftScenarioPerformanceBudget,
  getToolcraftPerformanceStressValue,
  getToolcraftPerformanceWorkloadValue,
  measureToolcraftInteraction,
} from "./performance-helpers";
import { expectToolcraftProductObservableToChange, getToolcraftProductObservableSnapshot } from "./product-observable-helpers";

const outputCanvas = 'canvas[aria-label="Radial zoom warp output"]';
const referenceImage = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><defs><linearGradient id="g"><stop stop-color="#102ca8"/><stop offset=".42" stop-color="#32d5dd"/><stop offset="1" stop-color="#e84b2f"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#g)"/><circle cx="760" cy="480" r="260" fill="#f7f3c8"/><path d="M0 1350L520 560L1080 1350Z" fill="#08131c"/></svg>`;

test.beforeEach(async ({ page }) => {
  await page.goto("/warp");
});

async function uploadReference(page: import("@playwright/test").Page): Promise<void> {
  await page.locator('input[type="file"]').first().setInputFiles({
    buffer: Buffer.from(referenceImage),
    mimeType: "image/svg+xml",
    name: "warp-reference.svg",
  });
  await expect(page.locator("[data-toolcraft-product-output]")).toBeVisible();
  await expect(page.locator(outputCanvas)).toBeVisible();
  await expect(page.locator("[data-warp-focus-handle]")).toBeVisible();
}

test("browser: warp uploads a source and renders a GPU radial result", async ({ page }) => {
  await expect(page.getByText("Radial Warp", { exact: true })).toBeVisible();
  await expect(page.locator("[data-toolcraft-product-output]")).toHaveCount(0);
  await uploadReference(page);
  await expect(page.locator("[data-toolcraft-product-output]")).toHaveAttribute("data-strength", "64");
  await expect(page.locator("[data-toolcraft-product-output]")).toHaveAttribute("data-softness", "72");
  await expect(page.locator(outputCanvas)).toHaveAttribute("data-warp-refining", "false");
  const backing = await page.locator<HTMLCanvasElement>(outputCanvas).evaluate((canvas) => ({ height: canvas.height, width: canvas.width }));
  expect(backing).toEqual({ height: 1350, width: 1080 });
  const stableFrame = await getToolcraftProductObservableSnapshot(page, { selector: outputCanvas });
  await page.waitForTimeout(250);
  expect(await getToolcraftProductObservableSnapshot(page, { selector: outputCanvas })).toBe(stableFrame);
  const centerAlpha = await page.locator<HTMLCanvasElement>(outputCanvas).evaluate((canvas) => {
    const sample = document.createElement("canvas");
    sample.width = 1;
    sample.height = 1;
    const context = sample.getContext("2d");
    context?.drawImage(canvas, canvas.width / 2, canvas.height / 2, 1, 1, 0, 0, 1, 1);
    return context?.getImageData(0, 0, 1, 1).data[3] ?? 0;
  });
  expect(centerAlpha).toBe(255);
});

test("browser: warp preserves the source image orientation", async ({ page }) => {
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="300" fill="#ef4444"/><rect y="300" width="800" height="300" fill="#2563eb"/></svg>`;
  await page.locator('input[type="file"]').first().setInputFiles({
    buffer: Buffer.from(source),
    mimeType: "image/svg+xml",
    name: "orientation.svg",
  });
  await expect(page.locator(outputCanvas)).toBeVisible();
  await expect(page.getByText("Canvas width", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Canvas height", { exact: true })).toHaveCount(0);
  const dimensions = await page.locator<HTMLElement>("[data-toolcraft-product-output]").evaluate((output) => {
    const canvas = output.querySelector("canvas");
    return {
      backingHeight: canvas?.height,
      backingWidth: canvas?.width,
      height: Number.parseFloat(output.style.height),
      width: Number.parseFloat(output.style.width),
    };
  });
  expect(dimensions).toEqual({ backingHeight: 600, backingWidth: 800, height: 600, width: 800 });
  await dragToolcraftSliderToValue(page, "Motion", 0);
  const colors = await page.locator<HTMLCanvasElement>(outputCanvas).evaluate((canvas) => {
    const sample = document.createElement("canvas");
    sample.width = 1;
    sample.height = 1;
    const context = sample.getContext("2d");
    const read = (x: number, y: number) => {
      context?.clearRect(0, 0, 1, 1);
      context?.drawImage(canvas, x, y, 1, 1, 0, 0, 1, 1);
      return Array.from(context?.getImageData(0, 0, 1, 1).data.slice(0, 3) ?? []);
    };
    return {
      bottom: read(canvas.width / 2, canvas.height * 0.82),
      top: read(canvas.width / 2, canvas.height * 0.18),
    };
  });
  expect(colors.top[0]).toBeGreaterThan(colors.top[2]);
  expect(colors.bottom[2]).toBeGreaterThan(colors.bottom[0]);
});

test("browser: warp strength and focal handle change product pixels live", async ({ page }) => {
  await uploadReference(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderToValue(page, "Motion", 92);
  }, { selector: outputCanvas });
  expect(Number(await page.locator("[data-toolcraft-product-output]").getAttribute("data-strength"))).toBeGreaterThanOrEqual(92);
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderToValue(page, "Exposure", 96);
  }, { selector: outputCanvas });
  expect(Number(await page.locator("[data-toolcraft-product-output]").getAttribute("data-softness"))).toBeGreaterThanOrEqual(96);

  const handle = page.locator("[data-warp-focus-handle]");
  const bounds = await handle.boundingBox();
  expect(bounds).not.toBeNull();
  await expectToolcraftProductObservableToChange(page, async () => {
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(bounds!.x + 170, bounds!.y - 95, { steps: 6 });
    await page.mouse.up();
  }, { selector: outputCanvas });
  expect(Number(await page.locator("[data-toolcraft-product-output]").getAttribute("data-focus-x"))).toBeGreaterThan(0.1);
  expect(Number(await page.locator("[data-toolcraft-product-output]").getAttribute("data-focus-y"))).toBeLessThan(-0.05);
});

test("browser: warp exports the selected still format", async ({ page }) => {
  await uploadReference(page);
  const formatField = page.locator('[data-slot="field"]').filter({ hasText: "Format" }).first();
  await formatField.locator('[data-slot="select-trigger"]').click();
  await page.locator('[data-slot="select-item"]').filter({ hasText: "JPG" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("radial-warp.jpg");
  const path = await download.path();
  expect(path).not.toBeNull();
  expect((await stat(path!)).size).toBeGreaterThan(20_000);
});

test("browser perf: warp strength maximum stays responsive", async ({ page }) => {
  const workload = getToolcraftPerformanceWorkloadValue<{ width: number; height: number }>(warpPerformance, "strength-max");
  const strengthLimit = getToolcraftPerformanceStressValue<number>(warpPerformance, "strength-max");
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${workload.width}" height="${workload.height}" viewBox="0 0 ${workload.width} ${workload.height}"><defs><linearGradient id="g"><stop stop-color="#102ca8"/><stop offset=".42" stop-color="#32d5dd"/><stop offset="1" stop-color="#e84b2f"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="68%" cy="42%" r="540" fill="#f7f3c8"/><path d="M0 ${workload.height} L${workload.width * 0.48} ${workload.height * 0.44} L${workload.width} ${workload.height}Z" fill="#08131c"/></svg>`;
  await page.locator('input[type="file"]').first().setInputFiles({
    buffer: Buffer.from(source),
    mimeType: "image/svg+xml",
    name: "warp-4k.svg",
  });
  await expect(page.locator(outputCanvas)).toBeVisible();
  await expect(page.locator(outputCanvas)).toHaveAttribute("data-warp-refining", "false");
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderToValue(page, "Motion", strengthLimit);
  }, { settleFrames: 4 });
  await expect(page.locator("[data-toolcraft-product-output]")).toHaveAttribute("data-strength", String(strengthLimit));
  expectToolcraftScenarioPerformanceBudget(result, warpPerformance, "strength-max");
});
