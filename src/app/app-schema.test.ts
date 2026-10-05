import { describe, expect, it } from "vitest";

import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

describe("Radial Clip Lab schema", () => {
  it("uses editable uploaded output with playback timeline and no layers or persistence", () => {
    expect(appSchema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(appSchema.canvas.upload).toBe(true);
    expect(appSchema.panels.timeline).toMatchObject({ enabled: true, mode: "playback", defaultDurationSeconds: 6 });
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.persistence.storage).toBe("none");
  });

  it("groups the Clip Lab workflow and declares native SVG output", () => {
    expect(appSchema.panels.controls?.sections.map((section) => section.title)).toEqual([
      "Setup",
      "Image",
      "Source Mask",
      "Focus",
      "Ray Field",
      "Path Ends",
      "Ray Gradient",
      "Motion",
      "Background",
      "Image Export",
      "Video Export",
      "Export",
    ]);
    expect(appPerformance.rendererStrategy).toBe("svg");
    expect(appPerformance.rendererWorkload).toBe("vector-output");
    expect(appPerformance.workloadTargets).toEqual([
      "clip.source",
      "clip.count",
      "clip.minLength",
      "clip.motionActive",
      "clip.motionOverlap",
      "export.image.resolution",
      "export.video.resolution",
      "clip.copyActions",
    ]);
  });
});
