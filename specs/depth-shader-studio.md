# Depth Shader Studio Spec

This product spec mirrors the renderer evidence in `docs/toolcraft/agent-worklog.md`
so generated contract tests that scan product markdown outside `docs/toolcraft`
can verify the custom renderer decision.

## Renderer Technique Decision Matrix

- sourceRepresentation: image-media.
- productRepresentation: pixel.
- previewRenderer: webgl.
- exportRenderer: webgl.
- rendererWorkload: pixel-output.
- rendererStrategy: webgl.
- whyNotAlternativeStrategies: DOM, text-output, and vector-output renderer alternatives cannot sample uploaded pixels into a generated depth map or drive per-pixel shader bands. Canvas 2D was rejected as the primary renderer strategy because shader compositing is dense pixel work. Transformers.js model inference uses the local WASM path for reliability, while WebGL remains the preview/export renderer because it has broad availability for the pixel-output shader workload. The exportRenderer remains WebGL plus standard Toolcraft export/copy helpers so product-quality output uses the same shader path as preview.
- fidelityRisks: Depth Anything small produces monocular model depth, so the result is semantic but still an estimate from a single RGB image.
- performanceRisks: first use downloads and initializes the Transformers.js model, source images are downscaled before inference to keep generation responsive, and render scale 2, 8K PNG export, and 4K video export are the highest shader/export workload paths.

## Renderer Layer Inventory

- backgroundLayer: WebGL clear/composite layer for the user-selected background.
- productForegroundLayer: product-foreground WebGL bitmap-media and depth shader layer.
- exportComposite: WebGL export composite used for PNG and video frames.

## Render Pipeline Inventory

- Pass `source-decode`: decode pass, cacheKey `source.image.dataUrl` plus media transform state, invalidated by media-import.
- Pass `source-depth`: preprocess pass, output `intermediate`, cacheKey decoded source plus `Xenova/depth-anything-small-hf`, invalidated by media-import.
- Pass `shader-preview`: pixel-transform pass, cacheKey source, generated depth texture, depth controls, shader controls, background controls, timeline time, and render scale; invalidated by control-drag and control-change.
- Pass `shader-frame-composite`: composite pass, cacheKey preview plus timeline phase; invalidated by animation-frame and timeline-playback.
- Pass `export-render`: export pass, cacheKey export controls plus timeline duration; invalidated by export.
- Interaction invalidation: media-import invalidates decode, model depth generation, and preview; control-drag invalidates shader uniforms only; viewport-zoom and viewport-drag invalidate no expensive passes; animation-frame and timeline-playback invalidate frame composite only.
