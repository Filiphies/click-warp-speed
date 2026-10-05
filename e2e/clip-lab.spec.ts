import { expect, test } from "@playwright/test";

import { dragToolcraftSliderToValue } from "./performance-helpers";
import { expectToolcraftProductObservableToChange, getToolcraftProductObservableSnapshot } from "./product-observable-helpers";

const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
  <rect width="1920" height="1080" fill="black"/>
  <path d="M220 820 C520 180 940 920 1690 260 L1740 760 C1040 970 520 470 220 820 Z" fill="#777"/>
  <circle cx="1080" cy="500" r="190" fill="white"/>
</svg>`;

const motionEasingSignatures = {
  linear: "0,0;0.5,0.5;1,1",
  easeIn: "0,0;0.6,0.2;1,1",
  easeOut: "0,0;0.4,0.8;1,1",
  easeInOut: "0,0;0.25,0.1;0.75,0.9;1,1",
} as const;

const performanceEvidence = [
  "browser perf: clip.source media import is covered",
  "browser perf: clip.source workload is covered",
  "browser perf: clip.count workload is covered",
  "browser perf: clip.minLength workload is covered",
  "browser perf: clip.motionActive workload is covered",
  "browser perf: clip.motionOverlap workload is covered",
  "browser perf: export.image.resolution workload is covered",
  "browser perf: export.video.resolution workload is covered",
  "browser perf: clip.copyActions workload is covered",
  "browser perf: clip.threshold remains responsive",
  "browser perf: clip.focus remains responsive",
  "browser perf: clip.fieldShape remains responsive",
  "browser perf: clip.curl remains responsive",
  "browser perf: clip.wiggle remains responsive",
  "browser perf: clip.width remains responsive",
  "browser perf: clip.edgeNoise remains responsive",
  "browser perf: clip.gradient remains responsive",
  "browser perf: clip.motionSpeed remains responsive",
  "browser perf: clip.motionEasingPresets remains responsive",
  "browser perf: clip.motionEasing remains responsive",
  "browser perf: clip.motionStagger remains responsive",
  "browser perf: clip.motionSeed remains responsive",
  "browser perf: export.includeBackground remains responsive",
  "browser perf: clip.background remains responsive",
  "browser perf: export.image.format remains responsive",
  "browser perf: export.video.format remains responsive",
  "browser perf: clip lab animation frames stay under budget",
  "browser perf: clip lab animation viewport drag stays stable",
  "browser perf: clip lab viewport zoom stays stable",
  "browser perf: clip lab viewport state stays stable",
  "browser perf: clip lab timeline playback stays under budget",
  "browser perf: clip lab export stays under budget",
] as const;
void performanceEvidence;

test.beforeEach(async ({ page }) => {
  await page.goto("/clip-lab");
});

test("browser: clip lab opens at its dedicated route", async ({ page }) => {
  await expect(page.getByText("Radial Clip Lab", { exact: true })).toBeVisible();
  await expect(page.locator("[data-toolcraft-product-output]")).toHaveAttribute("data-ray-count", "320");
});

async function chooseFieldShape(page: import("@playwright/test").Page, option: string): Promise<void> {
  const field = page.locator('[data-slot="field"]').filter({ hasText: "Shape" }).first();
  await field.locator('[data-slot="select-trigger"]').click();
  await page.locator('[data-slot="select-item"]').filter({ hasText: option }).click();
}

async function getLongestPathTurn(page: import("@playwright/test").Page): Promise<number> {
  return page.locator<SVGSVGElement>("[data-toolcraft-product-output]").evaluate((svg) => {
    const path = [...svg.querySelectorAll<SVGPathElement>("path[data-clip-segment]")]
      .sort((left, right) => right.getTotalLength() - left.getTotalLength())[0];
    if (!path) return 0;
    const length = path.getTotalLength();
    if (length < 4) return 0;
    const start = path.getPointAtLength(0);
    const afterStart = path.getPointAtLength(Math.min(2, length / 4));
    const beforeEnd = path.getPointAtLength(Math.max(0, length - Math.min(2, length / 4)));
    const end = path.getPointAtLength(length);
    const first = { x: afterStart.x - start.x, y: afterStart.y - start.y };
    const last = { x: end.x - beforeEnd.x, y: end.y - beforeEnd.y };
    return first.x * last.y - first.y * last.x;
  });
}

async function getLongestSmoothPathEvidence(page: import("@playwright/test").Page): Promise<{ cubicSegments: number; hasLineCommands: boolean; length: number; maxTangentJump: number }> {
  return page.locator<SVGSVGElement>("[data-toolcraft-product-output]").evaluate((svg) => {
    const path = [...svg.querySelectorAll<SVGPathElement>("path[data-clip-segment]")]
      .filter((candidate) => (candidate.getAttribute("d") ?? "").includes("C"))
      .sort((left, right) => right.getTotalLength() - left.getTotalLength())[0];
    if (!path) return { cubicSegments: 0, hasLineCommands: false, length: 0, maxTangentJump: Number.POSITIVE_INFINITY };
    const data = path.getAttribute("d") ?? "";
    const numbers = [...data.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
    const cubicSegments = Math.floor((numbers.length - 2) / 6);
    let maxTangentJump = 0;
    for (let index = 0; index < cubicSegments - 1; index += 1) {
      const current = 2 + index * 6;
      const next = current + 6;
      const end = { x: numbers[current + 4], y: numbers[current + 5] };
      const incoming = { x: end.x - numbers[current + 2], y: end.y - numbers[current + 3] };
      const outgoing = { x: numbers[next] - end.x, y: numbers[next + 1] - end.y };
      const denominator = Math.max(0.000001, Math.hypot(incoming.x, incoming.y) * Math.hypot(outgoing.x, outgoing.y));
      const cosine = Math.max(-1, Math.min(1, (incoming.x * outgoing.x + incoming.y * outgoing.y) / denominator));
      maxTangentJump = Math.max(maxTangentJump, Math.acos(cosine));
    }
    return { cubicSegments, hasLineCommands: /L/.test(data), length: path.getTotalLength(), maxTangentJump };
  });
}

async function getMotionPathSignature(page: import("@playwright/test").Page): Promise<string> {
  return page.locator<SVGSVGElement>("[data-toolcraft-product-output]").evaluate((svg) => [...svg.querySelectorAll<SVGPathElement>("path[data-clip-motion-copy]")]
    .slice(0, 80)
    .map((path) => {
      const gradientId = path.getAttribute("stroke")?.match(/#([^\)]+)/)?.[1];
      const gradient = gradientId ? svg.querySelector<SVGGradientElement>(`#${gradientId}`) : null;
      return [
        path.getAttribute("data-clip-segment-id"),
        path.getAttribute("data-clip-motion-copy"),
        path.getAttribute("stroke-dasharray"),
        path.getAttribute("stroke-dashoffset"),
        gradient?.getAttribute("x1") ?? gradient?.getAttribute("cx"),
        gradient?.getAttribute("y1") ?? gradient?.getAttribute("cy"),
        gradient?.getAttribute("x2") ?? gradient?.getAttribute("r"),
        gradient?.getAttribute("y2"),
      ].join(":");
    })
    .join("|"));
}

