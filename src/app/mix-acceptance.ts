import type { ToolcraftComponentAcceptance, ToolcraftTransferMode } from "./app-acceptance";

const editorBrowserTest = "browser: mix combines Speed Rays geometry with Speed Blur pixels";
const motionBrowserTest = "browser: mix timeline animates the blurred ray frame";
const deliveryBrowserTest = "browser: mix delivers current-frame raster and video output without SVG actions";

function mixRow(
  id: string,
  componentType: string,
  options: Partial<ToolcraftComponentAcceptance> = {},
): ToolcraftComponentAcceptance {
  return {
    automated: true,
    automatedTestName: `${id} maps through runtime state to Mix output`,
    browser: true,
    browserTestName: editorBrowserTest,
    componentType,
    evidence: "product-output",
    expectedObservable: `Changing ${id} changes the two-stage ray and radial-blur result without moving the canvas viewport.`,
    fixture: "A full-HD high-contrast mask with a curved 320-ray field and the default radial exposure.",
    id,
    kind: "control",
    target: id,
    userAction: `Change ${id} through its visible Toolcraft control and compare final Mix pixels.`,
    ...options,
  };
}

export const mixTransferMode: ToolcraftTransferMode = {
  animationIntent: {
    loopDuration: {
      evidence: "Mix preserves Speed Rays' accepted six-second seamless forward replacement cycle and applies Blur to each deterministic timeline frame.",
      seconds: 6,
      source: "product-derived",
    },
    mode: "timeline-playback",
  },
  mode: "new-toolcraft-app",
};

