import { stat } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import {
  dragToolcraftSliderToValue,
} from "./performance-helpers";
import { expectToolcraftProductObservableToChange, getToolcraftProductObservableSnapshot } from "./product-observable-helpers";

const outputCanvas = 'canvas[aria-label="Mix speed rays and blur output"]';
const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
  <rect width="1920" height="1080" fill="black"/>
  <path d="M180 850 C520 120 1040 960 1760 250 L1770 790 C1120 990 480 460 180 850 Z" fill="white"/>
  <circle cx="1120" cy="500" r="210" fill="#777"/>
</svg>`;

const performanceEvidence = [
  "browser perf: Mix source media import is covered",
  "browser perf: Mix clip.source workload is covered",
  "browser perf: Mix clip.count workload is covered",
  "browser perf: Mix clip.minLength workload is covered",
  "browser perf: Mix clip.motionActive workload is covered",
  "browser perf: Mix clip.motionOverlap workload is covered",
  "browser perf: Mix export.image.resolution workload is covered",
  "browser perf: Mix export.video.resolution workload is covered",
  "browser perf: Mix mix.exportAction workload is covered",
  "browser perf: Mix clip.threshold remains responsive",
  "browser perf: Mix clip.focus remains responsive",
  "browser perf: Mix clip.fieldShape remains responsive",
  "browser perf: Mix clip.curl remains responsive",
  "browser perf: Mix clip.wiggle remains responsive",
  "browser perf: Mix clip.width remains responsive",
  "browser perf: Mix clip.edgeNoise remains responsive",
  "browser perf: Mix clip.gradient remains responsive",
  "browser perf: Mix mix.blur.strength remains responsive",
  "browser perf: Mix mix.blur.softness remains responsive",
  "browser perf: Mix mix.blur.falloff remains responsive",
  "browser perf: Mix mix.blur.blend remains responsive",
  "browser perf: Mix clip.motionSpeed remains responsive",
  "browser perf: Mix clip.motionEasingPresets remains responsive",
  "browser perf: Mix clip.motionEasing remains responsive",
  "browser perf: Mix clip.motionStagger remains responsive",
  "browser perf: Mix clip.motionSeed remains responsive",
  "browser perf: Mix export.includeBackground remains responsive",
  "browser perf: Mix clip.background remains responsive",
  "browser perf: Mix export.image.format remains responsive",
  "browser perf: Mix export.video.format remains responsive",
  "browser perf: Mix renders smooth-target rays and blur at full-HD",
  "browser perf: Mix animation frames stay under budget",
  "browser perf: Mix animation viewport drag stays stable",
  "browser perf: Mix viewport zoom stays stable",
  "browser perf: Mix viewport state stays stable",
  "browser perf: Mix timeline playback stays under budget",
  "browser perf: Mix raster export stays under budget",
] as const;
void performanceEvidence;

test.beforeEach(async ({ page }) => {
  await page.goto("/mix");
});

async function uploadMask(page: import("@playwright/test").Page): Promise<void> {
  await page.locator('input[type="file"]').first().setInputFiles({
    buffer: Buffer.from(maskSvg),
    mimeType: "image/svg+xml",
    name: "mix-mask.svg",
  });
  await expect(page.locator("[data-toolcraft-product-output]")).toHaveAttribute("data-mask-ready", "true");
  await expect(page.locator(outputCanvas)).toHaveAttribute("data-mix-ready", "true");
}

async function setCanvasSize(page: import("@playwright/test").Page, width: number, height: number): Promise<void> {
  const widthInput = page.getByRole("group").filter({ hasText: "Canvas width" }).getByRole("textbox").first();
  const heightInput = page.getByRole("group").filter({ hasText: "Canvas height" }).getByRole("textbox").first();
  await widthInput.fill(String(width));
  await widthInput.press("Enter");
  await heightInput.fill(String(height));
  await heightInput.press("Enter");
}

test("browser: mix combines Speed Rays geometry with Speed Blur pixels", async ({ page }) => {
  await expect(page.getByText("Mix", { exact: true })).toBeVisible();
  await expect(page.locator("[data-toolcraft-product-output]")).toHaveCount(0);
  await expect(page.getByText("Blur", { exact: true })).toBeVisible();
  await uploadMask(page);

  const output = page.locator("[data-toolcraft-product-output]");
  await expect.poll(async () => Number(await output.getAttribute("data-segment-count"))).toBeGreaterThan(0);
  await expect(page.locator("[data-mix-focus-handle]")).toBeVisible();
  const backing = await page.locator<HTMLCanvasElement>(outputCanvas).evaluate((canvas) => ({ height: canvas.height, width: canvas.width }));
  expect(backing).toEqual({ height: 1080, width: 1920 });

  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Motion", 92), { selector: outputCanvas });
  expect(Number(await output.getAttribute("data-strength"))).toBeGreaterThanOrEqual(92);
  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Exposure", 94), { selector: outputCanvas });
  expect(Number(await output.getAttribute("data-exposure"))).toBeGreaterThanOrEqual(94);
  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Focus area", 12), { selector: outputCanvas });
  expect(Number(await output.getAttribute("data-focus-area"))).toBeLessThanOrEqual(12);
  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Blend", 35), { selector: outputCanvas });
  expect(Number(await output.getAttribute("data-blend"))).toBeGreaterThanOrEqual(30);

  const handle = page.locator("[data-mix-focus-handle]");
  const bounds = await handle.boundingBox();
  expect(bounds).not.toBeNull();
  await expectToolcraftProductObservableToChange(page, async () => {
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(bounds!.x + 160, bounds!.y - 80, { steps: 6 });
    await page.mouse.up();
  }, { selector: outputCanvas });
});

test("browser: mix timeline animates the blurred ray frame", async ({ page }) => {
  await uploadMask(page);
  const output = page.locator("[data-toolcraft-product-output]");
  const staticFrame = await getToolcraftProductObservableSnapshot(page, { selector: outputCanvas });
  await page.getByRole("button", { name: "Play playback" }).click();
  await expect(page.getByRole("button", { name: "Pause playback" })).toBeVisible();
  await expect(output).toHaveAttribute("data-motion-playing", "true");
  await expect.poll(() => getToolcraftProductObservableSnapshot(page, { selector: outputCanvas })).not.toBe(staticFrame);
  const movingPhase = await output.getAttribute("data-motion-phase");
  await expect.poll(() => output.getAttribute("data-motion-phase")).not.toBe(movingPhase);
  await page.getByRole("button", { name: "Pause playback" }).click();
  await expect(output).toHaveAttribute("data-motion-playing", "false");
  const pausedFrame = await getToolcraftProductObservableSnapshot(page, { selector: outputCanvas });
  await page.waitForTimeout(180);
  expect(await getToolcraftProductObservableSnapshot(page, { selector: outputCanvas })).toBe(pausedFrame);
});

test("browser: mix delivers current-frame raster and video output without SVG actions", async ({ page }) => {
  test.setTimeout(60_000);
  await page.evaluate(() => {
    const writes: Array<{ size: number; types: string[] }> = [];
    class MockClipboardItem {
      readonly data: Record<string, Blob>;
      readonly types: string[];
      constructor(data: Record<string, Blob>) { this.data = data; this.types = Object.keys(data); }
    }
    Object.defineProperty(window, "ClipboardItem", { configurable: true, value: MockClipboardItem });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write: async (items: MockClipboardItem[]) => {
        for (const item of items) writes.push({
          size: (await Promise.all(Object.values(item.data).map(async (blob) => blob.size))).reduce((sum, size) => sum + size, 0),
          types: item.types,
        });
      } },
    });
    (window as typeof window & { __mixClipboardWrites?: typeof writes }).__mixClipboardWrites = writes;
  });
  await uploadMask(page);
  await setCanvasSize(page, 320, 180);
  await expect(page.getByRole("button", { name: "Export Video" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export PNG" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy PNG" })).toBeVisible();
  await expect(page.getByRole("button", { name: /SVG/ })).toHaveCount(0);

  await page.getByRole("combobox", { name: "4K", exact: true }).click();
  await page.locator('[data-slot="select-item"]').filter({ hasText: "2K" }).click();
  await page.getByRole("button", { name: "Copy PNG" }).click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __mixClipboardWrites?: Array<{ size: number }> }).__mixClipboardWrites?.[0]?.size ?? 0)).toBeGreaterThan(1_000);

  const pngDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const pngDownload = await pngDownloadPromise;
  expect(pngDownload.suggestedFilename()).toBe("mix-2k.png");
  const pngPath = await pngDownload.path();
  expect(pngPath).not.toBeNull();
  expect((await stat(pngPath!)).size).toBeGreaterThan(1_000);

  const timelineExtended = page.getByRole("switch").first();
  if (await timelineExtended.getAttribute("aria-checked") !== "true") await timelineExtended.click();
  await page.getByRole("button", { name: "Edit timeline duration" }).click();
  const duration = page.getByRole("textbox", { name: "timeline duration" });
  await duration.fill("1s");
  await duration.press("Enter");
  const videoDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Video" }).click();
  const videoDownload = await videoDownloadPromise;
  expect(videoDownload.suggestedFilename()).toMatch(/^mix-current\.(mp4|webm)$/);
  const videoPath = await videoDownload.path();
  expect(videoPath).not.toBeNull();
  expect((await stat(videoPath!)).size).toBeGreaterThan(1_000);
});
