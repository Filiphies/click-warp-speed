import { defineToolcraft } from "@/toolcraft/runtime";

import { clipLabSchema } from "./clip-lab-schema";

export const mixControlSectionInventory = [
  { entity: "Source image", groupingReason: "Toolcraft owns upload, attached-file actions, and source transforms as the image stage feeding the invisible mask.", targets: ["clip.source"], title: "Image" },
  { entity: "Threshold source mask", groupingReason: "Threshold converts the runtime-owned source image into the invisible white clipping region.", targets: ["clip.threshold"], title: "Source Mask" },
  { entity: "Shared focal point", groupingReason: "Toolcraft promotes the direct-authored two-axis focal position for both rays and blur into its own section.", targets: ["clip.focus"], title: "Focus" },
  { entity: "Focus-oriented ray field", groupingReason: "Field shape, curl, count, wiggle, and uniform width jointly define the paths around the shared Focus before clipping.", targets: ["clip.fieldShape", "clip.curl", "clip.count", "clip.wiggle", "clip.width"], title: "Ray Field" },
  { entity: "Mask-derived path endpoints", groupingReason: "Edge noise and minimum length refine the final visible paths produced by mask subtraction.", targets: ["clip.edgeNoise", "clip.minLength"], title: "Path Ends" },
  { entity: "Per-path color distribution", groupingReason: "One compound gradient colors every finished ray from Focus outward.", targets: ["clip.gradient"], title: "Ray Gradient" },
  { entity: "Raster radial exposure", groupingReason: "Motion, exposure, focus area, and blend jointly apply Speed Blur to the completed ray frame.", targets: ["mix.blur.strength", "mix.blur.softness", "mix.blur.falloff", "mix.blur.blend"], title: "Blur" },
  { entity: "Periodic path playback", groupingReason: "Participation, speed, easing, stagger, overlap, and seed preserve the complete Speed Rays motion workflow.", targets: ["clip.motionActive", "clip.motionSpeed", "clip.motionEasingPresets", "clip.motionEasing", "clip.motionStagger", "clip.motionOverlap", "clip.motionSeed"], title: "Motion" },
  { entity: "Output background", groupingReason: "Include and color jointly control preview and still-export compositing.", targets: ["export.includeBackground", "clip.background"], title: "Background" },
  { workflowStage: "Still raster delivery", groupingReason: "Format and resolution configure PNG/JPG download and PNG clipboard output.", targets: ["export.image.format", "export.image.resolution"], title: "Image Export" },
  { workflowStage: "Animated raster delivery", groupingReason: "Format and resolution configure the deterministic encoded loop.", targets: ["export.video.format", "export.video.resolution"], title: "Video Export" },
] as const;

const baseSections = (clipLabSchema.panels.controls?.sections ?? [])
  .filter((section) => section.title !== "Setup");

const blurSection = {
  title: "Blur",
  controls: {
    strength: {
      type: "slider",
      target: "mix.blur.strength",
      label: "Motion",
      defaultValue: 64,
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
      orderRole: "detail",
      performanceRole: "responsiveness",
      description: "Sets how far the virtual camera travels during the radial exposure.",
      performanceReason: "Updates the radial sample path through one shader uniform.",
    },
    softness: {
      type: "slider",
      target: "mix.blur.softness",
      label: "Exposure",
      defaultValue: 72,
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
      orderRole: "detail",
      performanceRole: "responsiveness",
      description: "Balances a crisp ray frame with light gathered continuously along the camera move.",
      performanceReason: "Changes weighting and spacing inside the fixed six-sample exposure kernel.",
    },
    falloff: {
      type: "slider",
      target: "mix.blur.falloff",
      label: "Focus area",
      defaultValue: 32,
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
      orderRole: "detail",
      performanceRole: "responsiveness",
      description: "Sets the protected region around the shared focal point before streaking builds outward.",
      performanceReason: "Updates the protected radial focus mask through one shader uniform.",
    },
    blend: {
      type: "slider",
      target: "mix.blur.blend",
      label: "Blend",
      defaultValue: 100,
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
      orderRole: "detail",
      performanceRole: "responsiveness",
      description: "Mixes the radial exposure with the original crisp ray frame.",
      performanceReason: "Mixes two existing shader colors without changing sample count.",
    },
  },
} as const;

const deliverySection = {
  title: "Export",
  actionGroup: "primary",
  controls: {
    delivery: {
      type: "panelActions",
      target: "mix.exportAction",
      defaultValue: null,
      actions: [
        { icon: "upload-simple", label: "Export Video", value: "export-mix-video" },
        { icon: "upload-simple", label: "Export PNG", value: "export-mix-png" },
        { icon: "copy", label: "Copy PNG", value: "copy-mix-png" },
      ],
      performanceRole: "workload",
      performanceReason: "Replays the complete ray and radial-exposure pipeline at final raster dimensions.",
    },
  },
} as const;

const mixSections = baseSections.flatMap((section) => {
  if (section.title === "Motion") return [blurSection, section];
  if (section.title === "Export") return [deliverySection];
  return [section];
});

export const mixSchema = defineToolcraft({
  ...clipLabSchema,
  canvas: {
    ...clipLabSchema.canvas,
    renderScale: { defaultValue: 1, enabled: true, max: 2, min: 1, step: 0.25 },
    sizing: { mode: "editable-output" },
    upload: true,
  },
  panels: {
    ...clipLabSchema.panels,
    controls: {
      ...clipLabSchema.panels.controls,
      title: "Mix",
      sections: mixSections,
    },
    timeline: { enabled: true, mode: "playback", defaultDurationSeconds: 6 },
  },
  persistence: { storage: "none" },
  settingsTransfer: "auto",
});
