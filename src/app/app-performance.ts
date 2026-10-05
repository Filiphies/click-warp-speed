import {
  defineToolcraftPerformance,
  type ToolcraftPerformanceConfig,
  type ToolcraftPerformanceInteraction,
  type ToolcraftPerformanceValueSet,
} from "@/toolcraft/runtime";

const commonBudget = { maxFrameGapMs: 120, maxInteractionMs: 1200, maxLongTaskMs: 180 } as const;

const heavyBaseline = {
  kind: "custom",
  reason: "The deploy baseline combines a full-HD canvas, 1200 rays, 100% animated paths, and maximum bounded overlap.",
  value: { count: 1200, height: 1080, motionActive: 100, overlap: 70, width: 1920 },
  loadProfile: {
    hardLimit: { count: 1200, height: 1080, motionActive: 100, overlap: 70, width: 1920 },
    metric: "custom",
    smoothTarget: { count: 1200, height: 1080, motionActive: 100, overlap: 70, width: 1920 },
    smoothTargetRatio: 1,
    target: "clip.preview",
    userFacingRange: "fully-guaranteed",
  },
} as const;

const fullHdMedia = {
  kind: "media",
  reason: "A full-HD threshold source is the practical maximum source-mask baseline for the proof of concept.",
  value: { height: 1080, width: 1920 },
  loadProfile: {
    hardLimit: { height: 1080, width: 1920 },
    metric: "media-area",
    smoothTarget: { height: 1080, width: 1920 },
    smoothTargetRatio: 1,
    target: "clip.source",
    userFacingRange: "fully-guaranteed",
  },
} as const;

function responsive(
  id: string,
  target: string,
  label: string,
  interaction: "control-change" | "control-drag" = "control-change",
) {
  return {
    automated: true,
    automatedTestName: `perf: ${target} remains responsive`,
    browser: true,
    browserTestName: `browser perf: ${target} remains responsive`,
    budget: commonBudget,
    controlLabel: label,
    expectedObservable: `${label} updates the bounded SVG trail result without moving the canvas viewport.`,
    fixture: "Full-HD curved mask with the default 320-ray field.",
    id,
    interaction,
    target,
    workload: false,
  } as const;
}

function workload(
  id: string,
  target: string,
  label: string,
  interaction: "control-change" | "control-drag",
  values: ToolcraftPerformanceValueSet,
  stressValue: unknown,
  hardLimit: unknown = stressValue,
) {
  return {
    automated: true,
    automatedTestName: `perf: ${target} workload is covered`,
    browser: true,
    browserTestName: `browser perf: ${target} workload is covered`,
    budget: commonBudget,
    controlLabel: label,
    expectedObservable: `${label} reaches its declared heavy value while the full-HD SVG preview remains responsive.`,
    fixture: "Full-HD threshold source with the maximum bounded animated ray field.",
    id,
    interaction,
    stressFixture: {
      kind: "max-value",
      reason: `${String(stressValue)} is the heaviest exposed ${label} value for this product path.`,
      value: stressValue,
      loadProfile: {
        hardLimit,
        metric: "custom",
        smoothTarget: stressValue,
        smoothTargetRatio: 1,
        target,
        userFacingRange: "fully-guaranteed",
      },
    },
    target,
    values,
    workload: true,
    workloadFixture: heavyBaseline,
  } as const;
}

function stressScenario(
  id: string,
  interaction: ToolcraftPerformanceInteraction,
  browserTestName: string,
  expectedObservable: string,
  extra: Record<string, unknown> = {},
) {
  return {
    automated: true,
    automatedTestName: `perf: ${id}`,
    browser: true,
    browserTestName,
    budget: interaction === "preview-render"
      ? { maxLongTaskMs: 180, maxPreviewMs: 1800 }
      : interaction === "animation-frame" || interaction === "timeline-playback"
        ? { maxFrameGapMs: 120, maxLongTaskMs: 180 }
        : interaction === "viewport-stability"
          ? { maxFrameGapMs: 120 }
          : { maxFrameGapMs: 120, maxInteractionMs: 1600, maxLongTaskMs: 180 },
    expectedObservable,
    fixture: "Full-HD 1200-ray Whirlpool at 100% participation, 70% overlap, and Speed 10.",
    id,
    interaction,
    stress: true,
    stressFixture: heavyBaseline,
    workload: false,
    ...extra,
  };
}