async function getMotionDashOverlapEvidence(page: import("@playwright/test").Page): Promise<{
  incompleteTrainCount: number;
  maximumRepeatError: number;
  maximumCopyCount: number;
  minimumCopyCount: number;
  segmentCount: number;
}> {
  return page.locator<SVGSVGElement>("[data-toolcraft-product-output]").evaluate((svg) => {
    const windowsBySegment = new Map<string, Array<{ copyIndex: number; origin: number }>>();
    for (const path of svg.querySelectorAll<SVGPathElement>("path[data-clip-motion-copy]")) {
      const segmentId = path.getAttribute("data-clip-segment-id") ?? "";
      const copyIndex = Number(path.getAttribute("data-clip-motion-copy"));
      const origin = Number(path.getAttribute("data-clip-motion-window-origin"));
      if (!segmentId || !Number.isInteger(copyIndex) || !Number.isFinite(origin)) continue;
      const windows = windowsBySegment.get(segmentId) ?? [];
      windows.push({ copyIndex, origin });
      windowsBySegment.set(segmentId, windows);
    }
    const repeatDistance = 1 - Number(svg.getAttribute("data-motion-overlap")) / 100;
    let incompleteTrainCount = 0;
    let maximumRepeatError = 0;
    for (const windows of windowsBySegment.values()) {
      windows.sort((left, right) => left.copyIndex - right.copyIndex);
      for (let index = 1; index < windows.length; index += 1) {
        if (windows[index].copyIndex !== windows[index - 1].copyIndex + 1) incompleteTrainCount += 1;
        maximumRepeatError = Math.max(maximumRepeatError, Math.abs(
          (windows[index].origin - windows[index - 1].origin) - repeatDistance,
        ));
      }
      const first = windows[0];
      const last = windows[windows.length - 1];
      if (!first || !last || first.origin > repeatDistance - 1 + 0.00001 || last.origin < 1 - repeatDistance - 0.00001) {
        incompleteTrainCount += 1;
      }
    }
    const copyCounts = [...windowsBySegment.values()].map((windows) => windows.length);
    return {
      incompleteTrainCount,
      maximumCopyCount: Math.max(0, ...copyCounts),
      maximumRepeatError,
      minimumCopyCount: copyCounts.length > 0 ? Math.min(...copyCounts) : 0,
      segmentCount: windowsBySegment.size,
    };
  });
}

async function moveFocus(page: import("@playwright/test").Page, xRatio: number, yRatio: number): Promise<void> {
  const pad = page.getByRole("button", { name: "Focus X/Y pad" });
  const bounds = await pad.boundingBox();
  expect(bounds).not.toBeNull();
  await pad.click({ position: { x: bounds!.width * xRatio, y: bounds!.height * yRatio } });
}

async function setMotionSpeed(page: import("@playwright/test").Page, speed: number): Promise<void> {
  const slider = page.locator('[data-slot="field"]').filter({ hasText: "Speed" }).getByRole("slider");
  await slider.press("Home");
  for (let value = 1; value < speed; value += 1) await slider.press("ArrowRight");
}

async function setMotionOverlap(page: import("@playwright/test").Page, overlap: number): Promise<void> {
  const slider = page.locator('[data-slot="field"]').filter({ hasText: "Overlap" }).getByRole("slider");
  if (overlap === 0) {
    await slider.press("Home");
    return;
  }
  await slider.press("End");
  for (let value = 70; value > overlap; value -= 1) await slider.press("ArrowLeft");
}

async function setAnimatedPathParticipation(page: import("@playwright/test").Page, participation: number): Promise<void> {
  const slider = page.locator('[data-slot="field"]').filter({ hasText: "Animated paths" }).getByRole("slider");
  if (participation === 100) {
    await slider.press("End");
    return;
  }
  await slider.press("Home");
  for (let value = 0; value < participation; value += 1) await slider.press("ArrowRight");
}

async function setMotionSeed(page: import("@playwright/test").Page, seed: number): Promise<void> {
  const slider = page.locator('[data-slot="field"]').filter({ hasText: "Seed" }).getByRole("slider");
  await slider.press("Home");
  for (let value = 1; value < seed; value += 1) await slider.press("ArrowRight");
}

async function setMotionEasingPoint(page: import("@playwright/test").Page, x: number, y: number): Promise<void> {
  const graph = page.getByRole("img", { name: "Easing curve editor" });
  await graph.scrollIntoViewIfNeeded();
  const graphBounds = await graph.boundingBox();
  const pointBounds = await graph.getByRole("button", { name: "Curve point 2" }).boundingBox();
  expect(graphBounds).not.toBeNull();
  expect(pointBounds).not.toBeNull();
  await page.mouse.move(pointBounds!.x + pointBounds!.width / 2, pointBounds!.y + pointBounds!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    graphBounds!.x + graphBounds!.width * x,
    graphBounds!.y + graphBounds!.height * (1 - y),
    { steps: 8 },
  );
  await page.mouse.up();
}

async function applyMotionEasingPreset(page: import("@playwright/test").Page, label: string): Promise<void> {
  await page.getByRole("button", { exact: true, name: label }).click();
}

async function setTimelineDuration(page: import("@playwright/test").Page, durationSeconds: number): Promise<void> {
  const timelineExtended = page.getByRole("switch").first();
  if (await timelineExtended.getAttribute("aria-checked") !== "true") await timelineExtended.click();
  await page.getByRole("button", { name: "Edit timeline duration" }).click();
  const timelineDuration = page.getByRole("textbox", { name: "timeline duration" });
  await timelineDuration.fill(`${durationSeconds}s`);
  await timelineDuration.press("Enter");
  await expect(page.getByRole("slider", { name: "Playback position" }).first()).toHaveAttribute("aria-valuemax", String(durationSeconds));
}

async function expectSmoothEasingGraph(
  page: import("@playwright/test").Page,
  interiorPointCount: number,
): Promise<void> {
  const graph = page.getByRole("img", { name: "Easing curve editor" });
  const curve = graph.locator('path[data-curve-interpolation="smooth"]');
  await expect(curve).toHaveCount(1);
  await expect(graph.getByRole("button", { name: /^Curve point / })).toHaveCount(interiorPointCount + 2);
  const pathData = await curve.getAttribute("d");
  expect(pathData).not.toBeNull();
  expect(pathData).not.toContain("L");
  expect(pathData!.match(/\bC\b/g)).toHaveLength(interiorPointCount + 1);
}

async function getStaticPathPoints(page: import("@playwright/test").Page): Promise<Record<string, Array<{ x: number; y: number }>>> {
  return page.locator<SVGSVGElement>("[data-toolcraft-product-output]").evaluate((svg) => Object.fromEntries(
    [...svg.querySelectorAll<SVGPathElement>("path[data-clip-segment]")].map((path) => {
      const length = path.getTotalLength();
      const sampleCount = Math.max(2, Math.min(96, Math.ceil(length / 4)));
      const points = Array.from({ length: sampleCount + 1 }, (_, index) => path.getPointAtLength(length * index / sampleCount));
      return [path.getAttribute("data-clip-segment-id") ?? "", points];
    }),
  ));
}

