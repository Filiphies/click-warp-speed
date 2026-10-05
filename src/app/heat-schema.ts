import { defineToolcraft } from "@/toolcraft/runtime";

export const appSchema = defineToolcraft({
  canvas: {
    enabled: true,
    renderScale: true,
    size: { height: 1080, unit: "px", width: 1920 },
    sizing: { mode: "intrinsic-media" },
    upload: true,
  },
  export: { png: { background: "transparent" } },
  panels: {
    controls: {
      title: "Thermal Vision Controls",
      sections: [
        {
          title: "Source",
          controls: {
            kind: {
              type: "segmented", target: "source.kind", label: "Source", defaultValue: "image",
              options: [{ label: "Image", value: "image" }, { label: "Video", value: "video" }],
              orderRole: "input", performanceRole: "responsiveness", performanceReason: "Chooses which decoded media source feeds the shared shader pipeline.",
            },
            image: {
              type: "fileDrop", target: "source.image", label: "Image", defaultValue: null,
              assetKind: "image", description: "Upload or paste an image from your clipboard anywhere in the app.",
              visibleWhen: { target: "source.kind", equals: "image" },
              orderRole: "input", performanceRole: "workload", performanceReason: "Source dimensions determine decode, texture upload, and shader workload.",
            },
            video: {
              type: "fileDrop", target: "source.video", label: "Video", defaultValue: null,
              assetKind: "file", accept: "video/*,.mp4,.webm,.mov", description: "Upload or paste a video; its frames and natural dimensions drive the same effect.",
              visibleWhen: { target: "source.kind", equals: "video" },
              orderRole: "input", performanceRole: "workload", performanceReason: "Video decode, texture upload, and frame rate determine animated shader workload.",
            },
          },
        },
        {
          title: "Effect",
          controls: {
            mode: {
              type: "segmented", target: "effect.mode", label: "Effect", defaultValue: "thermal",
              options: [{ label: "Thermal", value: "thermal" }, { label: "Dots", value: "dots" }],
              orderRole: "mode", performanceRole: "responsiveness", performanceReason: "Switches between thermal tone mapping and edge-sampled tracking dots.",
            },
            heat: {
              type: "slider", target: "thermal.heat", label: "Heat", defaultValue: 62, min: 0, max: 100, step: 1, unit: "%",
              visibleWhen: { target: "effect.mode", equals: "thermal" }, orderRole: "detail", performanceRole: "responsiveness", performanceReason: "Updates the shader luminance inversion and hot-region separation uniform.",
            },
            contrast: {
              type: "slider", target: "thermal.contrast", label: "Thermal Contrast", defaultValue: 72, min: 0, max: 100, step: 1, unit: "%",
              visibleWhen: { target: "effect.mode", equals: "thermal" }, orderRole: "detail", performanceRole: "responsiveness", performanceReason: "Updates the shader tonal contrast uniform.",
            },
            detail: {
              type: "slider", target: "thermal.detail", label: "Detail", defaultValue: 58, min: 0, max: 100, step: 1, unit: "%",
              description: "Boosts bright outlines around thermal boundaries.", visibleWhen: { target: "effect.mode", equals: "thermal" }, orderRole: "detail",
              performanceRole: "responsiveness", performanceReason: "Updates the shader edge-enhancement uniform.",
            },
            density: {
              type: "slider", target: "dots.density", label: "Dots Density", defaultValue: 52, min: 16, max: 96, step: 1,
              visibleWhen: { target: "effect.mode", equals: "dots" }, orderRole: "detail", performanceRole: "workload", performanceReason: "Changes the edge-sampling grid spacing and marker frequency in the shader.",
            },
            size: {
              type: "slider", target: "dots.size", label: "Dots Size", defaultValue: 42, min: 10, max: 100, step: 1, unit: "%",
              visibleWhen: { target: "effect.mode", equals: "dots" }, orderRole: "detail", performanceRole: "workload", performanceReason: "Changes the number of fragment pixels covered by tracking markers.",
            },
            threshold: {
              type: "slider", target: "dots.threshold", label: "Dots Threshold", defaultValue: 38, min: 0, max: 100, step: 1, unit: "%",
              visibleWhen: { target: "effect.mode", equals: "dots" }, orderRole: "detail", performanceRole: "responsiveness", performanceReason: "Controls which image boundaries receive tracking markers.",
            },
            amount: {
              type: "slider", target: "dots.amount", label: "Dots Amount", defaultValue: 64, min: 0, max: 100, step: 1, unit: "%",
              description: "Raises marker probability and admits weaker edges for denser tracking.", visibleWhen: { target: "effect.mode", equals: "dots" }, orderRole: "detail",
              performanceRole: "workload", performanceReason: "Changes marker acceptance probability and total fragment coverage.",
            },
            evenness: {
              type: "slider", target: "dots.evenness", label: "Evenness", defaultValue: 42, min: 0, max: 100, step: 1, unit: "%",
              description: "Pulls dots toward more consistent spacing while keeping a slight organic offset.", visibleWhen: { target: "effect.mode", equals: "dots" }, orderRole: "detail",
              performanceRole: "responsiveness", performanceReason: "Changes marker positions through one shader uniform without changing source decode or marker count.",
            },
            color: {
              type: "color", target: "dots.color", label: "Dots Color", defaultValue: "#FF5A24",
              visibleWhen: { target: "effect.mode", equals: "dots" }, orderRole: "detail", performanceRole: "responsiveness", performanceReason: "Changes tracking marker color in preview and export.",
            },
            colorBleed: {
              type: "slider", target: "base.colorBleed", label: "Color Bleed", defaultValue: 0, min: 0, max: 100, step: 1, unit: "%",
              description: "Lets original source colors show through the monochrome treatment while preserving dots and glow.", orderRole: "detail",
              performanceRole: "responsiveness", performanceReason: "Mixes source color into the processed base through one shader uniform.",
            },
          },
        },
        {
          title: "Base Image",
          controls: {
            blur: {
              type: "slider", target: "base.blur", label: "Blur", defaultValue: 0, min: 0, max: 100, step: 1, unit: "%",
              description: "Softens only the underlying image; dots, glow, grain, and scan lines stay sharp.", orderRole: "detail",
              performanceRole: "workload", performanceReason: "Changes the base-image multi-sample blur radius in the shader.",
            },
            pathBlur: {
              type: "slider", target: "base.pathBlur", label: "Path Blur", defaultValue: 0, min: 0, max: 100, step: 1, unit: "%",
              description: "Adds a directional trail to only the underlying image.", orderRole: "detail",
              performanceRole: "workload", performanceReason: "Changes the base-image directional sampling distance.",
            },
            pathAngle: {
              type: "slider", target: "base.pathAngle", label: "Angle", defaultValue: 0, min: -180, max: 180, step: 1, unit: "°",
              orderRole: "detail", performanceRole: "responsiveness", performanceReason: "Rotates the base-image path blur sampling vector without changing sample count.",
            },
          },
        },
        {
          title: "Sensor Texture",
          controls: {
            grain: {
              type: "slider", target: "thermal.grain", label: "Grain", defaultValue: 38, min: 0, max: 100, step: 1, unit: "%",
              orderRole: "detail", performanceRole: "responsiveness", performanceReason: "Updates procedural sensor-noise amplitude in the shader.",
            },
            bloom: {
              type: "slider", target: "thermal.bloom", label: "Bloom", defaultValue: 42, min: 0, max: 100, step: 1, unit: "%",
              orderRole: "detail", performanceRole: "responsiveness", performanceReason: "Changes the hazy highlight and tracking-dot halo in the shader.",
            },
            scanlines: {
              type: "slider", target: "thermal.scanlines", label: "Scan Lines", defaultValue: 22, min: 0, max: 100, step: 1, unit: "%",
              orderRole: "detail", performanceRole: "responsiveness", performanceReason: "Updates horizontal sensor-line strength in the shader.",
            },
          },
        },
        {
          title: "Background",
          controls: {
            includeBackground: {
              type: "switch", target: "export.includeBackground", label: "Include", defaultValue: true,
              orderRole: "mode", performanceRole: "responsiveness", performanceReason: "Changes preview and exported image background compositing.",
            },
            background: {
              type: "color", target: "scene.background", label: false, defaultValue: "#050706",
              orderRole: "color", performanceRole: "responsiveness", performanceReason: "Changes the background behind the processed image.",
            },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["includeBackground", "background"] }],
        },
        {
          title: "Image Export",
          controls: {
            imageFormat: {
              type: "select", target: "export.image.format", label: "Format", defaultValue: "png",
              options: [{ label: "PNG", value: "png" }, { label: "JPG", value: "jpg" }], orderRole: "mode",
              performanceRole: "responsiveness", performanceReason: "Selects the still image encoder.",
            },
            imageResolution: {
              type: "select", target: "export.image.resolution", label: "Resolution", defaultValue: "4k",
              options: [{ label: "2K", value: "2k" }, { label: "4K", value: "4k" }, { label: "8K", value: "8k" }], orderRole: "mode",
              performanceRole: "workload", performanceReason: "Changes final raster dimensions and export workload.",
            },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["imageFormat", "imageResolution"] }],
        },
        {
          title: "Video Export",
          controls: {
            videoFormat: {
              type: "select", target: "export.video.format", label: "Format", defaultValue: "mp4",
              options: [{ label: "MP4", value: "mp4" }, { label: "WebM", value: "webm" }], orderRole: "mode",
              performanceRole: "responsiveness", performanceReason: "Selects the preferred supported browser video container.",
            },
            videoResolution: {
              type: "select", target: "export.video.resolution", label: "Resolution", defaultValue: "current",
              options: [{ label: "Current", value: "current" }, { label: "4K", value: "4k" }], orderRole: "mode",
              performanceRole: "workload", performanceReason: "Changes encoded frame dimensions and video export workload.",
            },
          },
          layoutGroups: [{ layout: "inline", columns: 2, controls: ["videoFormat", "videoResolution"] }],
        },
        {
          title: "Export", actionGroup: "primary",
          controls: {
            delivery: {
              type: "panelActions", target: "export.actions", defaultValue: null,
              actions: [{ icon: "upload-simple", label: "Export Video", value: "export-video" }, { icon: "upload-simple", label: "Export PNG", value: "export-png" }],
              performanceRole: "workload", performanceReason: "Renders and encodes the selected full-resolution still or timeline video output.",
            },
          },
        },
      ],
    },
    timeline: { enabled: true, mode: "playback", defaultDurationSeconds: 6 },
  },
  persistence: { storage: "none" },
  settingsTransfer: "auto",
  toolbar: { history: true, radar: true, theme: true, zoom: true },
});