export const appPerformance: ToolcraftPerformanceConfig = defineToolcraftPerformance({
  browserCheckPolicy: {
    preferredRunner: "agent-browser",
    fallbackRunner: "playwright",
    fallbackWhen: ["agent-browser-unavailable", "ci"],
  },
  rendererStrategy: "svg",
  rendererWorkload: "vector-output",
  rendererTechnique: {
    sourceRepresentation: "mixed",
    productRepresentation: "vector",
    previewRenderer: "svg",
    exportRenderer: "webcodecs",
    rendererWorkload: "vector-output",
    rendererStrategy: "svg",
    intentionalRasterizationReason: "PNG/JPG and video delivery intentionally rasterize the accepted native SVG geometry; preview, Copy SVG, and animated SVG remain vector.",
    previewExportDifferenceReason: "Preview and SVG delivery retain native paths; still raster output uses the selected image resolution and video replays the same paths at fixed timestamps through Canvas 2D/WebCodecs.",
    fidelityRisks: ["The bounded threshold lookup can stair-step source details smaller than its sampling resolution; cubic path geometry and true mask-derived endpoints are preserved after extraction."],
    performanceRisks: ["Maximum Count combined with 100% participation and 70% Overlap creates the highest bounded SVG path-copy count; 8K still and 4K video encoding are export-only workloads."],
    whyNotAlternativeStrategies: [
      "A final SVG clipPath would keep hidden full rays and apply gradients over the wrong interval instead of producing separate result paths.",
      "Canvas-only preview would discard the separate editable SVG path result required by the product.",
      "WebGL can accelerate mask thresholding but would turn the final vector path field into pixels.",
    ],
    layers: [
      { id: "background", kind: "background", renderer: "svg", primitiveCount: "low", content: ["composite"], exportMode: "composited", uiSelector: "[data-toolcraft-product-output]" },
      { id: "paths", kind: "product-foreground", renderer: "svg", primitiveCount: "high", content: ["geometry", "dense-pattern"], exportMode: "included", uiSelector: "[data-toolcraft-product-output]" },
      { id: "delivery", kind: "export-composite", renderer: "canvas-2d", primitiveCount: "high", content: ["geometry", "composite"], exportMode: "composited", intentionalRasterizationReason: "Raster and video actions replay the same native path model at the requested output dimensions." },
    ],
  },
  rendererPipeline: {
    passes: [
      { id: "source-decode", kind: "decode", runsOn: "main", output: "source", quality: "full", inputs: ["clip.source", "mediaAssets[].transform"], invalidatedBy: ["clip.source", "mediaAssets[].transform"], cacheKey: ["clip.source.dataUrl", "mediaAssets[].transform"] },
      { id: "threshold-mask", kind: "pixel-transform", runsOn: "gpu", output: "intermediate", quality: "preview", inputs: ["source-decode", "clip.threshold", "canvas.size"], invalidatedBy: ["source-decode", "clip.threshold", "canvas.size"], cacheKey: ["clip.source.dataUrl", "clip.threshold", "canvas.size"] },
      { id: "path-model", kind: "vector-build", runsOn: "main", output: "intermediate", quality: "full", inputs: ["threshold-mask", "clip.focus", "clip.fieldShape", "clip.curl", "clip.count", "clip.wiggle", "clip.edgeNoise", "clip.minLength"], invalidatedBy: ["threshold-mask", "clip.focus", "clip.fieldShape", "clip.curl", "clip.count", "clip.wiggle", "clip.edgeNoise", "clip.minLength"], cacheKey: ["threshold-mask", "clip.focus", "clip.fieldShape", "clip.curl", "clip.count", "clip.wiggle", "clip.edgeNoise", "clip.minLength"] },
      { id: "svg-preview", kind: "composite", runsOn: "main", output: "preview", quality: "retina", inputs: ["path-model", "clip.width", "clip.gradient", "clip.background", "export.includeBackground"], invalidatedBy: ["path-model", "clip.width", "clip.gradient", "clip.background", "export.includeBackground"], cacheKey: ["path-model", "clip.width", "clip.gradient"] },
      { id: "motion-frame", kind: "composite", runsOn: "main", output: "overlay", quality: "retina", inputs: ["path-model", "clip.motionActive", "clip.motionSpeed", "clip.motionEasing", "clip.motionStagger", "clip.motionOverlap", "clip.motionSeed", "timeline.playback"], invalidatedBy: ["clip.motionActive", "clip.motionSpeed", "clip.motionEasing", "clip.motionStagger", "clip.motionOverlap", "clip.motionSeed", "timeline.playback"], cacheKey: ["path-model", "clip.motionActive", "clip.motionStagger", "clip.motionOverlap", "clip.motionSeed"] },
      { id: "still-export", kind: "export", runsOn: "export-only", output: "export", quality: "export", inputs: ["svg-preview", "motion-frame", "export.image.*", "clip.copyActions"], invalidatedBy: ["export.image.format", "export.image.resolution", "clip.copyActions"], cacheKey: ["path-model", "clip.gradient", "timeline.playback"] },
      { id: "video-export", kind: "export", runsOn: "export-only", output: "export", quality: "export", inputs: ["path-model", "motion-frame", "export.video.*", "clip.copyActions"], invalidatedBy: ["export.video.format", "export.video.resolution", "clip.copyActions"], cacheKey: ["path-model", "clip.gradient", "clip.motionActive", "clip.motionStagger", "clip.motionOverlap", "clip.motionSeed"] },
    ],
    interactionInvalidation: [
      { interaction: "media-import", targets: ["clip.source"], invalidates: ["source-decode", "threshold-mask", "path-model", "svg-preview", "motion-frame"], mustNotInvalidate: ["still-export", "video-export"] },
      { interaction: "control-drag", targets: ["clip.threshold", "clip.curl", "clip.count", "clip.wiggle", "clip.width", "clip.edgeNoise", "clip.minLength", "clip.motionActive", "clip.motionSpeed", "clip.motionStagger", "clip.motionOverlap", "clip.motionSeed"], invalidates: ["path-model", "svg-preview", "motion-frame"], mustNotInvalidate: ["source-decode", "still-export", "video-export"] },
      { interaction: "control-change", targets: ["clip.source", "clip.focus", "clip.fieldShape", "clip.gradient", "clip.motionEasingPresets", "clip.motionEasing", "export.includeBackground", "clip.background", "export.image.format", "export.image.resolution", "export.video.format", "export.video.resolution", "clip.copyActions"], invalidates: ["svg-preview", "motion-frame"], mustNotInvalidate: ["source-decode"] },
      { interaction: "animation-frame", targets: ["clip.motionActive", "clip.motionSpeed", "clip.motionEasing", "clip.motionStagger", "clip.motionOverlap", "clip.motionSeed", "timeline.playback"], invalidates: ["motion-frame"], mustNotInvalidate: ["source-decode", "threshold-mask", "path-model"] },
      { interaction: "timeline-playback", targets: ["timeline.playback"], invalidates: ["motion-frame"], mustNotInvalidate: ["source-decode", "threshold-mask", "path-model"] },
      { interaction: "viewport-drag", targets: ["canvas.viewport"], invalidates: [], mustNotInvalidate: ["source-decode", "threshold-mask", "path-model", "svg-preview", "motion-frame"] },
      { interaction: "viewport-zoom", targets: ["canvas.zoom"], invalidates: [], mustNotInvalidate: ["source-decode", "threshold-mask", "path-model", "svg-preview", "motion-frame"] },
      { interaction: "export", targets: ["export.image.resolution", "export.video.resolution", "clip.copyActions"], invalidates: ["still-export", "video-export"], mustNotInvalidate: ["source-decode", "threshold-mask", "path-model"] },
    ],
  },
  scenarios: [
    {
      automated: true,
      automatedTestName: "perf: clip.source media import is covered",
      browser: true,
      browserTestName: "browser perf: clip.source media import is covered",
      budget: commonBudget,
      controlLabel: "Image",
      expectedObservable: "A full-HD source decodes, thresholds, and produces separate paths without changing the canvas viewport.",
      fixture: "1920×1080 high-contrast curved SVG mask.",
      id: "source-import",
      interaction: "media-import",
      stressFixture: fullHdMedia,
      target: "clip.source",
      workload: true,
    },
    {
      ...workload("source-values", "clip.source", "Image", "control-change", { min: null, default: null, max: { height: 1080, width: 1920 } }, { height: 1080, width: 1920 }),
      stressFixture: fullHdMedia,
    },
    workload("ray-count", "clip.count", "Count", "control-drag", { min: 32, default: 320, max: 1200 }, 1200),
    workload("minimum-length", "clip.minLength", "Min length", "control-drag", { min: 0, default: 12, max: 200 }, 0, 0),
    workload("motion-active", "clip.motionActive", "Animated paths", "control-drag", { min: 0, default: 65, max: 100 }, 100),
    workload("motion-overlap", "clip.motionOverlap", "Overlap", "control-drag", { min: 0, default: 0, max: 70 }, 70),
    workload("image-resolution", "export.image.resolution", "Image resolution", "control-change", { min: "2k", default: "4k", max: "8k" }, "8k"),
    workload("video-resolution", "export.video.resolution", "Video resolution", "control-change", { min: "current", default: "current", max: "4k" }, "4k"),
    workload("delivery-actions", "clip.copyActions", "Delivery", "control-change", { min: "copy-clip-svg", default: "copy-clip-png", max: "export-clip-video" }, "export-clip-video"),
    responsive("threshold", "clip.threshold", "Threshold", "control-drag"),
    responsive("focus", "clip.focus", "Focus"),
    responsive("shape", "clip.fieldShape", "Shape"),
    responsive("curl", "clip.curl", "Curl", "control-drag"),
    responsive("wiggle", "clip.wiggle", "Wiggle", "control-drag"),
    responsive("width", "clip.width", "Width", "control-drag"),
    responsive("edge-noise", "clip.edgeNoise", "Edge noise", "control-drag"),
    responsive("gradient", "clip.gradient", "Ray gradient"),
    responsive("motion-speed", "clip.motionSpeed", "Speed", "control-drag"),
    responsive("motion-presets", "clip.motionEasingPresets", "Easing presets"),
    responsive("motion-easing", "clip.motionEasing", "Easing"),
    responsive("motion-stagger", "clip.motionStagger", "Stagger", "control-drag"),
    responsive("motion-seed", "clip.motionSeed", "Seed", "control-drag"),
    responsive("background-include", "export.includeBackground", "Background Include"),
    responsive("background-color", "clip.background", "Background"),
    responsive("image-format", "export.image.format", "Image format"),
    responsive("video-format", "export.video.format", "Video format"),
    stressScenario("maximum Clip Lab preview stays under budget", "preview-render", "browser perf: clip lab renders maximum rays at full-HD", "The full-HD maximum field is visible with bounded periodic copies.", { uiSelector: "[data-toolcraft-product-output]" }),
    stressScenario("Clip Lab animation frames stay under budget", "animation-frame", "browser perf: clip lab animation frames stay under budget", "Maximum periodic overlap advances without rebuilding static cubic paths.", { uiSelector: "[data-toolcraft-product-output]" }),
    stressScenario("Clip Lab animation viewport drag stays stable", "animation-viewport-drag", "browser perf: clip lab animation viewport drag stays stable", "Dragging the viewport during playback coalesces non-essential work without changing playback state.", { target: "canvas.viewport" }),
    stressScenario("Clip Lab viewport zoom stays stable", "viewport-zoom-stress", "browser perf: clip lab viewport zoom stays stable", "Toolbar zoom preserves the maximum animated SVG field and frame cadence.", { target: "canvas.zoom" }),
    {
      automated: true,
      automatedTestName: "perf: Clip Lab viewport state stays stable",
      browser: true,
      browserTestName: "browser perf: clip lab viewport state stays stable",
      budget: { maxFrameGapMs: 120 },
      expectedObservable: "Product controls preserve canvas zoom and offset.",
      fixture: "Default Clip Lab field at an authored zoom and offset.",
      id: "viewport-stability",
      interaction: "viewport-stability",
      target: "canvas.viewport",
      workload: false,
    },
    {
      automated: true,
      automatedTestName: "perf: Clip Lab timeline playback stays under budget",
      browser: true,
      browserTestName: "browser perf: clip lab timeline playback stays under budget",
      budget: { maxFrameGapMs: 120, maxLongTaskMs: 180 },
      controlLabel: "Play playback",
      expectedObservable: "The maximum periodic train advances through the Toolcraft timeline with a seamless forward loop.",
      fixture: "Full-HD 1200-ray maximum motion state.",
      id: "timeline-playback",
      interaction: "timeline-playback",
      target: "timeline.playback",
      workload: false,
    },
    {
      automated: true,
      automatedTestName: "perf: Clip Lab export stays under budget",
      browser: true,
      browserTestName: "browser perf: clip lab export stays under budget",
      budget: { maxExportMs: 8000 },
      expectedObservable: "The delivery action serializes current-frame vector or selected-resolution raster/video output with progress.",
      fixture: "Maximum path field with 8K still and 4K video choices available.",
      id: "export-copy",
      interaction: "export-copy",
      stressFixture: heavyBaseline,
      target: "clip.copyActions",
      workload: false,
    },
  ],
  usesCustomRenderer: true,
  workloadTargets: ["clip.source", "clip.count", "clip.minLength", "clip.motionActive", "clip.motionOverlap", "export.image.resolution", "export.video.resolution", "clip.copyActions"],
});