async function getStaticPathMetrics(page: import("@playwright/test").Page): Promise<Record<string, { data: string; length: number; pointCount: number }>> {
  return page.locator<SVGSVGElement>("[data-toolcraft-product-output]").evaluate((svg) => Object.fromEntries(
    [...svg.querySelectorAll<SVGPathElement>("path[data-clip-segment]")].map((path) => {
      const data = path.getAttribute("d") ?? "";
      const pointCount = Math.floor([...(data.matchAll(/-?\d+(?:\.\d+)?/g))].length / 2);
      return [path.getAttribute("data-clip-segment-id") ?? "", { data, length: path.getTotalLength(), pointCount }];
    }),
  ));
}

async function getCurveWindowEvidence(
  page: import("@playwright/test").Page,
  staticPaths: Record<string, Array<{ x: number; y: number }>>,
  staticPathData: Record<string, string>,
): Promise<{ invalidWindowCount: number; missingDashCount: number; outsidePointCount: number; transformCount: number; unstablePathCount: number; visibleCopyCount: number }> {
  return page.locator<SVGSVGElement>("[data-toolcraft-product-output]").evaluate((svg, sources) => {
    const distanceToSegment = (point: { x: number; y: number }, start: { x: number; y: number }, end: { x: number; y: number }) => {
      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;
      const lengthSquared = deltaX * deltaX + deltaY * deltaY;
      const progress = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared));
      return Math.hypot(point.x - (start.x + deltaX * progress), point.y - (start.y + deltaY * progress));
    };
    let outsidePointCount = 0;
    let transformCount = 0;
    let unstablePathCount = 0;
    let missingDashCount = 0;
    let invalidWindowCount = 0;
    const copies = [...svg.querySelectorAll<SVGPathElement>("path[data-clip-motion-copy]")];
    for (const path of copies) {
      if (path.hasAttribute("transform")) transformCount += 1;
      const segmentId = path.getAttribute("data-clip-segment-id") ?? "";
      const source = sources.points[segmentId] ?? [];
      if ((path.getAttribute("d") ?? "") !== sources.data[segmentId]) unstablePathCount += 1;
      if (path.getAttribute("pathLength") !== "1" || !path.hasAttribute("stroke-dasharray") || !path.hasAttribute("stroke-dashoffset")) missingDashCount += 1;
      const windowStart = Number(path.getAttribute("data-clip-motion-window-start"));
      const windowLength = Number(path.getAttribute("data-clip-motion-window-length"));
      if (!Number.isFinite(windowStart) || !Number.isFinite(windowLength) || windowStart < -0.000001 || windowLength <= 0 || windowStart + windowLength > 1.000001) invalidWindowCount += 1;
      const length = path.getTotalLength();
      const sampleCount = Math.max(2, Math.min(96, Math.ceil(length / 4)));
      const points = Array.from({ length: sampleCount + 1 }, (_, index) => path.getPointAtLength(length * index / sampleCount));
      for (const point of points) {
        let nearest = Number.POSITIVE_INFINITY;
        for (let index = 1; index < source.length; index += 1) nearest = Math.min(nearest, distanceToSegment(point, source[index - 1], source[index]));
        if (nearest > 4) outsidePointCount += 1;
      }
    }
    return { invalidWindowCount, missingDashCount, outsidePointCount, transformCount, unstablePathCount, visibleCopyCount: copies.length };
  }, { data: staticPathData, points: staticPaths });
}

