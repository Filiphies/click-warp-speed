# Striped Block Form Studio

## Product goal

Create looping 3D striped-block animations from typed text or an uploaded SVG. The form assembles from zero blocks into the complete silhouette, optionally holds, then returns to zero and stitches seamlessly to its first frame. Whole-object motion such as spin is layered on top of the build cycle.

## Reference study

- Video: `/Volumes/Lexar/fd78cb5f318aaaa721c223e6edf4aac9_720w.mp4`, 8.96 seconds, sampled into 16 timecoded frames at `/tmp/toolcraft-number-study/`.
- Still: `/var/folders/t4/k6gz0smn2s1dmzsnxr0ycs3m0000gn/T/codex-clipboard-011d0457-7c92-44fc-a72a-c441193cc329.png`.
- The video cycles through numerals 1, 2, and 3 under dense horizontal stripes. Stripe displacement and luminance expose the glyph volume while the stripe field persists across the frame.
- The still shows a glyph-like silhouette built from many thin extruded cells. Alternating luminous/dark bands create stepped side faces; perspective rotation, glow, and downward trails supply depth and motion.

### Storyboard

| Time | Visible state | Behavior |
| --- | --- | --- |
| 0.00s | Dark striped bulge, no readable numeral | Form begins near zero/readability threshold. |
| 1.12s | Numeral 1 emerges | Stripe displacement brightens within the silhouette. |
| 2.24s | Numeral 1 is fully readable | Peak form is narrow, bright, and vertically striped by the shared bands. |
| 3.36s | Numeral 2 appears | The silhouette retargets while the horizontal stripe field remains continuous. |
| 4.48s | Numeral 2 is fully readable | Maximum contrast and broad displaced bands reveal depth. |
| 5.60s | Numeral 2 recedes | Readability falls as displacement contracts. |
| 6.72s | Numeral 3 emerges | A new silhouette grows from the shared striped field. |
| 7.84s | Numeral 3 is readable | Bright stripe fragments define the final glyph before the loop closes. |

### Transition analysis

- The background stripe cadence persists; only local displacement, brightness, and silhouette occupancy change.
- Shape emergence is continuous rather than a cut: blocks/stripes scale from near-zero contribution to full form and return.
- The still adds an explicit 3D interpretation: each occupied sample behaves as an extruded cell with bright front bands, dark gaps, side faces, perspective, glow, and trails.
- The requested tool intentionally changes the source sequence from fixed numerals to one editable text or SVG silhouette, while preserving the striped reveal and cyclical emergence behavior.

## Product behavior

- Source mode: Text or SVG.
- Text mode uses a single-line text value rendered with a bold system sans face for reliable silhouette rasterization.
- SVG mode uses Toolcraft `fileDrop`; the renderer decodes the uploaded SVG as an image mask without changing canvas size.
- The renderer samples the silhouette on a configurable grid and draws one 3D striped block for each occupied sample.
- Build mode: center, sweep, or random stagger.
- Build progress is derived from Toolcraft playback time. The cycle is `0 → 1 → hold → 0`; the first and last frames are identical.
- Motion mode: none, spin, tilt, or orbit. Motion is whole-object and timeline-driven.
- Surface controls: black face color, white outline color, and crisp outline width (default 1px). The product has no glow pass.
- View controls: stable yaw/pitch camera rotation plus direct drag-to-orbit on the product canvas. Timeline motion remains an optional whole-object animation layered over the authored view.
- Canvas sizing: editable output, default 1080×1350 portrait to match the still reference.
- Timeline: playback timeline, default 6 seconds, forward loop.
- Layers: omitted because the output is one generated form.
- Persistence: localStorage for values, canvas, timeline, and panels.
- Exports: PNG/JPG at 2K/4K/8K and MP4/WebM at current/4K through sticky actions.

## Control section inventory

1. Source — source mode, text content, SVG file.
2. Blocks — density, extrusion depth, stripe width.
3. Build — build order, hold, stagger.
4. Motion — whole-object motion mode, turns, tilt.
5. View — camera yaw/pitch rotation.
6. Surface — face color, outline color, outline width.
7. Background — Include and background color.
8. Image Export — format and resolution.
9. Video Export — format and resolution.

## Renderer decision

- Preview and export: Canvas 2D.
- Source representation: text or SVG mask rasterized to an offscreen canvas.
- Product representation: medium-count procedural vector-like cuboids drawn into a raster canvas.
- Why Canvas 2D: the useful range is capped to a modest sampled grid; the output needs repeated black filled polygons, crisp white face strokes, and deterministic frame rendering, not per-pixel shader work. SVG would create too many animated nodes; WebGL would add shader/mesh complexity without a necessary pixel workload at this range.
- Pipeline: source mask → occupancy samples → per-frame build transforms → cuboid/stripe composite → export composite.
- Cache keys: source mode/text/SVG asset and density for mask/occupancy; geometry settings for block layout; timeline and motion settings for frame composite.

## Acceptance mapping

- Source text changes silhouette output.
- SVG upload/clear changes the mask and preview.
- Density, depth, stripe width, build order, hold, stagger, motion, turns, tilt, camera rotation, surface fill, outline color/width, and background each change rendered pixels.
- Timeline play/pause/scrub changes the rendered build frame and preserves a seamless zero endpoint.
- PNG export proves selected format, resolution, background inclusion, and dimensions.
- Video export proves selected format/resolution, timeline duration, progress, and non-empty animated bytes.
- Viewport drag and zoom keep Toolcraft playback state and canvas viewport stable.

## Verification

Verification tier: Tier 4
Reason: This replaces the current product with a new animated custom renderer, schema, timeline behavior, source upload flow, exports, acceptance matrix, and performance inventory.
Run: `npm run ai:check`, `npm run verify:final`, browser performance checkpoint, and `npm run dev`.
Skip: No required final checks are skipped; use Playwright only if the agent-controlled browser is unavailable.
