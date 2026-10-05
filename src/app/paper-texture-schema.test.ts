import { describe, expect, it } from "vitest";

import { validateToolcraftPerformanceCoverage } from "@/toolcraft/runtime";

import { validateToolcraftAcceptanceCoverage } from "./app-acceptance";
import { paperTextureAcceptance, paperTextureTransferMode } from "./paper-texture-acceptance";
import { paperTexturePerformance } from "./paper-texture-performance";
import { paperTextureControlSectionInventory, paperTextureSchema } from "./paper-texture-schema";

describe("Paper Texture Batch schema", () => {
  it("uses editable multi-image raster output without layers, timeline, or persistence", () => {
    expect(paperTextureSchema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(paperTextureSchema.canvas.upload).toBe(true);
    expect(paperTextureSchema.canvas.renderScale).toMatchObject({ defaultValue: 1, enabled: true });
    expect(paperTextureSchema.panels.timeline).toBeUndefined();
    expect(paperTextureSchema.panels.layers).toBeUndefined();
    expect(paperTextureSchema.persistence.storage).toBe("none");
  });

  it("groups ordered sources, one shared texture recipe, background, and delivery", () => {
    expect(paperTextureSchema.panels.controls?.sections.map((section) => section.title)).toEqual([
      "Setup",
      "Source",
      "Paper Texture",
      "Background",
      "Image Export",
      "Export",
    ]);
    expect(paperTextureControlSectionInventory.flatMap((section) => section.targets)).toEqual([
      "paper.sources",
      "paper.style",
      "paper.amount",
      "paper.scale",
      "paper.fade",
      "export.includeBackground",
      "paper.background",
      "export.image.format",
      "export.image.resolution",
    ]);
  });

  it("has complete acceptance and performance contracts", () => {
    expect(validateToolcraftAcceptanceCoverage(
      paperTextureSchema,
      paperTextureAcceptance,
      paperTextureTransferMode,
      paperTextureControlSectionInventory,
    )).toEqual([]);
    expect(validateToolcraftPerformanceCoverage(paperTextureSchema, paperTexturePerformance)).toEqual([]);
  });
});