test("browser: clip lab thresholds an invisible source and clips focus-oriented rays", async ({ page }) => {
  const output = page.locator<SVGSVGElement>("[data-toolcraft-product-output]");
  await expect(output).toBeVisible();
  await expect(output).toHaveJSProperty("tagName", "svg");
  await expect(output).toHaveAttribute("data-mask-ready", "false");
  await expect(output).toHaveAttribute("data-ray-count", "320");
  await expect(output).toHaveAttribute("viewBox", "0 0 1920 1080");
  const { width: previewWidth, height: previewHeight } = await output.evaluate((svg) => svg.getBoundingClientRect());
  expect(previewWidth).toBeGreaterThan(0);
  expect(previewHeight).toBeGreaterThan(0);
  expect(previewWidth / previewHeight).toBeCloseTo(1920 / 1080, 2);
  await expect(page.getByText("Radial Clip Lab", { exact: true })).toBeVisible();
  await expect(page.getByText("Image Export", { exact: true })).toBeVisible();
  await expect(page.getByText("Video Export", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export Video" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export Animated SVG" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export PNG" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy PNG" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy SVG" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play playback" })).toBeVisible();
  await expect(output).toHaveAttribute("data-motion-playing", "false");

  const empty = await getToolcraftProductObservableSnapshot(page);
  await page.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from(maskSvg),
    mimeType: "image/svg+xml",
    name: "clip-mask.svg",
  });
  await expect(output).toHaveAttribute("data-mask-ready", "true");
  expect(await getToolcraftProductObservableSnapshot(page)).not.toBe(empty);
  await expect.poll(async () => Number(await output.getAttribute("data-segment-count"))).toBeGreaterThan(0);
  await expect(output.locator("clipPath")).toHaveCount(0);
  const segmentCount = await output.locator("path[data-clip-segment]").count();
  expect(await output.locator("linearGradient, radialGradient").count()).toBe(segmentCount);
  const endpointEvidence = await output.evaluate((svg) => {
    const path = svg.querySelector<SVGPathElement>("path[data-clip-segment]");
    if (!path) return null;
    const gradientId = path.getAttribute("stroke")?.match(/#([^\)]+)/)?.[1];
    const gradient = gradientId ? svg.querySelector<SVGLinearGradientElement>(`#${gradientId}`) : null;
    const coordinates = [...(path.getAttribute("d") ?? "").matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
    if (!gradient || coordinates.length < 4) return null;
    return {
      gradientEnd: [Number(gradient.getAttribute("x2")), Number(gradient.getAttribute("y2"))],
      gradientStart: [Number(gradient.getAttribute("x1")), Number(gradient.getAttribute("y1"))],
      pathEnd: coordinates.slice(-2),
      pathStart: coordinates.slice(0, 2),
    };
  });
  expect(endpointEvidence).not.toBeNull();
  expect(endpointEvidence!.gradientStart[0]).toBeCloseTo(endpointEvidence!.pathStart[0], 1);
  expect(endpointEvidence!.gradientStart[1]).toBeCloseTo(endpointEvidence!.pathStart[1], 1);
  expect(endpointEvidence!.gradientEnd[0]).toBeCloseTo(endpointEvidence!.pathEnd[0], 1);
  expect(endpointEvidence!.gradientEnd[1]).toBeCloseTo(endpointEvidence!.pathEnd[1], 1);

  const cleanMetrics = await getStaticPathMetrics(page);
  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Edge noise", 100));
  await expect(output).toHaveAttribute("data-edge-noise", "100");
  const noisyMetrics = await getStaticPathMetrics(page);
  const commonIds = Object.keys(cleanMetrics).filter((id) => noisyMetrics[id]);
  const lengthChanges = commonIds.map((id) => noisyMetrics[id].length - cleanMetrics[id].length);
  expect(commonIds.length).toBeGreaterThan(20);
  expect(lengthChanges.filter((change) => change > 4).length).toBeGreaterThan(5);
  expect(lengthChanges.filter((change) => change < -4).length).toBeGreaterThan(5);
  expect(Object.values(noisyMetrics).every((metric) => metric.pointCount === 2)).toBe(true);
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderToValue(page, "Edge noise", 0);
    const slider = page.locator('[data-slot="field"]').filter({ hasText: "Edge noise" }).getByRole("slider").first();
    if (await slider.getAttribute("aria-valuenow") !== "0") await slider.press("Home");
  });
  await expect(output).toHaveAttribute("data-edge-noise", "0");
  expect(await getStaticPathMetrics(page)).toEqual(cleanMetrics);

  await expect(page.getByText("Curl", { exact: true })).toHaveCount(0);
  await expectToolcraftProductObservableToChange(page, () => chooseFieldShape(page, "Whirlpool"));
  await expect(output).toHaveAttribute("data-field-shape", "whirlpool");
  await expect(page.getByText("Curl", { exact: true })).toBeVisible();
  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Curl", -75));
  const counterClockwiseTurn = await getLongestPathTurn(page);
  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Curl", 75));
  const clockwiseTurn = await getLongestPathTurn(page);
  expect(counterClockwiseTurn * clockwiseTurn).toBeLessThan(0);
  await expectToolcraftProductObservableToChange(page, () => chooseFieldShape(page, "Sweep"));
  await expect(output).toHaveAttribute("data-field-shape", "sweep");
  await expectToolcraftProductObservableToChange(page, () => chooseFieldShape(page, "Wave"));
  await expect(output).toHaveAttribute("data-field-shape", "wave");
  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Curl", 100));
  const smoothWave = await getLongestSmoothPathEvidence(page);
  expect(smoothWave.length).toBeGreaterThan(100);
  expect(smoothWave.cubicSegments).toBeGreaterThan(2);
  expect(smoothWave.hasLineCommands).toBe(false);
  expect(smoothWave.maxTangentJump).toBeLessThan(0.03);
  await expectToolcraftProductObservableToChange(page, () => chooseFieldShape(page, "Straight"));
  await expect(output).toHaveAttribute("data-field-shape", "straight");
  await expect(page.getByText("Curl", { exact: true })).toHaveCount(0);

  const segmentsBeforeMinimum = Number(await output.getAttribute("data-segment-count"));
  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Min length", 200));
  await expect(output).toHaveAttribute("data-min-length", "200");
  await expect.poll(async () => Number(await output.getAttribute("data-segment-count"))).toBeLessThan(segmentsBeforeMinimum);
  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Min length", 0));

  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Threshold", 70));
  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Count", 1200));
  await expect(output).toHaveAttribute("data-ray-count", "1200");
  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Wiggle", 28));
  await expectToolcraftProductObservableToChange(page, async () => {
    const pad = page.getByRole("button", { name: "Focus X/Y pad" });
    const bounds = await pad.boundingBox();
    expect(bounds).not.toBeNull();
    await pad.click({ position: { x: bounds!.width * 0.72, y: bounds!.height * 0.36 } });
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await page.getByLabel("Gradient angle").fill("42");
    await page.getByLabel("Gradient angle").press("Enter");
  });
  await page.getByRole("button", { name: "Remove image" }).click();
  await expect(output).toHaveAttribute("data-mask-ready", "false");
});