export const mixAcceptance: readonly ToolcraftComponentAcceptance[] = [
  mixRow("clip.source", "fileDrop", {
    evidence: "media-lifecycle",
    expectedObservable: "Uploading or importing an image creates the invisible threshold mask; 90° rotate and horizontal/vertical flip runtime media transforms alter preview and export, clear/remove returns to the empty canvas, and Reset controls removes uploaded source media.",
    userAction: "Upload or paste a mask, use 90°, Flip H, and Flip V, then clear it and use Reset while comparing Mix output.",
  }),
  mixRow("clip.threshold", "slider"),
  mixRow("clip.focus", "vector", {
    controlPartCoverage: ["vector.x", "vector.y"],
    expectedObservable: "Both Focus axes jointly move ray convergence, per-path gradient orientation, and the radial-blur origin.",
  }),
  mixRow("clip.fieldShape", "select", {
    optionCoverage: ["straight", "whirlpool", "sweep", "wave"],
  }),
  mixRow("clip.curl", "slider"),
  mixRow("clip.count", "slider"),
  mixRow("clip.wiggle", "slider"),
  mixRow("clip.width", "slider"),
  mixRow("clip.edgeNoise", "slider"),
  mixRow("clip.minLength", "slider"),
  mixRow("clip.gradient", "gradient", {
    controlPartCoverage: ["gradient.gradientType", "gradient.angle", "gradient.stops.position", "gradient.stops.color", "gradient.stops.opacity"],
  }),
  mixRow("mix.blur.strength", "slider"),
  mixRow("mix.blur.softness", "slider"),
  mixRow("mix.blur.falloff", "slider"),
  mixRow("mix.blur.blend", "slider"),
  mixRow("clip.motionActive", "slider", { browserTestName: motionBrowserTest }),
  mixRow("clip.motionSpeed", "slider", { browserTestName: motionBrowserTest }),
  mixRow("clip.motionEasingPresets", "actions", {
    actionCoverage: ["easing-preset-linear", "easing-preset-in", "easing-preset-out", "easing-preset-in-out"],
    browserTestName: motionBrowserTest,
  }),
  mixRow("clip.motionEasing", "curves", {
    browserTestName: motionBrowserTest,
    controlPartCoverage: ["curves.points"],
  }),
  mixRow("clip.motionStagger", "slider", { browserTestName: motionBrowserTest }),
  mixRow("clip.motionOverlap", "slider", { browserTestName: motionBrowserTest }),
  mixRow("clip.motionSeed", "slider", { browserTestName: motionBrowserTest }),
  mixRow("export.includeBackground", "switch", {
    browserTestName: deliveryBrowserTest,
    evidence: "exported-bytes",
    expectedObservable: "Disabling Include makes PNG output transparent, hides the live preview product background, and keeps video output with the product background.",
  }),
  mixRow("clip.background", "color", { browserTestName: deliveryBrowserTest, evidence: "exported-bytes" }),
  mixRow("export.image.format", "select", {
    browserTestName: deliveryBrowserTest,
    evidence: "exported-bytes",
    optionCoverage: ["png", "jpg"],
  }),
  mixRow("export.image.resolution", "select", {
    browserTestName: deliveryBrowserTest,
    evidence: "exported-bytes",
    optionCoverage: ["2k", "4k", "8k"],
  }),
  mixRow("export.video.format", "select", {
    browserTestName: deliveryBrowserTest,
    evidence: "exported-bytes",
    optionCoverage: ["mp4", "webm"],
  }),
  mixRow("export.video.resolution", "select", {
    browserTestName: deliveryBrowserTest,
    evidence: "exported-bytes",
    optionCoverage: ["current", "2x", "4k"],
  }),
  mixRow("mix.exportAction", "panelActions", {
    actionCoverage: ["export-mix-video", "export-mix-png", "copy-mix-png"],
    browserTestName: deliveryBrowserTest,
    evidence: "exported-bytes",
    expectedObservable: "Export PNG and Copy PNG capture the current blurred timeline frame, Export Video encodes the forward loop with progress, and no SVG action is present.",
    userAction: "Use every visible sticky action, inspect current-frame raster/video bytes and progress, and confirm SVG actions are absent.",
  }),
  {
    automated: true,
    automatedTestName: "Mix renderer composites clipped ray frames through the radial exposure shader",
    browser: true,
    browserTestName: editorBrowserTest,
    componentType: "canvas-renderer",
    evidence: "rendered-pixels",
    expectedObservable: "The completed Speed Rays frame is rasterized once and post-processed by Speed Blur with shared focus, full opacity, background, and render-scale parity.",
    fixture: "Every field shape at Blend 0 and 100 with Motion, Exposure, and Focus area extremes.",
    id: "renderer.mix",
    kind: "runtime",
    userAction: "Upload the mask and compare crisp and blurred final pixels while changing all four Blur controls.",
  },
  {
    automated: true,
    automatedTestName: "Mix canvas focus handle edits the shared focal point",
    browser: true,
    browserTestName: editorBrowserTest,
    componentType: "canvas-handle",
    evidence: "rendered-pixels",
    expectedObservable: "Dragging the textless handle changes both ray convergence and the radial exposure origin while remaining absent from exports.",
    fixture: "Default radial field with visible off-center focus movement.",
    id: "renderer.mix.focusHandle",
    kind: "runtime",
    target: "clip.focus",
    userAction: "Drag the Mix focus handle across both axes and compare final pixels and exported output.",
  },
  {
    automated: true,
    automatedTestName: "Mix playback drives one seamless forward blurred ray loop",
    browser: true,
    browserTestName: motionBrowserTest,
    componentType: "timeline",
    evidence: "timeline-output",
    expectedObservable: "Play and pause, scrub, and edit timeline duration while the blurred ray frame updates. After the duration changes, motion advances in one direction, the first and last frames stitch without a visible jump, and no mirror, yoyo, ping-pong, or reverse fallback is used.",
    fixture: "Six-second Wave field with 100% animated paths and 50% overlap.",
    id: "timeline.playback",
    kind: "runtime",
    target: "timeline.playback",
    timelineCoverage: "playback",
    timelinePlaybackCoverage: ["pause-resume", "scrub", "duration", "loop", "rendered-frame"],
    userAction: "Play, pause, scrub, change duration, and compare the first and wrapped final blurred frames.",
  },
];
