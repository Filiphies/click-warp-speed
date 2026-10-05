# Paper Texture Batch — Product Spec

## Goal

Turn up to 40 ordered source images into a consistent printed-paper treatment, preview the first image in the ordered batch, and download either that preview or the whole processed set.

## Source and visible output

- Source is a runtime-owned multi-image `fileDrop` set. There is no invented canvas artwork before upload.
- The renderer previews the first image in runtime media order. Reordering thumbnails changes the preview and the ZIP order.
- Source images are cover/cropped into the editable Toolcraft canvas and consume runtime rotate/flip metadata.
- The supplied reference defines a fine regular dot screen over pale paper, with texture visible in white space and dark type while preserving legibility.

## Controls and section inventory

1. `Source` — `paper.sources`; multi-image upload and runtime-owned transforms/order.
2. `Paper Texture` — `paper.style`, `paper.amount`, `paper.scale`, `paper.fade`; texture family and shared recipe applied to every image.
3. `Background` — `export.includeBackground`, `paper.background`; mandatory preview/still compositing.
4. `Image Export` — `export.image.format`, `export.image.resolution`; shared file type and output size.
5. Sticky delivery — `paper.exportAction`; Export PNG processes the first ordered image and Export Batch downloads every image in one ZIP.

Styles are `fine-dots`, `newsprint`, and `fibers`. Amount, scale, and fade are continuous stepped sliders because they expose many useful values and markers would add noise.

## Product decisions

- Canvas sizing: `editable-output`, default 1920×1080, with raster render scale enabled.
- Panels: controls only. Layers are omitted because the batch is one ordered source set with one shared recipe, not independently composited objects.
- Timeline: omitted because output is still imagery.
- Persistence: none; source images are intentionally not retained across reloads.
- Settings transfer: runtime-owned automatic settings export/import remains enabled.
- Renderer: WebGL 2 fragment shader with one cached texture for preview and a reused GPU export surface for each batch item.
- Batch cap: accept the runtime multi-image set and reject export above 40 images with a clear error. The runtime uploader remains generic and does not get patched for this app.
- Export: single-image output uses the standard Toolcraft export canvas. Batch output processes media in runtime order and writes stored PNG/JPG files into a standards-compatible ZIP archive.

## Renderer technique decision matrix

- Source representation: decoded runtime image media plus transform metadata.
- Product representation: raster photographic output with procedural print texture.
- Preview renderer: WebGL 2.
- Export renderer: WebGL 2 into the standard Toolcraft export canvas, then PNG/JPG encoding.
- Renderer workload: pixel/media processing, up to 40 source images, 4K realistic source fixture, 8K selected still output.
- Why GPU: halftone, grain, and fiber patterns are per-pixel image transforms; Canvas 2D CPU processing would multiply full-resolution pixel work by batch count.
- Fidelity risks: very small dot scale can alias at low preview zoom; export uses the selected full output resolution, and the shader derives pattern size in output pixels.

## Render pipeline inventory

1. Decode selected/batch source; cache by data URL and media transform.
2. Upload one decoded source to a reusable WebGL texture.
3. Apply cover/crop, rotation/flip, selected texture pattern, amount, scale, fade, and background composition in one fragment pass.
4. Preview composites the first ordered source at the selected render scale.
5. Single export renders the same recipe at selected output dimensions.
6. Batch export repeats decode/upload/render/encode serially, reports per-image progress, and packages encoded bytes into one ZIP without retaining duplicate decoded canvases.

Media import/order/transform invalidates source decode and texture upload. Texture controls invalidate only shader uniforms and the composite pass. Viewport pan/zoom invalidates no product pass. Export format/resolution invalidates only export rendering and encoding.

## Acceptance

- Multiple real image files upload, sort, rotate/flip, remove, and reset through the built-in uploader.
- The first ordered image appears on the canvas; reordering changes the preview and batch order.
- Fine dots match the supplied regular paper screen; Newsprint and Fibers are visibly distinct.
- Amount, scale, and fade change rendered pixels live without moving the canvas viewport.
- Source upload never changes the editable canvas size and cover/crops mismatched source ratios.
- Background Include and color affect live preview and still export according to the Toolcraft export contract.
- Export PNG/JPG uses the selected 2K/4K/8K long edge and produces decodable bytes.
- Export Batch processes every ordered source with the same settings and produces one ZIP containing the same number of decodable image entries with stable sanitized names.
- A 40-image batch is supported; attempts above 40 fail before processing.

