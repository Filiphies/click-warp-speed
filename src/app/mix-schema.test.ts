import { describe, expect, it } from "vitest";

import { validateToolcraftPerformanceCoverage } from "@/toolcraft/runtime";

import { validateToolcraftAcceptanceCoverage } from "./app-acceptance";
import { mixAcceptance, mixTransferMode } from "./mix-acceptance";
import { mixPerformance } from "./mix-performance";
import { mixControlSectionInventory, mixSchema } from "./mix-schema";

describe("Mix schema", () => {
  it("keeps the complete Speed Rays workflow and adds raster Blur", () => {
    expect(mixSchema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(mixSchema.canvas.upload).toBe(true);
    expect(mixSchema.canvas.renderScale).toMatchObject({ enabled: true, defaultValue: 1 });
    expect(mixSchema.panels.timeline).toMatchObject({ enabled: true, mode: "playback", defaultDurationSeconds: 6 });
    expect(mixSchema.panels.layers).toBeUndefined();
    expect(mixSchema.persistence.storage).toBe("none");
    expect(mixSchema.panels.controls?.sections.map((section) => section.title)).toEqual([
      "Setup",
      "Image",
      "Source Mask",
      "Focus",
      "Ray Field",
      "Path Ends",
      "Ray Gradient",
      "Blur",
      "Motion",
      "Background",
      "Image Export",
      "Video Export",
      "Export",
    ]);
  });

  it("exposes the four Speed Blur controls and raster-only delivery", () => {
    const controls = mixSchema.panels.controls?.sections.flatMap((section) => Object.values(section.controls)) ?? [];
    const targets = controls.map((control) => control.target);
    expect(targets).toEqual(expect.arrayContaining([
      "mix.blur.strength",
      "mix.blur.softness",
      "mix.blur.falloff",
      "mix.blur.blend",
    ]));
    const delivery = controls.find((control) => control.target === "mix.exportAction");
    expect(delivery?.type).toBe("panelActions");
    if (delivery?.type !== "panelActions") throw new Error("Mix delivery actions are missing.");
    const actions = (delivery.actions ?? []).map((action) => typeof action === "string"
      ? { label: action, value: action }
      : action);
    expect(actions.map((action) => action.value)).toEqual([
      "export-mix-video",
      "export-mix-png",
      "copy-mix-png",
    ]);
    expect(actions.some((action) => /svg/i.test(`${action.label} ${action.value}`))).toBe(false);
  });

  it("declares complete acceptance and performance contracts", () => {
    expect(validateToolcraftAcceptanceCoverage(
      mixSchema,
      mixAcceptance,
      mixTransferMode,
      mixControlSectionInventory,
    )).toEqual([]);
    expect(validateToolcraftPerformanceCoverage(mixSchema, mixPerformance)).toEqual([]);
  });
});
