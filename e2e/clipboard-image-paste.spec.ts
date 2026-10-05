import { expect, test, type Page } from "@playwright/test";

import { warpPerformance } from "../src/app/warp-performance";
import {
  expectToolcraftScenarioPerformanceBudget,
  getToolcraftPerformanceStressValue,
  measureToolcraftInteraction,
} from "./performance-helpers";

const pastedImageSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">
  <rect width="320" height="180" fill="#08111f"/>
  <circle cx="160" cy="90" r="58" fill="#ffffff"/>
</svg>`;

async function pasteImage(page: Page, source = pastedImageSvg): Promise<void> {
  await page.evaluate((source) => {
    const file = new File([source], "clipboard-source.svg", { type: "image/svg+xml" });
    const data = new DataTransfer();
    data.items.add(file);
    (document.activeElement ?? document).dispatchEvent(new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: data,
    }));
  }, source);
}

async function createRasterFixture(page: Page, width: number, height: number, mode: "mask" | "photo"): Promise<string> {
  return page.evaluate(({ fixtureHeight, fixtureMode, fixtureWidth }) => {
    const canvas = document.createElement("canvas");
    canvas.width = fixtureWidth;
    canvas.height = fixtureHeight;
    const context = canvas.getContext("2d");
    if (!context) return "";
    if (fixtureMode === "mask") {
      context.fillStyle = "#050505";
      context.fillRect(0, 0, fixtureWidth, fixtureHeight);
      context.fillStyle = "#ffffff";
      context.beginPath();
      context.arc(fixtureWidth * 0.52, fixtureHeight * 0.48, Math.min(fixtureWidth, fixtureHeight) * 0.28, 0, Math.PI * 2);
      context.fill();
    } else {
      const gradient = context.createLinearGradient(0, 0, fixtureWidth, fixtureHeight);
      gradient.addColorStop(0, "#1432aa");
      gradient.addColorStop(0.5, "#51d9de");
      gradient.addColorStop(1, "#ed5837");
      context.fillStyle = gradient;
      context.fillRect(0, 0, fixtureWidth, fixtureHeight);
    }
    return canvas.toDataURL("image/jpeg", 0.86);
  }, { fixtureHeight: height, fixtureMode: mode, fixtureWidth: width });
}

async function pasteRasterImage(page: Page, dataUrl: string): Promise<void> {
  await page.evaluate(async (source) => {
    const response = await fetch(source);
    const file = new File([await response.blob()], "clipboard-photo.jpg", { type: "image/jpeg" });
    const data = new DataTransfer();
    data.items.add(file);
    (document.activeElement ?? document).dispatchEvent(new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: data,
    }));
  }, dataUrl);
}

test("browser: Speed Rays imports a pasted clipboard image", async ({ page }) => {
  await page.goto("/clip-lab");
  const output = page.locator("[data-toolcraft-product-output]");
  await expect(output).toHaveAttribute("data-mask-ready", "false");

  await pasteImage(page);

  await expect(page.getByAltText("clipboard-source.svg")).toBeVisible();
  await expect(output).toHaveAttribute("data-mask-ready", "true");
  await expect(output).not.toHaveAttribute("data-segment-count", "0");
});

test("browser: Speed Blur imports a pasted clipboard image", async ({ page }) => {
  await page.goto("/warp");
  await expect(page.locator("[data-toolcraft-product-output]")).toHaveCount(0);

  await pasteImage(page);

  await expect(page.getByAltText("clipboard-source.svg")).toBeVisible();
  const output = page.locator("[data-toolcraft-product-output]");
  await expect(output).toBeVisible();
  await expect(output.locator("canvas")).toBeVisible();
  await expect(page.getByText("Canvas width", { exact: true })).toHaveCount(0);
  await expect(output).toHaveCSS("width", "320px");
  await expect(output).toHaveCSS("height", "180px");
});

test("browser: Mix imports a pasted clipboard image", async ({ page }) => {
  await page.goto("/mix");
  await expect(page.locator("[data-toolcraft-product-output]")).toHaveCount(0);

  await pasteImage(page);

  await expect(page.getByAltText("clipboard-source.svg")).toBeVisible();
  const output = page.locator("[data-toolcraft-product-output]");
  await expect(output).toHaveAttribute("data-mask-ready", "true");
  await expect(output.locator("canvas")).toHaveAttribute("data-mix-ready", "true");
});

test("browser: image paste does not replace ordinary text-field paste", async ({ page }) => {
  await page.goto("/clip-lab");
  const widthInput = page.getByRole("group").filter({ hasText: "Canvas width" }).getByRole("textbox").first();
  await expect(widthInput).toBeVisible();
  await widthInput.focus();
  await pasteImage(page);
  await expect(page.locator("[data-toolcraft-product-output]")).toHaveAttribute("data-mask-ready", "false");
});

test("browser perf: Warp clipboard paste stays inside its intrinsic media import budget", async ({ page }) => {
  const warpSize = getToolcraftPerformanceStressValue<{ width: number; height: number }>(warpPerformance, "source-import");
  await page.goto("/warp");
  const warpSource = await createRasterFixture(page, warpSize.width, warpSize.height, "photo");
  await page.waitForTimeout(250);
  const warpResult = await measureToolcraftInteraction(page, async () => {
    await pasteRasterImage(page, warpSource);
    await expect(page.locator("[data-toolcraft-product-output]")).toBeVisible();
  }, { settleFrames: 2 });
  expectToolcraftScenarioPerformanceBudget(warpResult, warpPerformance, "source-import");
});