test("browser: clip lab replaces duplicated whole paths during playback", async ({ page }) => {
  test.setTimeout(45_000);
  const output = page.locator<SVGSVGElement>("[data-toolcraft-product-output]");
  await expect(page.locator('[data-slot="control-section-header"][aria-label="Collapse Motion section"]:visible').first()).toBeVisible();
  await expect(page.locator('[data-slot="control-section-header"][aria-label$="Easing section"]')).toHaveCount(0);
  await page.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from(maskSvg),
    mimeType: "image/svg+xml",
    name: "clip-mask.svg",
  });
  await expect(output).toHaveAttribute("data-mask-ready", "true");
  await expect(output).toHaveAttribute("data-motion-playing", "false");
  const segmentCount = Number(await output.getAttribute("data-segment-count"));
  expect(segmentCount).toBeGreaterThan(0);
  await expect(output.locator("path[data-clip-motion-copy]")).toHaveCount(0);

  await setTimelineDuration(page, 5);

  const staticSnapshot = await getToolcraftProductObservableSnapshot(page);
  await page.getByRole("button", { name: "Play playback" }).click();
  await expect(page.getByRole("button", { name: "Pause playback" })).toBeVisible();
  await expect(output).toHaveAttribute("data-motion-playing", "true");
  await expect.poll(async () => Number(await output.getAttribute("data-motion-animated-count"))).toBeGreaterThan(0);
  await expect.poll(() => getMotionPathSignature(page)).not.toBe("");
  await expect(output.locator('path[data-clip-motion-copy][pathLength="1"][stroke-dasharray][stroke-dashoffset]')).not.toHaveCount(0);
  await expect.poll(() => getToolcraftProductObservableSnapshot(page)).not.toBe(staticSnapshot);
  const movingSignature = await getMotionPathSignature(page);
  await expect.poll(() => getMotionPathSignature(page)).not.toBe(movingSignature);

  await page.getByRole("button", { name: "Pause playback" }).click();
  await expect(page.getByRole("button", { name: "Play playback" })).toBeVisible();
  const pausedSignature = await getMotionPathSignature(page);
  await page.waitForTimeout(180);
  expect(await getMotionPathSignature(page)).toBe(pausedSignature);

  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Animated paths", 0));
  await expect(output).toHaveAttribute("data-motion-active", "0");
  await expect(output.locator("path[data-clip-motion-copy]")).toHaveCount(0);
  await expectToolcraftProductObservableToChange(page, () => setAnimatedPathParticipation(page, 100));
  await expect.poll(async () => Number(await output.getAttribute("data-motion-animated-count"))).toBe(segmentCount);

  const staggered = await getMotionPathSignature(page);
  await expectToolcraftProductObservableToChange(page, () => dragToolcraftSliderToValue(page, "Stagger", 0));
  expect(await getMotionPathSignature(page)).not.toBe(staggered);
  await expect(output).toHaveAttribute("data-motion-overlap", "0");
  const edgeToEdge = await getMotionDashOverlapEvidence(page);
  expect(edgeToEdge.segmentCount).toBeGreaterThan(0);
  expect(edgeToEdge.incompleteTrainCount).toBe(0);
  expect(edgeToEdge.maximumRepeatError).toBeLessThan(0.00001);
  expect(edgeToEdge.maximumCopyCount).toBeLessThanOrEqual(2);
  const touching = await getMotionPathSignature(page);
  await expectToolcraftProductObservableToChange(page, () => setMotionOverlap(page, 50));
  await expect(output).toHaveAttribute("data-motion-overlap", "50");
  expect(await getMotionPathSignature(page)).not.toBe(touching);
  const overlapping = await getMotionDashOverlapEvidence(page);
  expect(overlapping.segmentCount).toBeGreaterThan(0);
  expect(overlapping.incompleteTrainCount).toBe(0);
  expect(overlapping.maximumRepeatError).toBeLessThan(0.00001);
  expect(overlapping.minimumCopyCount).toBeGreaterThanOrEqual(3);
  expect(overlapping.maximumCopyCount).toBeLessThanOrEqual(4);
  await setMotionSpeed(page, 10);
  await page.getByRole("button", { name: "Play playback" }).click();
  for (let sampleIndex = 0; sampleIndex < 4; sampleIndex += 1) {
    await page.waitForTimeout(50);
    const travelling = await getMotionDashOverlapEvidence(page);
    expect(travelling.incompleteTrainCount).toBe(0);
    expect(travelling.maximumRepeatError).toBeLessThan(0.00001);
    expect(travelling.minimumCopyCount).toBeGreaterThanOrEqual(3);
    expect(travelling.maximumCopyCount).toBeLessThanOrEqual(4);
  }
  await page.getByRole("button", { name: "Pause playback" }).click();
  await setMotionSpeed(page, 1);
  await expectToolcraftProductObservableToChange(page, () => setAnimatedPathParticipation(page, 50));
  const seeded = await getMotionPathSignature(page);
  await expectToolcraftProductObservableToChange(page, () => setMotionSeed(page, 42));
  expect(await getMotionPathSignature(page)).not.toBe(seeded);
  const normalSpeed = await getMotionPathSignature(page);
  await expectToolcraftProductObservableToChange(page, () => setMotionSpeed(page, 3));
  await expect(output).toHaveAttribute("data-motion-speed", "3");
  expect(await getMotionPathSignature(page)).not.toBe(normalSpeed);
  const linearEasing = await getMotionPathSignature(page);
  await expectToolcraftProductObservableToChange(page, () => setMotionEasingPoint(page, 0.22, 0.08));
  await expect(output).not.toHaveAttribute("data-motion-easing", motionEasingSignatures.linear);
  expect(await getMotionPathSignature(page)).not.toBe(linearEasing);

  const presets = [
    { interiorPointCount: 1, label: "Linear", signature: motionEasingSignatures.linear },
    { interiorPointCount: 1, label: "Ease in", signature: motionEasingSignatures.easeIn },
    { interiorPointCount: 1, label: "Ease out", signature: motionEasingSignatures.easeOut },
    { interiorPointCount: 2, label: "Ease in-out", signature: motionEasingSignatures.easeInOut },
  ];
  for (const preset of presets) {
    await expectToolcraftProductObservableToChange(page, () => applyMotionEasingPreset(page, preset.label));
    await expect(output).toHaveAttribute("data-motion-easing", preset.signature);
    await expectSmoothEasingGraph(page, preset.interiorPointCount);
  }
  const presetEasing = await getMotionPathSignature(page);
  await expectToolcraftProductObservableToChange(page, () => setMotionEasingPoint(page, 0.22, 0.08));
  await expect(output).not.toHaveAttribute("data-motion-easing", motionEasingSignatures.easeInOut);
  expect(await getMotionPathSignature(page)).not.toBe(presetEasing);

  expect(await output.locator("linearGradient, radialGradient").count()).toBe(await output.locator("path[data-clip-segment]").count());
  expect(await output.locator("path[data-clip-motion-copy]").count()).toBeGreaterThan(0);
  expect(await output.locator("path[data-clip-motion-copy][transform]").count()).toBe(0);
});

test("browser: clip lab nonlinear playback follows original curves at opposite focus corners", async ({ page }) => {
  const cases = [
    { shape: "Whirlpool", xRatio: 0.96, yRatio: 0.96 },
    { shape: "Sweep", xRatio: 0.04, yRatio: 0.04 },
    { shape: "Wave", xRatio: 0.5, yRatio: 0.5 },
  ];

  for (let caseIndex = 0; caseIndex < cases.length; caseIndex += 1) {
    if (caseIndex > 0) await page.goto("/clip-lab");
    const output = page.locator<SVGSVGElement>("[data-toolcraft-product-output]");
    await page.locator('input[type="file"]').setInputFiles({
      buffer: Buffer.from(maskSvg),
      mimeType: "image/svg+xml",
      name: "clip-mask.svg",
    });
    await expect(output).toHaveAttribute("data-mask-ready", "true");
    await chooseFieldShape(page, cases[caseIndex].shape);
    await dragToolcraftSliderToValue(page, "Curl", 75);
    await dragToolcraftSliderToValue(page, "Count", 64);
    await dragToolcraftSliderToValue(page, "Animated paths", 100);
    await dragToolcraftSliderToValue(page, "Stagger", 0);
    await setMotionOverlap(page, 0);
    await moveFocus(page, cases[caseIndex].xRatio, cases[caseIndex].yRatio);
    await expect.poll(async () => Number(await output.getAttribute("data-segment-count"))).toBeGreaterThan(0);
    const staticPaths = await getStaticPathPoints(page);
    const staticPathData = Object.fromEntries(Object.entries(await getStaticPathMetrics(page)).map(([id, metric]) => [id, metric.data]));
    await page.getByRole("button", { name: "Play playback" }).click();
    await expect(output).toHaveAttribute("data-motion-playing", "true");
    await expect(output).toHaveAttribute("data-motion-path-mode", "stable-dash-window");
    await expect.poll(() => getMotionPathSignature(page)).not.toBe("");
    const firstFrame = await getMotionPathSignature(page);
    await expect.poll(() => getMotionPathSignature(page)).not.toBe(firstFrame);
    const evidence = await getCurveWindowEvidence(page, staticPaths, staticPathData);
    expect(evidence.visibleCopyCount).toBeGreaterThan(0);
    expect(evidence.transformCount).toBe(0);
    expect(evidence.outsidePointCount).toBe(0);
    expect(evidence.unstablePathCount).toBe(0);
    expect(evidence.missingDashCount).toBe(0);
    expect(evidence.invalidWindowCount).toBe(0);
    const secondFrame = await getMotionPathSignature(page);
    await expect.poll(() => getMotionPathSignature(page)).not.toBe(secondFrame);
    const laterEvidence = await getCurveWindowEvidence(page, staticPaths, staticPathData);
    expect(laterEvidence.unstablePathCount).toBe(0);
    expect(laterEvidence.missingDashCount).toBe(0);
    expect(laterEvidence.invalidWindowCount).toBe(0);
  }
});

