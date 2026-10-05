# Warp Tool Spec

## Product goal

Create a still-image tool at `/warp` that turns an uploaded photo into a perspective zoom blur: pixels remain recognizable near a user-authored focus and stretch into long, straight rays as they move outward from that point.

## Reference study

- `codex-clipboard-4607505c-c45d-4f20-9a11-1c9013af6c89.png` is the primary target: a photographic zoom-burst made by moving the camera during a long exposure. It defines a readable focal zone, continuous straight streaks that grow with distance, and normal opaque photographic contrast.
- `codex-clipboard-008d01f0-55f8-4c14-95e3-a1f588c54326.png` remains a secondary radial-streak reference.
- `codex-clipboard-cd9ec9c2-629a-4956-ae48-4830434344df.png` defines the editing interaction: a visible focal anchor over the photo. The screenshot's many blue guide paths are reference-editor chrome, not product output, so Warp uses one concise draggable focus handle plus the built-in Vector control.

## Product behavior

- Source flow: one runtime-owned image upload; before upload the canvas remains neutral.
- Canvas: source-native output that adopts the uploaded or pasted image's natural pixel dimensions, with no Aspect ratio or Canvas width/height controls; runtime Resolution scale remains available for preview fidelity and defaults to 1× so the initial backing matches the source pixels exactly.
- Focus: direct-authored `{x,y}` Vector value and a textless draggable canvas handle; both write `warp.focus`.
- Warp: a single-pass photographic zoom-burst kernel integrates six stratified samples along the exact straight segment from each output pixel toward the focus. A fixed per-pixel jitter removes visible repeated sample bands without animation; full sampled alpha and post-accumulation contrast restoration retain photographic density. `Motion` controls camera travel, `Exposure` controls sample distribution/weighting, `Focus area` protects the readable center, and `Blend` mixes the exposure with the original image.
- Edge behavior: clamp source samples at the image bounds so rays extend without transparent seams.
- Background: runtime-required Include/color controls. With Include off, transparent areas outside source alpha remain transparent; ordinary opaque photos remain opaque.
- Export: still-only PNG/JPG through the standard Toolcraft image-export path at 2K/4K/8K.
- Persistence: none. Layers and timeline are omitted because the product is one still composition with one direct-authored focus.

## Control section inventory

| Section | Entity/workflow | Targets | Grouping reason |
| --- | --- | --- | --- |
| Source | Source image | `warp.source` | Upload and transforms own the input stage. |
| Focus | Radial origin | `warp.focus` | The Vector and canvas handle edit the same stable point. |
| Warp | Radial stretch effect | `warp.strength`, `warp.softness`, `warp.falloff`, `warp.blend` | These controls jointly define the solid streak profile. |
| Background | Output composite | `export.includeBackground`, `warp.background` | Required preview/export background behavior. |
| Image Export | Still delivery | `export.image.format`, `export.image.resolution` | Related encoder choices. |

## Renderer technique decision

- Source representation: decoded runtime media image uploaded as a cached GPU texture.
- Product representation: raster photographic effect.
- Preview renderer: WebGL 2 fragment shader.
- Export renderer: the same WebGL renderer replayed into the standard PNG/JPG export canvas.
- Rejected radial coordinate displacement: it bends and nests the image around the focus, producing a wormhole instead of straight stretched pixels.
- Rejected sparse uniformly spaced zoom samples: they read as several repeated image layers. Stratified per-pixel positions approximate a continuous exposure without adding animation.
- Rejected multi-position ray search: candidate positions still read as repeated image layers instead of one continuously stretched source coordinate.
- Rejected Canvas 2D: high-resolution straight-path sampling maps directly to a fragment shader; CPU Canvas 2D would multiply source-size and render-scale costs on the main thread.
- Rejected SVG/DOM: neither can preserve arbitrary photographic pixel streaking.

## Render pipeline inventory

1. `source-decode` — decode selected image once; invalidated by upload or media transform.
2. `texture-upload` — upload decoded pixels once per source/transform; invalidated by source decode.
3. `radial-warp` — one stable fragment pass; focus, strength, softness, falloff, blend, canvas size, and render scale update uniforms or output backing only.
4. `focus-handle` — DOM editing overlay; invalidated only by focus and preview bounds; excluded from export.
5. `still-export` — same shader at selected output resolution; invalidated by effect values and image-export choices.

## Acceptance mapping

- Upload or clipboard paste adopts the source image's natural dimensions; replacing the source updates canvas and export aspect while transforms change product pixels.
- Both Focus axes and the canvas handle move the convergence point.
- Motion, Exposure, Focus area, and Blend change rendered pixels live without progressive frame-by-frame accumulation.
- Reset restores schema defaults.
- Background Include/color and image format/resolution affect final exported bytes and dimensions.
- Toolbar zoom/drag remain stable with the maximum realistic source/sample fixture.

## Verification note

Verification tier: Tier 3
Reason: Radial Warp renderer behavior, one effect control, canvas output, and still export pixels change; copied Toolcraft runtime remains unchanged.
Run: `npm run verify:quick`, focused `/warp` browser acceptance, focused Warp workload/viewport checks, then `npm run dev` and real-browser inspection.
Skip: Full `verify:final` and the global full performance checkpoint are not required for this post-first-working secondary feature; targeted Warp renderer, media, export, and viewport checks cover the changed surface.
