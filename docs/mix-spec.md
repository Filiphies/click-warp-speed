# Mix — Product Spec

Verification tier: Tier 4
Reason: Add a new animated product route that combines the complete Speed Rays state/geometry/timeline pipeline with Speed Blur's GPU post-process, raster exports, dashboard navigation, acceptance coverage, and performance coverage.
Run: `npm run verify:final`, focused `/mix` browser acceptance, the Mix browser performance checkpoint, then `npm run dev` and real-browser inspection.
Skip: SVG export is intentionally absent because Mix's radial blur is a raster post-process and cannot be represented by the source ray paths alone.

## Goal

Create a separate tool named **Mix** at `/mix`. Mix starts with the exact Speed Rays workflow and rendered ray field, then applies the complete Speed Blur effect to that finished ray frame. Speed Rays at `/clip-lab` and Speed Blur at `/warp` remain independent and unchanged.

## Source/reference study

- Speed Rays (`/clip-lab`, `src/app/clip-lab-schema.ts`, `src/app/clip-lab-renderer.tsx`) is the source of truth for source-mask upload, thresholding, focus, field shapes, curl, count, wiggle, stroke width, path-end noise, minimum length, gradient, motion, timeline timing, background, PNG, clipboard PNG, and video behavior.
- Speed Blur (`/warp`, `src/app/warp-schema.ts`, `src/app/warp-renderer.tsx`) is the source of truth for Motion, Exposure, Focus area, and Blend controls and the radial WebGL exposure kernel.
- The user's change request explicitly combines these two existing products, names the result Mix, requires raster PNG/video delivery, and excludes SVG delivery.

## Product behavior

- Source flow: one runtime-owned image upload feeds the invisible threshold mask exactly as it does in Speed Rays. The empty canvas remains neutral.
- Ray design: preserve Speed Rays' field geometry, mask subtraction, gradient, edge variation, minimum-length filtering, and uniform stroke width.
- Shared focus: `clip.focus` controls both ray convergence and the Speed Blur focal origin. The Vector control and on-canvas handle edit the same stable point; Mix does not add a duplicate focus control.
- Blur: the completed ray frame becomes the input texture for Speed Blur's radial exposure shader. `Motion`, `Exposure`, `Focus area`, and `Blend` preserve the Speed Blur defaults, ranges, and meanings.
- Motion: preserve Speed Rays' deterministic playback timeline, easing presets, editable easing curve, stagger, overlap, seed, seamless forward loop, and current-frame capture semantics.
- Background: the required Include/color row controls live preview and still export. Video always keeps the selected background.
- Export: Export Video, Export PNG, and Copy PNG. Raster export replays both ray generation and blur at the selected output size/current timeline frame. No static or animated SVG action is exposed.
- Persistence: none. Layers are absent because Mix is one generated composition. The top playback timeline remains enabled with the existing product-derived six-second loop.

## Starter control section inventory

| Section | Entity/workflow | Targets | Grouping reason |
| --- | --- | --- | --- |
| Image | Source image | `clip.source` | Toolcraft owns upload, attached-file actions, and source transforms. |
| Source Mask | Invisible threshold source | `clip.threshold` | Threshold defines the white clipping region. |
| Focus | Shared focal point | `clip.focus` | One direct-authored vector controls ray convergence, gradient orientation, and blur origin. |
| Ray Field | Ray geometry | `clip.fieldShape`, `clip.curl`, `clip.count`, `clip.wiggle`, `clip.width` | These settings jointly define the paths around Focus before clipping. |
| Path Ends | Mask-derived path endpoints | `clip.edgeNoise`, `clip.minLength` | Both settings refine the final visible pieces after subtraction. |
| Ray Gradient | Per-path color distribution | `clip.gradient` | One compound gradient colors every finished ray from focus outward. |
| Blur | Raster radial exposure | `mix.blur.strength`, `mix.blur.softness`, `mix.blur.falloff`, `mix.blur.blend` | Speed Blur's four controls jointly post-process the complete ray frame. |
| Motion | Periodic path playback | `clip.motionActive`, `clip.motionSpeed`, `clip.motionEasingPresets`, `clip.motionEasing`, `clip.motionStagger`, `clip.motionOverlap`, `clip.motionSeed` | Preserve Speed Rays' complete motion workflow. |
| Background | Output composite | `export.includeBackground`, `clip.background` | Required preview and raster-export background behavior. |
| Image Export | Still/clipboard raster delivery | `export.image.format`, `export.image.resolution` | Related encoder and resolution choices. |
| Video Export | Animated raster delivery | `export.video.format`, `export.video.resolution` | Related container and output-size choices. |

