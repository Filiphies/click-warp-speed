import { describe, expect, it } from "vitest";

import { warpControlSectionInventory, warpSchema } from "./warp-schema";
import { warpPerformance } from "./warp-performance";

describe("Radial Warp schema", () => {
  it("uses source-native uploaded raster output without layers, timeline, or persistence", () => {
    expect(warpSchema.canvas.sizing).toEqual({ mode: "intrinsic-media" });
    expect(warpSchema.canvas.upload).toBe(true);
    expect(warpSchema.canvas.renderScale).toMatchObject({ enabled: true, defaultValue: 1 });
    expect(warpSchema.panels.timeline).toBeUndefined();
    expect(warpSchema.panels.layers).toBeUndefined();
    expect(warpSchema.persistence.storage).toBe("none");
  });

  it("groups the source, focal point, warp profile, background, and still export", () => {
    expect(warpSchema.panels.controls?.sections.map((section) => section.title)).toEqual([
      "Setup",
      "Source",
      "Focus",
      "Warp",
      "Background",
      "Image Export",
      "Export",
    ]);
    expect(warpControlSectionInventory.flatMap((section) => section.targets)).toEqual([
      "warp.source",
      "warp.focus",
      "warp.strength",
      "warp.softness",
      "warp.falloff",
      "warp.blend",
      "export.includeBackground",
      "warp.background",
      "export.image.format",
      "export.image.resolution",
    ]);
    expect(warpPerformance.rendererStrategy).toBe("webgl");
    expect(warpPerformance.workloadTargets).toEqual(["warp.source", "export.image.resolution", "warp.exportAction"]);
  });
});
