import { describe, expect, it } from "vitest";

import { clipLabSchema } from "./clip-lab-schema";
import {
  clipLabSandboxControlSectionInventory,
  clipLabSandboxSchema,
} from "./clip-lab-sandbox-schema";

function controlFor(schema: typeof clipLabSandboxSchema, target: string) {
  for (const section of schema.panels.controls?.sections ?? []) {
    for (const control of Object.values(section.controls)) {
      if (control.target === target) return control;
    }
  }
  throw new Error(`Missing control ${target}`);
}

describe("Speed Rays Sandbox schema", () => {
  it("is an independent playback product without layers or persistence", () => {
    expect(clipLabSandboxSchema.panels.controls?.title).toBe("Speed Rays Sandbox");
    expect(clipLabSandboxSchema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(clipLabSandboxSchema.panels.timeline).toMatchObject({
      defaultDurationSeconds: 6,
      enabled: true,
      mode: "playback",
    });
    expect(clipLabSandboxSchema.panels.layers).toBeUndefined();
    expect(clipLabSandboxSchema.persistence.storage).toBe("none");
  });

  it("adds bloom and noise while raising only the sandbox limits", () => {
    expect(controlFor(clipLabSandboxSchema, "clip.width")).toMatchObject({ max: 100, min: 0.5 });
    expect(controlFor(clipLabSandboxSchema, "clip.motionSpeed")).toMatchObject({ max: 100, min: 1 });
    expect(controlFor(clipLabSandboxSchema, "clip.bloomStrength")).toMatchObject({ defaultValue: 35, max: 100 });
    expect(controlFor(clipLabSandboxSchema, "clip.bloomRadius")).toMatchObject({ defaultValue: 18, max: 80 });
    expect(controlFor(clipLabSandboxSchema, "clip.noiseAmount")).toMatchObject({ defaultValue: 20, max: 100 });
    expect(controlFor(clipLabSandboxSchema, "clip.noiseScale")).toMatchObject({ defaultValue: 12, max: 64 });
    expect(controlFor(clipLabSandboxSchema, "clip.noiseSpeed")).toMatchObject({ defaultValue: 4, max: 20 });

    expect(controlFor(clipLabSchema as typeof clipLabSandboxSchema, "clip.width")).toMatchObject({ max: 5 });
    expect(controlFor(clipLabSchema as typeof clipLabSandboxSchema, "clip.motionSpeed")).toMatchObject({ max: 10 });
  });

  it("inventories every sandbox product setting exactly once", () => {
    const targets = clipLabSandboxControlSectionInventory.flatMap((section) => section.targets);
    expect(targets).toContain("clip.bloomStrength");
    expect(targets).toContain("clip.bloomRadius");
    expect(targets).toContain("clip.noiseAmount");
    expect(targets).toContain("clip.noiseScale");
    expect(targets).toContain("clip.noiseSpeed");
    expect(new Set(targets).size).toBe(targets.length);
  });
});