All settings use existing built-in Toolcraft controls. No custom controls are introduced.

## Animation intent inventory

- Mode: Toolcraft playback timeline.
- Loop duration: six seconds, product-derived from Speed Rays' accepted replacement cycle.
- Direction: seamless forward-only.
- Timeline owns play, pause, scrub, duration, loop, and exported time.
- Ray replacement motion and the Blur post-process both read the same deterministic timeline frame.
- PNG and Copy PNG capture the currently displayed timeline frame; video encodes fixed timeline timestamps over the edited duration.

## Renderer technique

- Source representation: decoded runtime media image used only to derive the cached threshold mask.
- Product representation: vector-like procedural ray geometry followed by a raster radial exposure.
- Preview renderer: Canvas 2D ray rasterization into a 75% intermediate surface, uploaded to a persistent WebGL 2 blur renderer at the full selected canvas backing. Live Resolution scale defaults to Speed Blur's 1× setting and coalesces playback to 30fps.
- Still export renderer: the same two passes replayed at the standard Toolcraft image-export dimensions.
- Video export renderer: the same two passes replayed at deterministic frame timestamps into the offline video encoder.
- Intentional rasterization: Mix's final blur changes pixel coverage continuously and therefore cannot preserve native SVG semantics.
- Rejected SVG filters: they cannot reproduce Speed Blur's source-sampling kernel with dependable preview/export/video parity, and user explicitly excluded SVG export.
- Rejected CSS blur: it softens uniformly and does not provide the radial exposure direction, focus protection, or blend controls.
- Rejected a second focus: ray direction and blur direction must remain coherent and the user asked for the two tools to be combined, not layered as separate editors.

## Render pipeline inventory

1. `source-decode` — decode the selected source once; invalidated by upload or media transform.
2. `threshold-mask` — derive the binary mask; invalidated by source pixels, transform, threshold, or canvas size.
3. `ray-geometry` — extract clipped paths and endpoint variation; invalidated by mask, focus, field shape, curl, count, wiggle, width-independent geometry settings, edge noise, minimum length, seed, or canvas size.
4. `ray-frame` — rasterize the current gradient and motion windows into an offscreen Canvas 2D surface; invalidated by geometry, gradient, stroke width, motion settings, timeline time, or output size.
5. `radial-blur` — upload the ray frame and apply Motion, Exposure, Focus area, Blend, shared focus, and background uniforms in one WebGL pass.
6. `focus-handle` — textless editing overlay bound to `clip.focus`; excluded from export.
7. `raster-delivery` — replay ray-frame and radial-blur passes for PNG/copy PNG or deterministic video timestamps.

During canvas pan, drag, pinch, zoom, and radar interactions, non-essential playback redraws are coalesced without changing timeline play state.

## Acceptance mapping

- Dashboard Mix link opens `/mix`; the two source tools remain available.
- Upload, transforms, clear, reset, and clipboard paste follow Speed Rays' media lifecycle.
- Every Speed Rays control changes Mix output with the same semantic result.
- Blur Motion, Exposure, Focus area, and Blend each change final pixels live.
- Shared Focus changes both ray direction and blur origin through panel and canvas handle.
- Timeline play/scrub/duration/loop remains seamless and controls the same frame used by PNG/copy/video.
- Export PNG/JPG dimensions follow Image Export; Copy PNG uses the same current-frame blurred output.
- Export MP4/WebM follows Video Export, timeline duration, and fixed frame timestamps.
- SVG actions are absent from Mix.
- The declared full-HD smooth-target tier remains within the Mix playback budget; higher combined Count, Overlap, and Resolution scale states stay available as explicitly experimental preview states. Raster delivery always replays at exact selected dimensions.
