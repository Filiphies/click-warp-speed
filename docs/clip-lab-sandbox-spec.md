# Speed Rays Sandbox — Product Spec

Verification tier: Tier 3
Reason: Add an independent product route and schema plus a custom SVG/Canvas renderer variant with new timeline-driven styling controls; the shared Toolcraft runtime and the existing `/clip-lab` product remain unchanged.
Run: `npm run verify:quick`, focused sandbox schema/unit coverage, focused `/clip-lab/sandbox` browser acceptance for upload, expanded limits, bloom, noise, timeline, still/video delivery, and targeted maximum-style animation/viewport scenarios.
Skip: The full performance checkpoint is not required for this post-first-working feature variant; targeted scenarios cover the new bloom/noise and expanded-limit paths.

## Goal

Create an independent copy of Speed Rays at `/clip-lab/sandbox`. The existing `/clip-lab` route, schema, renderer defaults, limits, and delivery behavior remain unchanged. The sandbox keeps the accepted Speed Rays workflow while adding much wider strokes, much faster motion, bloom, and deterministic animated noise.

## Product behavior

- Preserve the existing source-mask, focus, ray-field, path-end, gradient, timeline, background, still export, video export, animated SVG, and clipboard workflows.
- Increase Width from the original `0.5–5px` range to `0.5–100px`.
- Increase Speed from the original `1–10` cycles-per-loop range to `1–100`.
- Add Bloom with:
  - Strength `0–100%`, default `35%`.
  - Radius `0–80px`, default `18px`.
- Add animated Noise with:
  - Amount `0–100%`, default `20%`.
  - Scale `1–64`, default `12`, controlling how many neighboring rays share a noise band.
  - Speed `0–20`, default `4`, controlling deterministic noise changes per timeline loop.
- Noise modulates ray luminance/opacity through smooth deterministic value noise keyed by path identity and Toolcraft timeline phase. The first and last frames stitch, pausing freezes it, and still export captures the current phase.
- Bloom draws a blurred duplicate beneath the crisp ray field. Preview, raster stills, video, copied raster output, copied SVG, and animated SVG preserve the chosen styling.
- No source placeholder, layers, persistence, custom controls, or route-local editor chrome.

## Control section inventory

- Source Mask — `clip.source`, `clip.threshold`.
- Ray Field — `clip.focus`, `clip.fieldShape`, `clip.curl`, `clip.count`, `clip.wiggle`, `clip.width`.
- Path Ends — `clip.edgeNoise`, `clip.minLength`.
- Ray Gradient — `clip.gradient`.
- Bloom — `clip.bloomStrength`, `clip.bloomRadius`.
- Noise — `clip.noiseAmount`, `clip.noiseScale`, `clip.noiseSpeed`.
- Motion — existing motion targets and easing preset actions.
- Background — `export.includeBackground`, `clip.background`.
- Image Export — `export.image.format`, `export.image.resolution`.
- Video Export — `export.video.format`, `export.video.resolution`.
- Sticky delivery — sandbox-specific action values so the new route cannot dispatch the original route’s handlers accidentally.

All new settings use built-in continuous sliders. Large precision ranges remain visually continuous.

## Animation intent

- Mode: Toolcraft playback timeline.
- Loop: seamless forward-only.
- Duration: preserve the existing product-derived six-second default.
- Ray movement: preserve existing periodic dash-window motion.
- Noise: deterministic timeline-driven styling, not autonomous wall-clock animation.
- Export Video remains tied to the Toolcraft timeline and fixed frame timestamps.

## Renderer technique and pipeline

- Preview remains native SVG because rays and copied SVG output are vector paths.
- Bloom is a bounded SVG Gaussian-blur duplicate behind the crisp path group.
- Noise is a per-path style multiplier computed from deterministic smooth value noise. It changes only presentation, not mask extraction or path geometry.
- Raster still/video replay the same style multipliers and bloom through Canvas 2D.
- Static/current-frame SVG serializers include equivalent bloom and current noise values.
- Animated SVG serializes bounded opacity keyframes for the noise loop and a blurred duplicate group for bloom.
- Source decode, threshold mask, field geometry, and motion model cache boundaries remain the same as Speed Rays.

## Acceptance

- `/clip-lab` retains its original `5px` Width maximum and `10` Speed maximum.
- `/clip-lab/sandbox` exposes Width `100px` and Speed `100`.
- Width above `5px` visibly thickens the sandbox rays.
- Speed above `10` advances the same immutable motion windows without changing timeline duration.
- Bloom Strength and Radius visibly change the blurred halo while preserving the crisp core.
- Noise Amount changes ray shimmer, Scale changes spatial grouping, and Noise Speed changes temporal cadence.
- Paused timeline frames remain stable; playback advances noise and ray motion; loop endpoints stitch.
- PNG/JPG, Copy PNG, Copy SVG, animated SVG, and MP4/WebM output contain the sandbox styling at the selected dimensions and timeline phase.
- Clearing the image returns to the neutral runtime-backed canvas.
- Targeted maximum styling (`100px` Width, Speed `100`, Bloom `100%/80px`, Noise `100%`) remains usable during playback and viewport zoom/drag.