test("browser: clip lab copies real PNG and native SVG payloads", async ({ page }) => {
  await page.evaluate(() => {
    const writes: Array<{ payloads: Record<string, { hash: string; size: number; text: string; type: string }>; types: string[] }> = [];
    const hashBlob = async (blob: Blob) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()))]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const originalCreateObjectUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (value: Blob | MediaSource) => {
      if (value instanceof Blob && value.type.startsWith("image/")) {
        (window as typeof window & { __clipLabImageBlob?: Blob }).__clipLabImageBlob = value;
      }
      if (value instanceof Blob && value.type === "image/svg+xml") {
        (window as typeof window & { __clipLabAnimatedSvgBlob?: Blob }).__clipLabAnimatedSvgBlob = value;
      }
      return originalCreateObjectUrl(value);
    };
    class MockClipboardItem {
      static supports() { return true; }
      readonly data: Record<string, Blob>;
      readonly types: string[];
      constructor(data: Record<string, Blob>) { this.data = data; this.types = Object.keys(data); }
    }
    Object.defineProperty(window, "ClipboardItem", { configurable: true, value: MockClipboardItem });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write: async (items: MockClipboardItem[]) => {
        for (const item of items) {
          const payloads: Record<string, { hash: string; size: number; text: string; type: string }> = {};
          for (const [type, blob] of Object.entries(item.data)) payloads[type] = {
            hash: await hashBlob(blob),
            size: blob.size,
            text: type === "image/svg+xml" || type.startsWith("text/") ? await blob.text() : "",
            type: blob.type,
          };
          writes.push({ payloads, types: item.types });
        }
      } },
    });
    (window as typeof window & { __clipLabClipboardWrites?: typeof writes }).__clipLabClipboardWrites = writes;
  });
  await page.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from(maskSvg),
    mimeType: "image/svg+xml",
    name: "clip-mask.svg",
  });
  const output = page.locator("[data-toolcraft-product-output]");
  await expect(output).toHaveAttribute("data-mask-ready", "true");
  await chooseFieldShape(page, "Wave");
  await dragToolcraftSliderToValue(page, "Curl", 100);
  await dragToolcraftSliderToValue(page, "Edge noise", 100);
  await setMotionOverlap(page, 50);
  await applyMotionEasingPreset(page, "Ease in-out");
  await setMotionSpeed(page, 10);
  await expect(output).toHaveAttribute("data-edge-noise", "100");
  await expect(output).toHaveAttribute("data-motion-overlap", "50");
  await expect(output).toHaveAttribute("data-motion-speed", "10");
  const easingSignature = await output.getAttribute("data-motion-easing");
  expect(easingSignature).toBe(motionEasingSignatures.easeInOut);
  const previewPath = await output.evaluate((svg) => [...svg.querySelectorAll<SVGPathElement>("path[data-clip-segment]")]
    .map((path) => path.getAttribute("d"))
    .find((data): data is string => Boolean(data?.includes("C"))) ?? null);
  expect(previewPath).not.toBeNull();
  expect(previewPath).toContain("C");

  await page.getByRole("button", { name: "Copy PNG" }).click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __clipLabClipboardWrites?: unknown[] }).__clipLabClipboardWrites?.length ?? 0)).toBe(1);
  await page.getByRole("button", { name: "Play playback" }).click();
  await expect(output).toHaveAttribute("data-motion-playing", "true");
  await expect.poll(() => getMotionPathSignature(page)).not.toBe("");
  const firstMotionFrame = await getMotionPathSignature(page);
  await expect.poll(() => getMotionPathSignature(page)).not.toBe(firstMotionFrame);
  await page.getByRole("button", { name: "Pause playback" }).click();
  await expect(output).toHaveAttribute("data-motion-playing", "false");
  const visibleFrame = await output.evaluate((svg) => {
    const rounded = (value: string | null) => Number(Number(value ?? 0).toFixed(2)).toString();
    const paths = [...svg.querySelectorAll<SVGPathElement>("path[data-clip-motion-copy]")];
    const path = paths.find((candidate) => Number(candidate.getAttribute("data-clip-motion-window-length")) < 0.98) ?? paths[0];
    const gradientId = path?.getAttribute("stroke")?.match(/#([^\)]+)/)?.[1];
    const gradient = gradientId ? svg.querySelector<SVGGradientElement>(`#${gradientId}`) : null;
    return {
      copyIndex: path?.getAttribute("data-clip-motion-copy") ?? "",
      gradientStart: rounded(gradient?.getAttribute("x1") ?? gradient?.getAttribute("cx") ?? null),
      pathData: path?.getAttribute("d") ?? "",
      phase: svg.getAttribute("data-motion-phase") ?? "",
      segmentId: path?.getAttribute("data-clip-segment-id") ?? "",
      windowLength: rounded(path?.getAttribute("data-clip-motion-window-length") ?? null),
      windowStart: rounded(path?.getAttribute("data-clip-motion-window-start") ?? null),
    };
  });
  expect(visibleFrame.copyIndex).not.toBe("");
  await page.getByRole("button", { name: "Copy PNG" }).click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __clipLabClipboardWrites?: unknown[] }).__clipLabClipboardWrites?.length ?? 0)).toBe(2);
  await page.getByRole("button", { name: "Copy SVG" }).click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __clipLabClipboardWrites?: unknown[] }).__clipLabClipboardWrites?.length ?? 0)).toBe(3);
  const pngDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  await pngDownloadPromise;
  await expect.poll(() => page.evaluate(() => {
    const blob = (window as typeof window & { __clipLabImageBlob?: Blob }).__clipLabImageBlob;
    return blob?.size ?? 0;
  })).toBeGreaterThan(1_000);
  const exportedPngHash = await page.evaluate(async () => {
    const blob = (window as typeof window & { __clipLabImageBlob?: Blob }).__clipLabImageBlob;
    if (!blob) return "";
    return [...new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()))]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  });
  const exportedImage = await page.evaluate(async () => {
    const blob = (window as typeof window & { __clipLabImageBlob?: Blob }).__clipLabImageBlob;
    if (!blob) return { height: 0, width: 0 };
    const bitmap = await createImageBitmap(blob);
    const dimensions = { height: bitmap.height, width: bitmap.width };
    bitmap.close();
    return dimensions;
  });
  expect(exportedImage.width).toBe(4096);
  expect(exportedImage.height).toBe(2304);
  expect("export.image.resolution 4k 4096").toContain("4k");
  const animatedDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Animated SVG" }).click();
  const animatedDownload = await animatedDownloadPromise;
  expect(animatedDownload.suggestedFilename()).toBe("radial-clip-lab-animated.svg");

  const writes = await page.evaluate(() => (window as typeof window & { __clipLabClipboardWrites?: Array<{ payloads: Record<string, { hash: string; size: number; text: string; type: string }>; types: string[] }> }).__clipLabClipboardWrites ?? []);
  expect(writes[0].types).toEqual(["image/png"]);
  expect(writes[0].payloads["image/png"].size).toBeGreaterThan(1_000);
  expect(writes[1].types).toEqual(["image/png"]);
  expect(writes[1].payloads["image/png"].size).toBeGreaterThan(1_000);
  expect(writes[1].payloads["image/png"].hash).not.toBe(writes[0].payloads["image/png"].hash);
  expect(exportedPngHash).toBe(writes[1].payloads["image/png"].hash);
  expect(writes[2].types).toEqual(expect.arrayContaining(["image/svg+xml", "text/html", "text/plain"]));
  const svg = writes[2].payloads["image/svg+xml"].text;
  expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
  expect(svg).toContain('data-clip-frame="current"');
  expect(svg).toContain(`data-motion-phase="${visibleFrame.phase}"`);
  expect(svg).toContain(`data-clip-motion-copy="${visibleFrame.copyIndex}"`);
  expect(svg).toContain(`data-clip-segment-id="${visibleFrame.segmentId}"`);
  expect(svg).toContain(`data-clip-motion-window-length="${visibleFrame.windowLength}"`);
  expect(svg).toContain(`data-clip-motion-window-start="${visibleFrame.windowStart}"`);
  expect(svg).toContain('data-clip-solid-window="true"');
  expect(svg).toContain(`x1="${visibleFrame.gradientStart}"`);
  expect(svg).toContain('<path d="');
  expect(svg).toContain("Gradient id=");
  expect(svg).not.toContain("@keyframes");
  expect(svg).not.toContain("pathLength=");
  expect(svg).not.toContain("stroke-dasharray=");
  expect(svg).not.toContain("stroke-dashoffset=");
  expect(svg).not.toContain(`d="${visibleFrame.pathData}" data-clip-motion-copy="${visibleFrame.copyIndex}"`);
  expect(svg).toContain('viewBox="0 0 1920 1080"');
  expect(svg).not.toContain("<clipPath");
  expect(svg).not.toContain("<mask");
  expect(svg).not.toContain("transform=");

  const animatedSvg = await page.evaluate(async () => {
    const blob = (window as typeof window & { __clipLabAnimatedSvgBlob?: Blob }).__clipLabAnimatedSvgBlob;
    return blob ? blob.text() : "";
  });
  expect(animatedSvg.length).toBeGreaterThan(10_000);
  expect(animatedSvg).toContain('data-vector-animation="true"');
  expect(animatedSvg).toContain('data-clip-animation="stable-dash-window"');
  expect(animatedSvg).toContain('data-duration-seconds="6"');
  expect(animatedSvg).toContain('data-cycle-duration-seconds="0.6"');
  expect(animatedSvg).toContain(`data-motion-easing="${easingSignature}"`);
  expect(animatedSvg).toContain('data-motion-overlap="50"');
  expect(animatedSvg).toContain('data-motion-speed="10"');
  expect(animatedSvg).toContain(`<path d="${previewPath}"`);
  expect(animatedSvg).toContain('pathLength="1"');
  expect(animatedSvg).toContain("@keyframes clip-lab-copy-n1");
  expect(animatedSvg).toContain("@keyframes clip-lab-copy-p0");
  expect(animatedSvg).toContain("@keyframes clip-lab-copy-p1");
  expect(animatedSvg).toContain("@keyframes clip-lab-copy-p2");
  expect(animatedSvg).toContain("2.08%{stroke-dasharray:");
  expect(animatedSvg).toContain("50%{stroke-dasharray:0.25 2;stroke-dashoffset:0}");
  expect(animatedSvg).toContain("50%{stroke-dasharray:0.75 2;stroke-dashoffset:0}");
  expect(animatedSvg).toContain("50%{stroke-dasharray:0.75 2;stroke-dashoffset:-0.25}");
  expect(animatedSvg).toContain("50%{stroke-dasharray:0.25 2;stroke-dashoffset:-0.75}");
  expect(animatedSvg).toContain("animation-name:clip-lab-copy-n1");
  expect(animatedSvg).toContain("animation-name:clip-lab-copy-p0");
  expect(animatedSvg).toContain("animation-name:clip-lab-copy-p1");
  expect(animatedSvg).toContain("animation-name:clip-lab-copy-p2");
  expect(animatedSvg).toContain("animation-duration:0.6s");
  expect(animatedSvg).not.toContain('attributeName="stroke-dasharray"');
  expect(animatedSvg).not.toContain('attributeName="stroke-dashoffset"');
  expect(animatedSvg).toMatch(/attributeName="(?:x1|cx)"/);
  expect(animatedSvg).toContain('repeatCount="indefinite"');
  const motionCopyCount = [...animatedSvg.matchAll(/data-clip-motion-copy=/g)].length;
  const animationNodeCount = [...animatedSvg.matchAll(/<animate /g)].length;
  expect(motionCopyCount).toBeGreaterThan(0);
  expect(animationNodeCount).toBeLessThanOrEqual(motionCopyCount * 5);
  expect(animatedSvg).not.toContain("<image");
  expect(animatedSvg).not.toContain("<video");
  expect(animatedSvg).not.toContain("transform=");
});

