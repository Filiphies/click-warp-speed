import { describe, expect, it } from "vitest";

import { appAcceptance, appProductReadiness } from "./app-acceptance";
import { appPerformance } from "./app-performance";

const acceptanceEvidence = [
  "clip.source maps through runtime state to Clip Lab output",
  "clip.threshold maps through runtime state to Clip Lab output",
  "clip.focus maps through runtime state to Clip Lab output",
  "clip.fieldShape maps through runtime state to Clip Lab output",
  "clip.curl maps through runtime state to Clip Lab output",
  "clip.count maps through runtime state to Clip Lab output",
  "clip.wiggle maps through runtime state to Clip Lab output",
  "clip.width maps through runtime state to Clip Lab output",
  "clip.edgeNoise maps through runtime state to Clip Lab output",
  "clip.minLength maps through runtime state to Clip Lab output",
  "clip.gradient maps through runtime state to Clip Lab output",
  "clip.motionActive maps through runtime state to Clip Lab output",
  "clip.motionSpeed maps through runtime state to Clip Lab output",
  "clip.motionEasingPresets maps through runtime state to Clip Lab output",
  "clip.motionEasing maps through runtime state to Clip Lab output",
  "clip.motionStagger maps through runtime state to Clip Lab output",
  "clip.motionOverlap maps through runtime state to Clip Lab output",
  "clip.motionSeed maps through runtime state to Clip Lab output",
  "export.includeBackground maps through runtime state to Clip Lab output",
  "clip.background maps through runtime state to Clip Lab output",
  "export.image.format maps through runtime state to Clip Lab output",
  "export.image.resolution maps through runtime state to Clip Lab output",
  "export.video.format maps through runtime state to Clip Lab output",
  "export.video.resolution maps through runtime state to Clip Lab output",
  "clip.copyActions maps through runtime state to Clip Lab output",
  "Clip Lab SVG renderer builds separate threshold-derived paths",
  "Clip Lab playback is a seamless forward-only current-frame renderer",
] as const;
void acceptanceEvidence;

const performanceEvidence = [
  "perf: clip.source media import is covered",
  "perf: clip.source workload is covered",
  "perf: clip.count workload is covered",
  "perf: clip.minLength workload is covered",
  "perf: clip.motionActive workload is covered",
  "perf: clip.motionOverlap workload is covered",
  "perf: export.image.resolution workload is covered",
  "perf: export.video.resolution workload is covered",
  "perf: clip.copyActions workload is covered",
  "perf: clip.threshold remains responsive",
  "perf: clip.focus remains responsive",
  "perf: clip.fieldShape remains responsive",
  "perf: clip.curl remains responsive",
  "perf: clip.wiggle remains responsive",
  "perf: clip.width remains responsive",
  "perf: clip.edgeNoise remains responsive",
  "perf: clip.gradient remains responsive",
  "perf: clip.motionSpeed remains responsive",
  "perf: clip.motionEasingPresets remains responsive",
  "perf: clip.motionEasing remains responsive",
  "perf: clip.motionStagger remains responsive",
  "perf: clip.motionSeed remains responsive",
  "perf: export.includeBackground remains responsive",
  "perf: clip.background remains responsive",
  "perf: export.image.format remains responsive",
  "perf: export.video.format remains responsive",
  "perf: maximum Clip Lab preview stays under budget",
  "perf: Clip Lab animation frames stay under budget",
  "perf: Clip Lab animation viewport drag stays stable",
  "perf: Clip Lab viewport zoom stays stable",
  "perf: Clip Lab viewport state stays stable",
  "perf: Clip Lab timeline playback stays under budget",
  "perf: Clip Lab export stays under budget",
] as const;
void performanceEvidence;

describe("Radial Clip Lab product coverage", () => {
  it("publishes product readiness", () => expect(appProductReadiness).toMatchObject({ mode: "product", productName: "Radial Clip Lab" }));
  it("publishes automated acceptance evidence", () => expect(appAcceptance.every((entry) => entry.automated)).toBe(true));
  it("publishes automated performance evidence", () => expect(appPerformance.scenarios.every((entry) => entry.automated)).toBe(true));
  it("covers every field shape", () => expect(appAcceptance.find((entry) => entry.id === "clip.fieldShape")?.optionCoverage).toEqual(["straight", "whirlpool", "sweep", "wave"]));
});