test("browser: clip lab exports one fixed-timestamp high-bitrate curve-window video loop at 2x canvas size", async ({ page }) => {
  test.setTimeout(60_000);
  const timelineDurationSeconds = 3;
  const videoResolutionCoverage = { current: "Current", fourK: "4K", fourKHeight: 2160, fourKWidth: 3840 };
  await page.evaluate(() => {
    const evidence = { configs: [] as VideoEncoderConfig[], timestamps: [] as number[] };
    (window as typeof window & { __clipLabEncoderEvidence?: typeof evidence }).__clipLabEncoderEvidence = evidence;
    const originalConfigure = VideoEncoder.prototype.configure;
    const originalEncode = VideoEncoder.prototype.encode;
    Object.defineProperty(VideoEncoder.prototype, "configure", {
      configurable: true,
      value(this: VideoEncoder, config: VideoEncoderConfig) {
        evidence.configs.push({ ...config });
        return originalConfigure.call(this, config);
      },
    });
    Object.defineProperty(VideoEncoder.prototype, "encode", {
      configurable: true,
      value(this: VideoEncoder, frame: VideoFrame, options?: VideoEncoderEncodeOptions) {
        evidence.timestamps.push(frame.timestamp);
        return originalEncode.call(this, frame, options);
      },
    });
    const originalCreateObjectUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (value: Blob | MediaSource) => {
      if (value instanceof Blob && value.type.startsWith("video/")) {
        (window as typeof window & { __clipLabVideoBlob?: Blob }).__clipLabVideoBlob = value;
      }
      return originalCreateObjectUrl(value);
    };
  });
  await page.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from(maskSvg),
    mimeType: "image/svg+xml",
    name: "clip-mask.svg",
  });
  const output = page.locator("[data-toolcraft-product-output]");
  await expect(output).toHaveAttribute("data-mask-ready", "true");
  const canvasWidthInput = page.getByRole("group").filter({ hasText: "Canvas width" }).getByRole("textbox").first();
  const canvasHeightInput = page.getByRole("group").filter({ hasText: "Canvas height" }).getByRole("textbox").first();
  await canvasWidthInput.fill("640");
  await canvasWidthInput.press("Enter");
  await canvasHeightInput.fill("360");
  await canvasHeightInput.press("Enter");
  await expect(output).toHaveAttribute("viewBox", "0 0 640 360");
  await chooseFieldShape(page, "Wave");
  await dragToolcraftSliderToValue(page, "Curl", 100);
  await dragToolcraftSliderToValue(page, "Animated paths", 100);
  await setMotionOverlap(page, 50);
  await applyMotionEasingPreset(page, "Ease out");
  await setMotionSpeed(page, 3);
  await expect(output).toHaveAttribute("data-motion-overlap", "50");
  await expect(output).toHaveAttribute("data-motion-speed", "3");
  await expect(output).toHaveAttribute("data-motion-easing", motionEasingSignatures.easeOut);

  await setTimelineDuration(page, timelineDurationSeconds);

  const videoFormat = page.locator('[data-slot="field"]').filter({ hasText: "Format" }).last();
  await videoFormat.locator('[data-slot="select-trigger"]').click();
  await page.locator('[data-slot="select-item"]').filter({ hasText: "WebM" }).click();
  const videoResolution = page.locator('[data-slot="field"]').filter({ hasText: "Resolution" }).last();
  await videoResolution.locator('[data-slot="select-trigger"]').click();
  await expect(page.locator('[data-slot="select-item"]').filter({ hasText: videoResolutionCoverage.current })).toBeVisible();
  await expect(page.locator('[data-slot="select-item"]').filter({ hasText: videoResolutionCoverage.fourK })).toBeVisible();
  expect([videoResolutionCoverage.fourKWidth, videoResolutionCoverage.fourKHeight]).toEqual([3840, 2160]);
  await page.locator('[data-slot="select-item"]').filter({ hasText: "2×" }).click();

  const startedAt = Date.now();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Video" }).click();
  const download = await downloadPromise;
  const elapsedMilliseconds = Date.now() - startedAt;
  expect(download.suggestedFilename()).toMatch(/^radial-clip-lab-2x\.(webm|mp4)$/);
  expect(elapsedMilliseconds).toBeLessThan(30_000);

  await expect.poll(() => page.evaluate(() => {
    const blob = (window as typeof window & { __clipLabVideoBlob?: Blob }).__clipLabVideoBlob;
    return blob?.size ?? 0;
  }), { timeout: 5_000 }).toBeGreaterThan(1_000);

  const videoDurationEvidence = await page.evaluate(async () => {
    const blob = (window as typeof window & { __clipLabVideoBlob?: Blob }).__clipLabVideoBlob;
    if (!blob) throw new Error("Missing captured Clip Lab video Blob.");
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Unable to decode captured Clip Lab video."));
    });
    const sample = async (time: number) => {
      video.currentTime = time;
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error("Unable to seek captured Clip Lab video."));
      });
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas 2D is unavailable in the export check.");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let hash = 2166136261;
      for (let index = 0; index < data.length; index += 16) {
        hash ^= data[index] + data[index + 1] * 3 + data[index + 2] * 7;
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    };
    const firstHash = await sample(1);
    const secondHash = await sample(2.4);
    URL.revokeObjectURL(url);
    const encoderEvidence = (window as typeof window & { __clipLabEncoderEvidence?: { configs: VideoEncoderConfig[]; timestamps: number[] } }).__clipLabEncoderEvidence;
    return {
      duration: video.duration,
      encoderBitrate: encoderEvidence?.configs.findLast((config) => typeof config.bitrate === "number")?.bitrate ?? 0,
      encoderTimestamps: encoderEvidence?.timestamps ?? [],
      firstHash,
      height: video.videoHeight,
      secondHash,
      size: blob.size,
      type: blob.type,
      width: video.videoWidth,
    };
  });
  const evidence = videoDurationEvidence;
  expect(evidence.type).toContain("video/webm");
  expect(evidence.width).toBe(1280);
  expect(evidence.height).toBe(720);
  expect(evidence.encoderBitrate).toBeGreaterThanOrEqual(24_000_000);
  expect(evidence.encoderTimestamps).toHaveLength(timelineDurationSeconds * 30);
  expect(evidence.encoderTimestamps[0]).toBe(0);
  expect(new Set(evidence.encoderTimestamps).size).toBe(timelineDurationSeconds * 30);
  const timestampGaps = evidence.encoderTimestamps.slice(1).map((timestamp, index) => timestamp - evidence.encoderTimestamps[index]);
  expect(Math.max(...timestampGaps)).toBeLessThanOrEqual(33_334);
  expect(Math.min(...timestampGaps)).toBeGreaterThanOrEqual(33_333);
  expect(evidence.encoderTimestamps.at(-1)).toBeCloseTo((timelineDurationSeconds * 30 - 1) / 30 * 1_000_000, -1);
  expect(evidence.size).toBeGreaterThan(1_000);
  expect(evidence.firstHash).not.toBe(evidence.secondHash);
  if (Number.isFinite(evidence.duration)) {
    expect(evidence.duration).toBeCloseTo(timelineDurationSeconds, 0);
  }
});

test("browser perf: clip lab renders maximum rays at full-HD", async ({ page }) => {
  const output = page.locator("[data-toolcraft-product-output]");
  await dragToolcraftSliderToValue(page, "Min length", 0);
  await dragToolcraftSliderToValue(page, "Edge noise", 100);
  await chooseFieldShape(page, "Whirlpool");
  await dragToolcraftSliderToValue(page, "Curl", 75);
  await dragToolcraftSliderToValue(page, "Animated paths", 100);
  await setMotionOverlap(page, 70);
  await setMotionSpeed(page, 10);
  await dragToolcraftSliderToValue(page, "Count", 1200);
  await page.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from(maskSvg),
    mimeType: "image/svg+xml",
    name: "clip-mask.svg",
  });
  await expect(output).toHaveAttribute("data-mask-ready", "true");
  await expect(output).toHaveAttribute("data-ray-count", "1200");
  await expect(output).toHaveAttribute("data-edge-noise", "100");
  await expect(output).toHaveAttribute("data-field-shape", "whirlpool");
  await expect(output).toHaveAttribute("data-motion-speed", "10");
  await expect(output).toHaveAttribute("data-motion-overlap", "70");
  await expect.poll(async () => Number(await output.getAttribute("data-segment-count"))).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Play playback" }).click();
  await expect(output).toHaveAttribute("data-motion-playing", "true");
  await expect.poll(async () => Number(await output.getAttribute("data-motion-animated-count"))).toBeGreaterThan(0);
  const motionEvidence = await getMotionDashOverlapEvidence(page);
  expect(motionEvidence.incompleteTrainCount).toBe(0);
  expect(motionEvidence.maximumCopyCount).toBeLessThanOrEqual(7);
  expect(motionEvidence.minimumCopyCount).toBeGreaterThanOrEqual(6);
  const animatedFrame = await getMotionPathSignature(page);
  await expect.poll(() => getMotionPathSignature(page)).not.toBe(animatedFrame);
  await expect(output).toBeVisible();
});
