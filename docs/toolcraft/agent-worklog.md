# Toolcraft Agent Worklog

## Status

Mode: product
Product: Click Tools with Speed Rays, Speed Blur, Mix, Speed Rays Sandbox, and Heat Vision
Surface: `/` mode launcher; product routes `/clip-lab`, `/mix`, `/warp`, `/clip-lab/sandbox`, and `/heat`
Persistence: none

## Decisions

The root is a lightweight mode launcher. Each active product route uses an independent Toolcraft schema and renderer; Mix composes the accepted Speed Rays geometry/motion pipeline with Speed Blur's radial exposure pass, while the removed Badge Lab Sandbox, Paper Texture, and Meme P&L products are not registered, linked, or included in the production route bundle.

## Renderer

Decision: Keep Speed Rays on its accepted native SVG renderer, and build Mix as a separate Canvas 2D ray pass feeding Speed Blur's persistent WebGL radial-exposure pass.
Reason: Speed Rays must retain separate scalable paths, while Mix intentionally turns that exact ray frame into pixels so the source-sampling blur can affect preview, PNG, clipboard PNG, and video consistently.
Evidence: `src/app/clip-lab-renderer.tsx`, `src/app/mix-renderer.tsx`, `docs/clip-lab-spec.md`, `docs/mix-spec.md`, both renderer-pipeline inventories, and focused browser coverage.

## Timeline

Decision: Keep the built-in Toolcraft playback timeline with a product-derived six-second forward loop for Speed Rays and Mix.
Reason: Users design a static result first, then play, pause, scrub, or export the additive periodic path animation without a second transport surface.
Evidence: `src/app/clip-lab-schema.ts`, `src/app/mix-schema.ts`, both renderers, and browser coverage for playback, easing, overlap, current-frame capture, and fixed-timestamp video.

## Layers

Decision: Do not enable the Layers panel.
Reason: Source mask, generated paths, motion copies, and background are one generated product composition rather than independently authored layer entities.
Evidence: `src/app/clip-lab-schema.ts` and `src/app/mix-schema.ts` have no layers declaration, and acceptance verifies each single product output.

## Controls

Decision: Keep Speed Rays controls grouped by product meaning and add one Blur section in Mix containing Speed Blur's Motion, Exposure, Focus area, and Blend controls before the existing Motion section.
Reason: Each group maps to one product entity or workflow stage, uses built-in Toolcraft controls, and avoids duplicating runtime Setup or timeline controls.
Evidence: `clipLabControlSectionInventory`, `mixControlSectionInventory`, `starterControlSectionInventory`, `controls-product-coverage`, and `controls-layout-heuristics`.

## Export

Decision: Preserve Speed Rays' current-frame raster/vector and animated vector/video actions; give Mix only current-frame Export PNG/JPG, Copy PNG, and full-loop Export Video.
Reason: Speed Rays can preserve native paths, but Mix's radial source sampling is intentionally raster and cannot be represented by exporting the pre-blur SVG.
Evidence: `src/app/clip-lab-renderer.tsx`, `src/app/mix-renderer.tsx`, both thin routes, and browser payload checks proving Mix has no SVG action and produces real PNG and video bytes.

## Performance

Decision: Keep Speed Rays' maximum native-SVG workload contract; for Mix, declare the full exposed hard limit but mark combinations above the measured full-HD smooth target as experimental and keep raster delivery full-resolution.
Reason: Mix adds a CPU gradient-path raster pass plus GPU texture upload on every playback frame. Live preview therefore uses Resolution scale 1 by default, a 30fps coalesced cadence, and a 75% intermediate ray texture before the full-size WebGL composite; exports replay both passes at exact selected dimensions.
Evidence: `src/app/app-performance.ts`, `src/app/mix-performance.ts`, focused browser output inspection, functional export coverage, and recorded hard-limit/smooth-target measurements.

## Decision Trail

### Iteration — Remove Meme P&L completely

- Request: Remove Meme P&L totally.
- Task type: Tier 4 complete registered-product removal and replacement Vercel preview deployment.
- User-visible result: The launcher contains only Speed Rays, Speed Blur, and Mix; `/meme-card` now resolves to the generic Not Found state; no Meme P&L code, asset, control, renderer, output, or export remains. The separate Speed Rays Sandbox and Heat Vision routes remain intact.
- Source/reference checked: Current route tree and launcher; every Meme P&L schema, renderer, route, contract, test, browser suite, spec, plan, and image asset; built `dist`; the linked Vercel project and completed replacement deployment.
- Reference inputs: The user's instruction to remove the product completely and the existing local `/meme-card` implementation; no new external visual reference.
- Docs/contracts read: `AGENTS.md`, `docs/toolcraft/workflow.md`, runtime boundary, assembly workflow, decision contract, acceptance testing, and the brainstorming, writing-plans, systematic-debugging, and Vercel deployment skills.
- Contract rules applied: `runtime-shell-required`, `workflow-required`, `acceptance-product-observable`, and the Tier 4 complete-product removal classifier; remaining schemas, renderers, controls, timeline, layers, persistence, and exports are unchanged.
- Decision: Unregister Meme P&L and delete its complete implementation, contracts, tests, documentation, and image asset rather than merely hiding it. Retain only its historical worklog entries and the explicit removal plan as project history.
- Alternatives rejected: Hiding the launcher entry would leave the direct route and bundle active; keeping unregistered source would not satisfy “totally”; redirecting the old URL would preserve a misleading product path.
- State/output mapping: The TanStack route tree no longer imports or registers Meme P&L; the launcher emits no corresponding link; all `meme.*` state and delivery handlers disappear with the deleted schema and renderer. Remaining products preserve their existing state/output mappings.
- Files changed: `src/routes/root.tsx`, `src/routes/index.tsx`, `e2e/dashboard.spec.ts`, `docs/dashboard-spec.md`, `docs/remove-meme-card-plan.md`, this worklog, and deleted Meme P&L route/app/contracts/tests/browser/spec/plan files plus `public/assets/memecoin-collage.png`.
- Verification: `npm run typecheck` passed; focused dashboard Chromium coverage passed 2/2; an isolated retry proved a transient stale Vite module-graph failure was not reproducible; the final `npm run verify:final` passed 13/13 script tests, 232/232 app and contract tests, the production build, and all 21/21 functional browser tests. A source and built-output scan found no Meme P&L, `meme-card`, asset, or `meme.*` implementation references. Replacement preview `dpl_9vGiQiWytfvktSeHjdfY1qBsev2K` reached `READY`; production deployment `dpl_D5fWYPA5XEnc7MMvUcH5S4gQ1FuV` then built successfully, reached `READY`, and was aliased to `https://click-warp-speed.vercel.app`.
- Skipped checks: The full performance checkpoint is not required for this post-first-working product removal because the pass deletes a renderer and its workload while leaving all remaining renderer, viewport, animation, and export paths unchanged.
- Risks: Historical immutable preview URLs may still expose their original builds, but the canonical production alias now serves the cleaned deployment with Meme P&L removed.

### Iteration — Add Mix from Speed Rays plus Speed Blur

- Request: Create a new tool named Mix that is the exact Speed Rays workflow with every Speed Blur effect/control added on top; include the blur in PNG and video output, and omit SVG export.
- Task type: Tier 4 first-working product route with an independent schema, two-stage renderer, playback timeline, media flow, current-frame still/clipboard delivery, timestamped video, launcher entry, and product contracts.
- User-visible result: `/mix` accepts the same invisible threshold-mask image as Speed Rays, exposes the same clipped ray geometry, gradient, focus, and motion controls, then adds Blur Motion, Exposure, Focus area, and Blend. The shared Focus controls both ray convergence and radial blur. Export Video, Export PNG/JPG, and Copy PNG include the finished blurred frame; no SVG action is shown.
- Source/reference checked: Existing local Speed Rays schema/renderer/route/browser suite; existing Speed Blur schema, WebGL renderer, defaults, focus model, and export behavior; live Mix output at full-HD; downloaded PNG/video payloads.
- Reference inputs: The accepted `/clip-lab` and `/warp` products; no new external image, video, or Figma reference.
- Docs/contracts read: `AGENTS.md`, Toolcraft workflow, reference study, runtime boundary, assembly workflow, schema reference, decision contract, acceptance testing, control selection, layout, component rules, performance, renderer technique, timeline animation, setup/export, media upload, and the brainstorming, writing-plans, systematic-debugging, browser, and in-app-browser skills.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `canvas-surface-preserved`, `canvas-handle-placement`, `layers-enable-only-when-needed`, `timeline-mode-choice`, `timeline-enabled-behavior`, `controls-product-coverage`, `output-export-required`, `controls-layout-heuristics`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.
- Decision: Keep Mix separate at `/mix`. Reuse Speed Rays' threshold/segment/motion/Canvas replay functions and generalize Speed Blur's WebGL renderer to accept a canvas texture, without changing either source route. Render each live/export frame as rays into Canvas 2D and then radial exposure into WebGL. Keep one shared focus. Use Speed Blur's live Resolution scale 1 default and a 75% preview intermediate; replay full resolution for delivery. Exclude SVG because it would describe only the pre-blur rays.
- Alternatives rejected: Modifying Speed Rays would couple the existing tool to raster output; CSS blur cannot reproduce focal radial exposure; SVG filters cannot preserve shader parity; adding a second focus would break directional coherence; exporting the unblurred source SVG from Mix would misrepresent the visible result.
- State/output mapping: Existing `clip.*` values continue to own source mask, geometry, gradient, background, and motion. `clip.focus` also maps to the WebGL focal origin. `mix.blur.strength`, `softness`, `falloff`, and `blend` map directly to the accepted Speed Blur uniforms. Timeline time maps to the same ray frame used by live preview, PNG/copy, and fixed-timestamp video. `mix.exportAction` routes only raster/video actions.
- Files changed: `src/app/mix-schema.ts`, `src/app/mix-renderer.tsx`, `src/app/mix-acceptance.ts`, `src/app/mix-performance.ts`, `src/app/mix-schema.test.ts`, `src/routes/mix.tsx`, root/dashboard routes, reusable exports in the Speed Rays and Speed Blur renderers, Mix/dashboard/clipboard browser coverage, `docs/mix-spec.md`, `docs/mix-plan.md`, `docs/dashboard-spec.md`, and this worklog.
- Verification: `npm run ai:check` passed; `npm run typecheck` passed; focused Mix schema contracts passed 3/3; focused Mix functional Chromium passed 3/3, including real current-frame PNG clipboard/download bytes and a one-second encoded video; dashboard and clipboard coverage passed 6/6; `npm run verify:quick` passed 13/13 script tests and 237/237 app/contract tests; `npm run verify:final` passed the same app contracts, production build, and all 23/23 functional browser tests. In-app-browser inspection confirmed the full-HD clipped ray field, radial exposure centered on the shared handle, full backing pixels, and no console errors.
- Skipped checks: Per the user's explicit quick-proof-of-concept instruction, no further renderer optimization is being pursued. The Playwright fallback performance suite was attempted and passed 6/8; its software-rendered frame-gap probe was unstable for Mix and the unchanged existing Warp route, while the functional and visual browser gates passed. Mix records higher combined density states as experimental and preserves exact-resolution export.
- Risks: Live preview above the measured smooth target—especially 1200 rays, 70% overlap, and Resolution scale 2 together—may drop frames on software-rendered or older GPUs. Final PNG/video output remains full resolution and deterministic. This pass is local and has not been redeployed to Vercel.

### Iteration — Remove Badge Lab Sandbox completely

- Request: Remove the entire Badge Lab Sandbox.
- Task type: Tier 4 complete generated-product removal covering route registration, schema, renderer, exports, acceptance/performance contracts, browser coverage, and product docs.
- User-visible result: `/badge-lab/sandbox` is no longer a registered Toolcraft route, and no Badge Lab code, controls, output, or export actions remain in the app bundle. Existing routes, including the newer `/meme-card`, remain registered.
- Source/reference checked: Current route tree, every Badge Lab app/route/test/spec file, live source-reference scan, and the active local dev route.
- Reference inputs: User instruction to remove the entire sandbox; no new external visual reference.
- Docs/contracts read: `AGENTS.md`, `docs/toolcraft/workflow.md`, runtime boundary, assembly workflow, decision contract, brainstorming, and writing-plans.
- Contract rules applied: `runtime-shell-required`, `workflow-required`, `acceptance-product-observable`, and the Tier 4 route/product removal classifier; remaining schemas, renderers, controls, timeline, layers, persistence, and exports are unchanged.
- Decision: Unregister the route and delete the complete Badge Lab implementation, contracts, tests, and build specs rather than merely hiding or redirecting it. Keep only the historical worklog record and a removal plan.
- Alternatives rejected: Hiding the route would leave dead source and export code; retaining an unregistered recoverable implementation would not satisfy “entire sandbox”; redirecting the old path would preserve a misleading product URL.
- State/output mapping: The TanStack route tree no longer imports or adds `BadgeLabSandboxHome`; all `badge.*` state, SVG output, and image/SVG delivery handlers disappear with their owning schema and renderer. Other products keep their existing runtime mappings.
- Files changed: `src/routes/root.tsx`; deleted Badge Lab route, schema, renderer, acceptance, performance, unit, browser, spec, and implementation-plan files; added `docs/remove-badge-lab-sandbox-plan.md`; updated this worklog.
- Verification: `npm run typecheck` passed; a live `rg` scan found no `badge-lab`, `badgeLab`, or `BadgeLab` references under `src` or `e2e`.
- Skipped checks: Browser and performance suites were not rerun because the user previously requested local access without more testing; the removal deletes the only Badge Lab workload and leaves existing product behavior untouched.
- Risks: The old local URL now resolves through the app's generic Not Found behavior; no redirect is installed by design.

### Iteration — Add Badge Lab Sandbox

- Request: Build a new hidden sandbox tool for making futuristic numbered badges like the supplied reference.
- Task type: Tier 4 first-working independent product route with a new Toolcraft schema, native SVG renderer, still exports, acceptance matrix, browser verification, performance checkpoint, and production deployment.
- User-visible result: `/badge-lab/sandbox` creates one editable futuristic badge with Octagon, Shield, and Reactor silhouettes; dark layered material; metallic frame; luminous top/bottom tabs; symmetric side details; editable label and full typography; accent/glow controls; background transparency; PNG/JPG and native SVG delivery. The public launcher and all existing tools remain unchanged.
- Source/reference checked: Original-resolution inspection of the supplied five-badge image; current Toolcraft schema/export/control patterns; font catalog; real local Badge Lab at fitted and 100% zoom; decoded downloaded PNG/JPG/SVG payloads.
- Reference inputs: `/var/folders/t4/k6gz0smn2s1dmzsnxr0ycs3m0000gn/T/codex-clipboard-69e58a66-3be8-4521-916c-7355d9f15aae.png`.
- Docs/contracts read: `AGENTS.md`, Toolcraft workflow, runtime boundary, assembly workflow, decision contract, control selection, layout, setup/export, schema reference, component rules, acceptance testing, core/general performance, renderer technique, and the brainstorming, writing-plans, systematic-debugging, and browser skills.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `canvas-surface-preserved`, `layers-enable-only-when-needed`, `timeline-mode-choice`, `controls-product-coverage`, `output-export-required`, `controls-layout-heuristics`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.
- Decision: Build the reference's visual language procedurally rather than trace artwork. Use one shared normalized SVG scene for preview/native delivery and the standard Toolcraft PNG helper for 2K/4K/8K raster delivery. Use built-in text, select, sliders, colors, `fontPicker`, switch, and panelActions; omit media, timeline, layers, and persistence.
- Alternatives rejected: Image upload or traced presets would make the tool less editable and risk copying source artwork; Canvas-only preview would discard scalable output; WebGL adds needless text/filter complexity for a bounded still vector; custom controls would duplicate the built-in kit; adding a launcher card would expose an experimental route the user asked to keep in sandbox.
- State/output mapping: `badge.label` and all eight `badge.typography` parts style the central SVG text; shape/corner/frame/inset rebuild normalized paths; face/metallic update gradients; detail changes symmetric primitive count; accent/glow controls update strokes, tabs, marks, and bounded Gaussian filters; Background controls preview/raster compositing; image controls feed `createToolcraftPngExportCanvas`; sticky actions download or copy the current scene.
- Files changed: `src/app/badge-lab-schema.ts`, `src/app/badge-lab-renderer.tsx`, `src/app/badge-lab-acceptance.ts`, `src/app/badge-lab-performance.ts`, focused app tests, `src/routes/badge-lab-sandbox.tsx`, `src/routes/root.tsx`, `e2e/badge-lab-sandbox.spec.ts`, `docs/badge-lab-sandbox-spec.md`, `docs/badge-lab-sandbox-plan.md`, and this worklog.
- Verification: `npm run ai:check` passed; focused schema/renderer tests passed 5/5; `npm run typecheck` passed; real Chromium visual inspection confirmed the complete centered badge at 50% and the controls at 100%; focused functional browser acceptance passed 2/2 across every product control, reset, transparent 2K PNG, 4K JPG, Export SVG, Copy SVG, and sticky progress; focused first-working performance checks passed 3/3 for maximum preview, viewport zoom, and 8K raster export after correcting Glow spread and font size to true output-pixel semantics.
- Skipped checks: Upload, timeline, layers, and video checks are not applicable to this procedural still vector. No full-performance check is skipped; first-working performance evidence is completed before final delivery.
- Risks: Browser-native 8K encoding is an export-only main-thread operation and measured inside the 8-second export budget; SVG text declares the selected web-font family, so editors without that font may substitute until it is installed or linked.

### Iteration — Remove Paper Texture from the deployed site

- Request: Remove Paper Texture from the site.
- Task type: Tier 4 production route and launcher removal with browser regression coverage, final build verification, bundle inspection, and production redeployment.
- User-visible result: The root launcher now shows only Speed Rays and Speed Blur; `/paper-texture` no longer resolves to Paper Texture Batch; Speed Rays, Speed Rays Sandbox, Heat, and Warp remain registered.
- Source/reference checked: Current launcher, route tree, dashboard acceptance, Paper Texture functional/performance browser suites, production bundle route registration, and the live linked Vercel project configuration.
- Reference inputs: User instruction to remove Paper Texture from the site; no external visual or behavior reference.
- Docs/contracts read: `AGENTS.md`, Toolcraft workflow, runtime boundary, assembly workflow, decision contract, brainstorming, writing-plans, browser verification, and Vercel deployment guidance.
- Contract rules applied: `runtime-shell-required`, `workflow-required`, `acceptance-product-observable`, and the Tier 4 final-delivery verification route; remaining product schemas, renderers, controls, timeline, layers, persistence, and exports are unchanged.
- Decision: Remove the launcher link and unregister the Paper Texture route, then delete its functional and performance browser suites because the product is no longer reachable. Keep its app/schema source and unit contracts recoverable but unimported, so Vite excludes the implementation from the production route bundle.
- Alternatives rejected: Hiding only the launcher would leave the direct URL active; deleting all source would make an explicitly site-level removal unnecessarily destructive; redirecting `/paper-texture` to another product would preserve a misleading route.
- State/output mapping: The root launcher no longer emits a Paper Texture link; TanStack Router no longer contains a `/paper-texture` child; Vite tree-shakes the unreferenced route/renderer from production. Remaining routes retain their existing Toolcraft state and product-output mappings.
- Files changed: `src/routes/index.tsx`, `src/routes/root.tsx`, `e2e/dashboard.spec.ts`, removed `e2e/paper-texture.spec.ts`, removed `e2e/z-paper-texture-performance.spec.ts`, `docs/remove-paper-texture-plan.md`, and this worklog.
- Verification: `npm run ai:check` passed; focused Chromium route removal passed 2/2, proving the launcher absence and direct-route removal; `npm run verify:final` passed 13/13 script tests, 229/229 app/unit contracts, the production build, and all 17/17 remaining functional browser checks; production bundle inspection found no Paper Texture route registration and showed the route tree containing only `/`, `/clip-lab`, `/clip-lab/sandbox`, `/heat`, and `/warp`; Vercel deployment `dpl_9ranB3jfMiTC8RvH8QMQfecxm1CN` reached `READY` and was aliased to `https://click-warp-speed.vercel.app`.
- Skipped checks: The full performance checkpoint is explicitly not required for this post-first-working route removal because no remaining renderer, canvas, animation, export, or workload behavior changed.
- Risks: None; the implementation remains recoverable locally, while it is unreachable and excluded from the deployed route bundle.

### Iteration — Fix direct Vercel navigation for nested routes

- Request: Fix the production `404: NOT_FOUND` shown when opening the deployed Speed Rays Sandbox URL directly.
- Task type: Tier 4 production hosting-route correction with configuration contract coverage, full final verification, generated Vercel route-manifest inspection, and production redeployment.
- User-visible result: Direct navigation and refresh at `/clip-lab/sandbox` now serve the Vite SPA shell so TanStack Router can open Speed Rays Sandbox; the same fallback also protects the other client-side product routes.
- Source/reference checked: The supplied Vercel `404: NOT_FOUND` screenshot; registered routes in `src/routes/root.tsx`; the linked `.vercel/project.json`; absence of a root Vercel configuration; Vercel's official SPA 404/rewrite guidance; and the generated `.vercel/output/config.json` route manifest.
- Reference inputs: `/var/folders/t4/k6gz0smn2s1dmzsnxr0ycs3m0000gn/T/codex-clipboard-191466f9-d337-4eab-a343-668040164b5e.png`; production URL `https://click-warp-speed.vercel.app/clip-lab/sandbox`.
- Docs/contracts read: `AGENTS.md`, Toolcraft workflow, runtime boundary, assembly workflow, decision contract, systematic-debugging, writing-plans, browser verification, and Vercel deployment guidance.
- Contract rules applied: `runtime-shell-required`, `workflow-required`, and the Tier 4 final-delivery verification route; client product schemas, renderers, exports, timeline, layers, persistence, and Toolcraft runtime remain unchanged.
- Decision: Add the standard Vercel `rewrites` catch-all from `/(.*)` to `/index.html`. Vercel compiles it after a filesystem handler, so real static assets resolve first and unmatched client routes receive the SPA shell. Add a script contract test that locks the rewrite and the `/clip-lab/sandbox` route together.
- Alternatives rejected: Adding a physical HTML file for only `/clip-lab/sandbox` would duplicate the app shell and leave every other nested route vulnerable; changing TanStack Router cannot affect Vercel's pre-browser 404; redirecting to `/` would lose the requested URL; route-specific rewrites would be repetitive and easy to forget.
- State/output mapping: Vercel resolves existing build files through its filesystem handler, then rewrites unmatched requests such as `/clip-lab/sandbox` to `/index.html`; the browser loads the existing bundle and TanStack Router selects `ClipLabSandboxHome`. Product runtime state and output mapping are unchanged.
- Files changed: `vercel.json`, `scripts/vercel-routing.test.mjs`, `docs/vercel-spa-fallback-plan.md`, and this worklog.
- Verification: The focused Vercel routing contract passed 1/1; `npm run verify:final` passed 13/13 script tests, 229/229 app/contract tests, the production build, and all 18/18 functional browser checks; `vercel build --yes` completed and generated a route manifest with `handle: "filesystem"` followed by `src: "^(?:/(.*))$"` to `dest: "/index.html"`; Vercel deployment `dpl_9hBr4uFMDFDZv7chneis1nKRoTwn` reached `READY` and was aliased to `https://click-warp-speed.vercel.app`.
- Skipped checks: The full performance checkpoint is explicitly not required for this post-first-working hosting-only correction because no schema, renderer, canvas workload, animation, export, or runtime code changed.
- Risks: None; the generated manifest proves static files are checked before the SPA fallback, and the fallback now covers all current and future client routes.

### Iteration — Add an independent Speed Rays sandbox

- Request: Keep the current Speed Rays tool unedited while creating a copy at `/clip-lab/sandbox` with much higher Width and Speed limits plus Bloom and animated Noise.
- Task type: Tier 3 independent schema/route and custom SVG/Canvas renderer variant with timeline, still/video delivery, focused browser acceptance, and production deployment.
- User-visible result: `/clip-lab/sandbox` opens Speed Rays Sandbox with the accepted source-mask and ray workflow, Width up to 100px, Speed up to 100 cycles per timeline loop, Bloom Strength/Radius, and deterministic timeline-driven Noise Amount/Scale/Speed. `/clip-lab` retains its original 5px/10-cycle limits and behavior.
- Source/reference checked: Existing `/clip-lab` schema, renderer, route, app performance contract, Clip Lab specification, browser suite, and the live original/sandbox routes.
- Reference inputs: The existing local Speed Rays product at `/clip-lab`; user-requested production destination `https://click-warp-speed.vercel.app/clip-lab/sandbox`; no external image/video/Figma reference.
- Docs/contracts read: `AGENTS.md`, `docs/toolcraft/workflow.md`, runtime boundary, assembly workflow, decision contract, control selection, layout, schema reference, component rules, acceptance testing, core/general performance, renderer technique, timeline animation, setup/export, media upload, and the brainstorming, writing-plans, systematic-debugging, browser, and Vercel deployment skills.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `canvas-surface-preserved`, `timeline-mode-choice`, `timeline-enabled-behavior`, `controls-product-coverage`, `output-export-required`, `controls-layout-heuristics`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.
- Decision: Create a separate `defineToolcraft` schema, renderer module, and thin route while retaining the same runtime targets inside the independent ToolcraftApp instance. Keep native SVG paths; render Bloom as one Gaussian-blurred duplicate group beneath the crisp core; render animated Noise as deterministic per-path luminance modulation derived from path band, seed, and Toolcraft loop phase; replay equivalent styling in Canvas 2D video and current-frame/animated SVG serializers. Raise only the sandbox Width/Speed clamps and schema ranges to 100.
- Alternatives rejected: Mutating the existing schema would violate the request to preserve the current tool; query-parameter feature flags would couple bookmarks and reset behavior; WebGL would discard native SVG delivery; autonomous wall-clock noise would not pause, scrub, loop, or export deterministically with the Toolcraft timeline; spatial SVG turbulence would not have a reliable equivalent in fixed-timestamp Canvas 2D video.
- State/output mapping: Existing `clip.*` settings retain their accepted mapping inside the sandbox app instance; `clip.bloomStrength` controls blurred-group opacity, `clip.bloomRadius` controls SVG/Canvas blur radius, `clip.noiseAmount` controls luminance depth, `clip.noiseScale` groups neighboring ray indices into deterministic noise bands, and `clip.noiseSpeed` maps Toolcraft loop phase to seamless shimmer cycles. Current-frame SVG/PNG/JPG and clipboard output snapshot timeline phase; video and animated SVG replay the complete forward loop.
- Files changed: `src/app/clip-lab-sandbox-schema.ts`, `src/app/clip-lab-sandbox-renderer.tsx`, `src/app/clip-lab-sandbox-schema.test.ts`, `src/routes/clip-lab-sandbox.tsx`, `src/routes/root.tsx`, `e2e/clip-lab-sandbox.spec.ts`, `docs/clip-lab-sandbox-spec.md`, `docs/clip-lab-sandbox-plan.md`, and this worklog.
- Verification: `npm run ai:check` passed; `npm run typecheck` passed; `npm run verify:quick` passed 12/12 script tests and 229/229 app/contract tests after rerunning outside the localhost-bind sandbox; focused Chromium acceptance passed 2/2 for extreme sandbox styling/timeline stability and original-route limit preservation; `npm run verify:final` passed the same 229 app/contract tests, production build, and all 18/18 functional browser checks; the dev server verified this app at `http://127.0.0.1:3002/`; Vercel deployment `dpl_Ce1FnDFYdQ1DrH7H9CVUgBHdAPRy` reached `READY` and was aliased to `https://click-warp-speed.vercel.app`.
- Skipped checks: The full global browser performance checkpoint is not required for this post-first-working feature route; the focused browser scenario exercises the combined maximum Width/Speed/Bloom/Noise state and timeline, while the unchanged original Speed Rays retains its existing full workload coverage.
- Risks: SVG Gaussian blur at maximum Count, Width, and Radius duplicates the visible path group and can be GPU-heavy on older browsers; Noise intentionally modulates luminance/opacity rather than displacing geometry so native SVG, still, and fixed-timestamp video remain consistent.

### Iteration — Match photographic long-exposure zoom burst

- Request: Match the newly supplied photo exactly in effect direction: a long-exposure photograph made while the camera moves, with a readable focal region and continuous outward motion streaks.
- Task type: Tier 3 reference-driven renderer correction with control semantics, preview/export parity, visual browser comparison, functional acceptance, and targeted 4K performance verification.
- User-visible result: Warp now produces a static photographic zoom burst rather than ribbons or a geometric tunnel. The focal area remains readable while straight exposure streaks build continuously with distance; colors remain dense and opaque. Controls are Motion, Exposure, Focus area, and Blend.
- Source/reference checked: Original-resolution inspection of the new 1080×1350 long-exposure forest photo; the previous supplied radial references; live `/warp` results before and after the kernel change; the fragment shader, 4K fallback workload, and browser acceptance suite.
- Reference inputs: `/var/folders/t4/k6gz0smn2s1dmzsnxr0ycs3m0000gn/T/codex-clipboard-4607505c-c45d-4f20-9a11-1c9013af6c89.png` as the primary target; `/var/folders/t4/k6gz0smn2s1dmzsnxr0ycs3m0000gn/T/codex-clipboard-008d01f0-55f8-4c14-95e3-a1f588c54326.png` as a secondary radial-streak reference.
- Docs/contracts read: `AGENTS.md`, workflow, control selection, layout, schema reference, component rules, renderer/performance/acceptance contracts, and the brainstorming, writing-plans, systematic-debugging, browser, and in-app-browser control skills.
- Contract rules applied: `canvas-no-app-ui`, `canvas-surface-preserved`, `canvas-handle-placement`, `controls-product-coverage`, `output-export-required`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, and `workflow-required`.
- Decision: Replace angular ribbons with a six-sample stratified radial exposure. Every sample lies on the exact straight segment from the output pixel toward `warp.focus`; deterministic per-pixel jitter removes repeated sample bands without animation; Exposure changes sample spacing/weighting; a distance mask protects the Focus area; full sampled alpha and post-accumulation contrast restore photographic density. Preview and export use the same completed frame.
- Alternatives rejected: Image Tunnel wedges create geometric bands rather than camera motion; a one-coordinate radial warp stretches geometry without exposure trails; sparse uniformly spaced samples read as repeated image layers; progressive accumulation visibly animates; an initial eight-sample gamma-aware version matched the look but produced a 350.9 ms 4K frame gap; lowering render scale or export fidelity would violate the canvas-quality contract.
- State/output mapping: `warp.focus` defines the optical center and handle; `warp.strength`/Motion controls virtual camera travel; `warp.softness`/Exposure controls the stratified distribution and weights; `warp.falloff`/Focus area controls the readable center mask; `warp.blend` mixes original and completed exposure; media transform, background, canvas sizing, and Image Export continue through the cached WebGL pipeline.
- Files changed: `src/app/warp-renderer.tsx`, `src/app/warp-schema.ts`, `src/app/warp-performance.ts`, `e2e/warp.spec.ts`, `docs/warp-spec.md`, `docs/warp-plan.md`, and this worklog.
- Verification: Original-resolution reference inspection completed; `npm run verify:quick` passed 12/12 script tests and 221/221 app/contract tests; functional Chromium acceptance passed 3/3 for stable opaque output, Motion/Exposure/Focus interaction, and JPG export; targeted `browser perf: warp strength maximum stays responsive` passed at 3840×2160 and Resolution scale 2 after replacing per-sample power/gamma work and reducing the kernel from eight to six stratified samples; in-app-browser inspection confirmed continuous straight streaks, readable center, full opacity, and `data-warp-refining=false`.
- Skipped checks: The full global browser performance checkpoint is not required for this post-first-working renderer correction because the focused 4K maximum-Motion scenario directly covers the changed exposure shader; the canonical root product and copied Toolcraft runtime are unchanged.
- Risks: WebGL 2 remains required; applying the tool to an image that already contains a zoom burst intentionally compounds its motion; six deterministic stratified samples prioritize live 4K responsiveness and continuous perceived exposure over offline high-sample photographic integration.

### Iteration — Adapt Unveil Image Tunnel into Warp ribbons

- Request: Stop guessing with blur/warp filters; inspect `/Users/filipgadzinski/Unveil`, study its `Image Tunnel` type, and move `/warp` toward that solid pixel-stretch direction without cloning it 1:1.
- Task type: Tier 3 renderer/canvas technique correction with schema semantics, reference-source inspection, browser acceptance, export parity, and targeted 4K performance verification.
- User-visible result: Warp now divides the image around the chosen focus into 64–512 perspective ribbons. Each wedge samples one centerline strip from the uploaded image and stretches those pixels from a small focal throat to the canvas perimeter. The panel exposes Stretch, Ribbons, Throat, and Blend; the draggable Focus still defines the convergence point.
- Source/reference checked: `/Users/filipgadzinski/Unveil/image-tunnel.html`, specifically `buildModel`, `sampleAlongRibbon`, `perimeterPoint`, `buildSVG`, default state, ribbon/sampling controls, and the final Canvas 2D composite; the supplied radial reference; and the live `/warp` result before/after the adaptation.
- Reference inputs: `/Users/filipgadzinski/Unveil/image-tunnel.html`; `/var/folders/t4/k6gz0smn2s1dmzsnxr0ycs3m0000gn/T/codex-clipboard-008d01f0-55f8-4c14-95e3-a1f588c54326.png`; user direction to extrapolate the Image Tunnel idea rather than copy it 1:1.
- Docs/contracts read: `AGENTS.md`, workflow, runtime boundary, core/performance, renderer technique, performance, acceptance testing, decision contract, and the brainstorming, writing-plans, systematic-debugging, browser, and in-app-browser control skills.
- Contract rules applied: `canvas-no-app-ui`, `canvas-surface-preserved`, `canvas-handle-placement`, `controls-product-coverage`, `output-export-required`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, and `workflow-required`.
- Decision: Preserve the inspected reference's essential model—many solid wedges converging at one throat and source colors sampled along each wedge—but implement it as one WebGL texture lookup per output pixel rather than regenerating 500 SVG paths and CPU pixel buffers. Quantize aspect-correct angle into ribbon centers, find each ribbon's canvas-edge intersection, compress its sampled radial source span with Stretch, and map it from Throat to perimeter. Preview and export share the same deterministic shader.
- Alternatives rejected: Weighted zoom blur reads as low-opacity repeated images; candidate ray search still implies multiple copies; generic radial coordinate warps bend the entire photo into a wormhole; copying Unveil's full SVG/Canvas pipeline and extensive color/depth controls would violate the request not to clone 1:1 and add CPU/export complexity; lowering render scale would reduce fidelity.
- State/output mapping: `warp.focus` sets the ribbon throat and editing handle; `warp.strength`/Stretch compresses the sampled radial strip; `warp.softness`/Ribbons maps 0–100 to 64–512 angular wedges; `warp.falloff`/Throat preserves the focal center; `warp.blend` optionally mixes the source with the full ribbon result; media transform, background, canvas size, and Image Export remain on the cached shared WebGL path.
- Files changed: `src/app/warp-renderer.tsx`, `src/app/warp-schema.ts`, `src/app/warp-performance.ts`, `e2e/warp.spec.ts`, `docs/warp-spec.md`, `docs/warp-plan.md`, and this worklog.
- Verification: `npm run typecheck` and Warp schema tests passed; `npm run verify:quick` passed 12/12 script tests and 221/221 app/contract tests; updated functional Chromium acceptance passed 3/3 for stable opaque output, Stretch/Ribbons/Focus interaction, and JPG export; targeted `browser perf: warp strength maximum stays responsive` passed with a 3840×2160 source at Resolution scale 2; in-app-browser inspection confirmed dense solid perspective ribbons, a tight selectable throat, no refining animation, and no repeated blurred image layers.
- Skipped checks: The full global browser performance checkpoint is not required for this post-first-working renderer correction because the focused 4K maximum-Stretch scenario directly covers the changed single-lookup ribbon shader; the canonical root product and copied Toolcraft runtime are unchanged.
- Risks: WebGL 2 remains required; deliberately low Ribbons values expose visible wedge edges; the adaptation samples one centerline per ribbon and intentionally omits Unveil's optional gradient-map, seam, depth-bloom, and Center Image systems.

### Iteration — Replace wormhole displacement with straight zoom blur

- Request: Remove the wormhole-like bending around the focal point and produce a true zoom blur that stretches pixels outward into long perspective streaks from the chosen focus.
- Task type: Tier 3 renderer/canvas visual correction with control semantics, preview/export parity, browser acceptance, and targeted 4K performance verification.
- User-visible result: Warp now renders straight, high-speed zoom streaks that converge on the draggable focus without bending or nesting the underlying image. The result is immediate, opaque, and color-preserving.
- Source/reference checked: The supplied radial zoom-blur reference, the live `/warp` canvas before and after the fix, the WebGL shader, functional browser acceptance, and the focused 3840×2160 Strength workload.
- Reference inputs: `/var/folders/t4/k6gz0smn2s1dmzsnxr0ycs3m0000gn/T/codex-clipboard-008d01f0-55f8-4c14-95e3-a1f588c54326.png`; user report that the radial coordinate warp looked like a wormhole instead of stretched pixels.
- Docs/contracts read: `AGENTS.md`, workflow, renderer/performance/acceptance contracts, and the brainstorming, writing-plans, systematic-debugging, browser, and in-app-browser control skills.
- Contract rules applied: `canvas-no-app-ui`, `canvas-surface-preserved`, `canvas-handle-placement`, `controls-product-coverage`, `output-export-required`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, and `workflow-required`.
- Decision: Delete nonlinear radial coordinate remapping. For every output pixel, gather five linearly filtered source samples only along the straight segment toward `warp.focus`; Strength controls segment length, Softness controls perspective spacing and trail weights, Focus falloff preserves the convergence area, and Blend mixes the finished streak with the source. Retain the brightest real sampled color, maximum sampled alpha, and mild contrast restoration so the trail remains solid rather than washed out. Preview and export use the same single-frame shader.
- Alternatives rejected: Radial exponent displacement bends geometry into nested contours; progressive accumulation visibly animates and averages toward transparency; per-channel maxima can invent false colors; lowering render scale would reduce canvas fidelity; twelve, eight, and seven fixed samples preserved the look but missed the declared 4K frame-gap budget in the test browser.
- State/output mapping: `warp.focus` defines the straight-ray convergence point and overlay handle; `warp.strength` controls trail length; `warp.softness` controls sample distribution and definition; `warp.falloff` controls the sharp center radius; `warp.blend` mixes original and zoom-blurred pixels; media transforms, background, canvas sizing, and image export continue through the existing cached WebGL path.
- Files changed: `src/app/warp-renderer.tsx`, `src/app/warp-schema.ts`, `src/app/warp-performance.ts`, `docs/warp-spec.md`, `docs/warp-plan.md`, and this worklog.
- Verification: `npm run typecheck` passed; Warp schema tests passed 2/2; `npm run verify:quick` passed 12/12 script tests and 221/221 app/contract tests; functional Chromium acceptance passed 3/3 for stable opaque rendering, live Strength/Softness/Focus changes, and JPG export; targeted `browser perf: warp strength maximum stays responsive` passed with a 3840×2160 source at Resolution scale 2 after reducing the fixed gather from twelve to five samples; in-app-browser inspection confirmed long straight streaks, solid color, no progressive refining, and no wormhole contours.
- Skipped checks: The full global browser performance checkpoint is not required for this post-first-working renderer correction because the focused 4K maximum-Strength scenario directly covers the changed shader workload; the canonical root product and global runtime are unchanged.
- Risks: WebGL 2 remains required; very high Strength intentionally draws from a narrow region toward the focus; the bounded five-sample kernel prioritizes defined stretched pixels and live 4K responsiveness over a uniformly soft photographic average.

### Iteration — Replace progressive blur with solid radial stretch

- Request: Remove the visible apply-time animation and transparent/washed-out blur; make the result look like pixels stretched outward from the selected focus.
- Task type: Tier 3 renderer behavior correction, Warp control semantics, preview/export pixel mapping, browser acceptance, and targeted 4K performance verification.
- User-visible result: Warp now draws one completed frame per control change, defaults Blend to 100%, replaces Samples with Softness, preserves opaque source pixels, and stretches source coordinates outward through a nonlinear radial displacement rather than averaging dozens of ghost samples.
- Source/reference checked: The supplied radial-ray reference, the current `/warp` preview in the in-app browser, current shader source, progressive frame scheduler, functional browser suite, and 4K workload scenario.
- Reference inputs: `/var/folders/t4/k6gz0smn2s1dmzsnxr0ycs3m0000gn/T/codex-clipboard-008d01f0-55f8-4c14-95e3-a1f588c54326.png`; user report that the applied effect animated and appeared transparent rather than stretched.
- Docs/contracts read: `AGENTS.md`, workflow, control selection, layout, schema reference, component rules, acceptance testing, core/performance, renderer technique, and the brainstorming, writing-plans, systematic-debugging, browser, and in-app-browser control skills.
- Contract rules applied: `canvas-no-app-ui`, `canvas-surface-preserved`, `canvas-handle-placement`, `controls-product-coverage`, `output-export-required`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, and `workflow-required`.
- Decision: Delete frame-by-frame accumulation and replace it with one aspect-correct radial-distance remap. Stretch Strength changes the nonlinear radial exponent; Focus falloff preserves the authored center; Softness uses a fixed three-tap kernel around the displaced coordinate; Blend defaults to the fully opaque stretched result. The preview and export now run the same stable shader model.
- Alternatives rejected: Keeping progressive samples preserves the unwanted animation; atomically swapping a hidden accumulated result would still produce washed-out averaging; lowering render scale would reduce fidelity; canvas-edge-normalized displacement created rectangular tunnel contours during browser inspection and was replaced by an aspect-correct farthest-corner radius.
- State/output mapping: `warp.focus` defines the displacement origin and handle; `warp.strength` controls radial exponent; `warp.softness` controls the narrow three-tap spacing; `warp.falloff` controls the preserved focus radius; `warp.blend` mixes original and displaced pixels; cached media texture, background behavior, image export choices, and canvas sizing remain unchanged.
- Files changed: `src/app/warp-schema.ts`, `src/app/warp-renderer.tsx`, `src/app/warp-performance.ts`, `src/app/warp-schema.test.ts`, `e2e/warp.spec.ts`, `docs/warp-spec.md`, `docs/warp-plan.md`, and this worklog.
- Verification: `npm run verify:quick` passed 12/12 script tests and 221/221 app/contract tests; `npm run typecheck` passed; Warp schema tests passed 2/2; functional Chromium acceptance passed 3/3 and now proves a stable unchanged frame after 250 ms plus alpha 255 for the opaque reference; targeted `browser perf: warp strength maximum stays responsive` passed with a 3840×2160 source at Resolution scale 2; in-app-browser inspection confirmed immediate solid radial displacement, 100% Blend, and no refining sequence.
- Skipped checks: The full global browser performance checkpoint is not required for this post-first-working visual correction because the focused 4K Strength workload directly covers the changed single-pass renderer; the canonical root renderer and global performance contract are unchanged.
- Risks: WebGL 2 remains required; extreme Strength intentionally repeats a narrow source region across long rays; the three-tap Softness kernel is bounded to preserve contrast and opacity rather than reproducing photographic multi-sample blur.

### Iteration — Add the Radial Warp secondary tool

- Request: Add a new tool under `/warp` that uses a chosen focal point to stretch photographic pixels outward into a blurred ray field matching the supplied references.
- Task type: Tier 3 secondary route, schema/product behavior, media upload, WebGL renderer, editing handle, still export, and targeted performance coverage.
- User-visible result: `/warp` opens Radial Warp with image upload, a built-in Focus Vector, a draggable focal handle, Strength/Samples/Focus falloff/Blend controls, editable output sizing, background control, and PNG/JPG export at 2K/4K/8K.
- Source/reference checked: Both supplied PNG references were inspected at original resolution; the first defines continuous color-preserving radial streak output and the second defines focal-point direct manipulation without making guide paths part of the final product.
- Reference inputs: `/var/folders/t4/k6gz0smn2s1dmzsnxr0ycs3m0000gn/T/codex-clipboard-008d01f0-55f8-4c14-95e3-a1f588c54326.png`; `/var/folders/t4/k6gz0smn2s1dmzsnxr0ycs3m0000gn/T/codex-clipboard-cd9ec9c2-629a-4956-ae48-4830434344df.png`.
- Docs/contracts read: `AGENTS.md`, workflow, runtime boundary, assembly workflow, decision contract, reference study, control selection, layout, schema reference, component rules, acceptance testing, core/performance, renderer technique, performance, setup/export, media upload, and the brainstorming, writing-plans, systematic-debugging, and browser skills.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `canvas-surface-preserved`, `canvas-handle-placement`, `layers-enable-only-when-needed`, `timeline-mode-choice`, `controls-product-coverage`, `output-export-required`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.
- Decision: Use one cached WebGL 2 source texture and radial fragment sampling rather than decorative SVG paths; keep the focal point in runtime state and expose the handle only as a non-exported product editing overlay. Preserve full selected backing resolution and converge preview quality through one-sample progressive GPU batches, while export runs the exact complete sample set.
- Alternatives rejected: Canvas 2D multiplies high-resolution pixel count by sample count on the main thread; SVG/DOM cannot resample arbitrary photographic pixels; drawing reference-style guide rays would imitate editor chrome rather than create the requested blur; reducing render scale would violate selected preview fidelity.
- State/output mapping: `warp.source` selects the runtime media asset and cached texture; `warp.focus` drives the shader origin and handle position; Strength/Samples/Focus falloff/Blend update shader sampling; media transforms affect cover/crop sampling; Background controls preview/export composition; Image Export choices and `warp.exportAction` feed the standard Toolcraft export canvas.
- Files changed: `src/app/warp-schema.ts`, `src/app/warp-renderer.tsx`, `src/app/warp-performance.ts`, `src/app/warp-schema.test.ts`, `src/routes/warp.tsx`, `src/routes/root.tsx`, `e2e/warp.spec.ts`, `docs/warp-spec.md`, `docs/warp-plan.md`, and this worklog.
- Verification: `npm run verify:quick` passed 12/12 script tests and 221/221 app/contract tests; `npm run typecheck` passed; Warp schema tests passed 2/2; functional Chromium acceptance passed 3/3 for first upload, live pixels/focus drag, and real JPG download; targeted `browser perf: warp.samples workload is covered` passed at a 3840×2160 source, Resolution scale 2, and 64 samples; original-resolution browser screenshot inspection confirmed the converging ray output and clean handle overlay; `npm run dev` verified this app at `http://127.0.0.1:3002/`.
- Skipped checks: The full global browser performance checkpoint is not required for this post-first-working app feature because the focused Warp 4K/64-sample workload scenario directly covers the touched renderer path; the canonical root renderer and global performance contract are unchanged.
- Risks: WebGL 2 is required; 8K still export remains intentionally heavy; software-rendered browsers progressively refine high sample counts over more frames, while the completed preview and export retain the full selected sample count and backing resolution.

### Iteration — Heat Vision secondary route

- Request: Keep Radial Clip as the main local tool and expose the existing Heat Vision tool under `/heat`.
- Task type: Tier 3 route and secondary Toolcraft app restoration.
- User-visible result: `/` remains Radial Clip Lab while `/heat` opens the full Thermal/Dots image-and-video tool.
- Reference inputs: Exact Heat Vision source recovered from the local Codex session history for this workspace.
- Source/reference checked: Current TanStack route tree, Radial Clip route, and the recovered final Heat Vision schema/renderer including video, color bleed, dots, blur, bloom, and animated grain.
- Docs/contracts read: workflow, runtime boundary, assembly workflow, decision contract, brainstorming, and writing-plans.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `timeline-enabled-behavior`, `output-export-required`, and `workflow-required`.
- Decision: Register Heat Vision as an independent ToolcraftApp route at `/heat`; leave the index and `/clip-lab` routes untouched.
- Alternatives rejected: Replacing `/` would remove the user’s main tool; merging both control schemas would couple unrelated product state.
- State/output mapping: `/heat` owns its separate heat schema, media state, timeline, renderer, and export action handler.
- Files changed: recovered heat schema/renderer, new Heat route, route tree, and worklog.
- Verification: Focused typecheck and direct `/heat` URL inspection cover this route restoration.
- Skipped checks: The full global performance checkpoint was not required for that post-first-working secondary-route restoration; the canonical root renderer and workload limits were unchanged.
- Risks: The two Toolcraft apps share the same browser origin, so runtime UI preferences may share origin-scoped storage where the runtime does not namespace them.

### Iteration — Promote Clip Lab for deployment

- Request: Keep Clip Lab and remove the previous files so the app is ready to deploy.
- Task type: Tier 4 product promotion, route consolidation, legacy product removal, contract realignment, dependency cleanup, and final delivery verification.
- User-visible result: Radial Clip Lab opens directly at `/`; `/clip-lab` remains a safe alias; no previous product UI, renderer, metadata, or tests remain in the deployable app.
- Source/reference checked: Existing Clip Lab schema, renderer, route, focused browser suite, product spec, package manifest, route tree, and all legacy product files.
- Reference inputs: Existing accepted Clip Lab behavior and local implementation; no external reference is required for this cleanup.
- Docs/contracts read: `AGENTS.md`, `docs/toolcraft/workflow.md`, runtime boundary, assembly workflow, decision contract, and the brainstorming, writing-plans, and browser skills.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `timeline-mode-choice`, `timeline-enabled-behavior`, `controls-product-coverage`, `output-export-required`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.
- Decision: Re-export Clip Lab through canonical root app files, keep one compatibility alias, delete legacy app-specific files, and leave copied Toolcraft runtime files untouched.
- Alternatives rejected: Redirecting `/` would add an unnecessary navigation hop; deleting `/clip-lab` would break the open route and bookmarks; retaining unused legacy renderers and product contracts would leave ambiguous deploy scope.
- State/output mapping: `appSchema` resolves to `clipLabSchema`; both routes render `ClipLabHome`; all controls write the existing `clip.*` and export targets; the renderer and delivery functions remain the single output implementation.
- Files changed: Root schema/route metadata, Clip Lab schema metadata, app acceptance/performance contracts, product tests/docs/worklog, dependency manifest/lockfile, and deletion of legacy product files.
- Verification: `npm run verify:final` passed 219 app/contract tests, the production build, and 6/6 functional browser tests; the focused maximum-ray workload passed 1/1; the saved server identity resolved at `http://127.0.0.1:3002/`.
- Skipped checks: Browser performance checkpoint not required for this post-first-working non-performance cleanup; focused maximum-ray performance coverage remains part of the delivery gate.
- Risks: A compatibility alias remains intentionally, so future route-specific analytics should canonicalize both paths to the same product identity.

### Iteration — Flatten copied motion frames into solid SVG paths

- Request: Stop Copy SVG from producing dashed strokes.
- Task type: Tier 3 export and native SVG renderer correction.
- User-visible result: Copy SVG now turns every currently visible animated trail window into a separate solid cubic path; copied still frames contain no dash or normalized-path-length attributes.
- Source/reference checked: Current-frame SVG serializer, motion-window model, authored cubic path builder, focused clipboard browser test, and the user's report about dashed copied strokes.
- Reference inputs: User-observed copied SVG behavior; no new external visual reference.
- Docs/contracts read: `AGENTS.md`, `docs/toolcraft/workflow.md`, runtime boundary, setup/export, media upload, timeline animation, renderer technique, acceptance, performance, schema/component rules, decision contract, and the brainstorming, writing-plans, systematic-debugging, browser, and in-app-browser control skills.
- Contract rules applied: `canvas-no-app-ui`, `timeline-enabled-behavior`, `output-export-required`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, and `workflow-required`.
- Decision: Preserve the accepted live/animated dash-window model, but geometrically slice the original Catmull-Rom-derived cubic segments at current-frame arc-length boundaries when creating a still SVG payload.
- Alternatives rejected: Keeping normalized `pathLength="1"` dash attributes remains editor-dependent; sampling the window into new straight chords would reduce curve fidelity; changing live animation or Animated SVG would expand scope and remove the efficient periodic motion representation.
- State/output mapping: Timeline progress and Motion settings still create the same `ClipMotionFrame`; Copy SVG maps each copy's normalized visible start/length through the original cubic arc table, splits boundary cubics with De Casteljau subdivision, and serializes the resulting solid path with the existing moving gradient.
- Files changed: `src/app/clip-lab-renderer.tsx`, `src/app/app-acceptance.ts`, `e2e/clip-lab.spec.ts`, `docs/clip-lab-spec.md`, and `docs/toolcraft/agent-worklog.md`.
- Verification: `npm run typecheck` passed; focused browser test `browser: clip lab copies real PNG and native SVG payloads` passed 1/1; `npm run verify:quick` passed 12/12 port tests and 219/219 app/contract tests; the in-app browser loaded the root SVG renderer with no console errors.
- Skipped checks: Full browser performance checkpoint not required for this post-first-working export correction; the live renderer, video loop, workload limits, and Animated SVG animation were not changed.
- Risks: Animated SVG intentionally retains dash attributes because they are its native animation mechanism; extremely small visible windows may round to short solid paths, matching the existing minimum visible-length filter.

### Iteration — Preserve Path Blur source orientation

- Request: Explain and correct why the Path Blur source image appeared flipped.
- Task type: Tier 3 renderer/canvas visual mismatch correction.
- User-visible result: Path Blur preview and still export preserve the source image's top, bottom, left, and right orientation.
- Source/reference checked: WebGL texture upload state, fragment shader UV mapping, shared preview/export renderer, and an asymmetric red-top/blue-bottom/green-left SVG fixture.
- Reference inputs: The user's flipped-image report and the renderer's actual before-fix canvas pixels.
- Docs/contracts read: Toolcraft workflow, runtime boundary, performance, systematic-debugging, brainstorming, writing-plans, browser, and in-app browser control instructions.
- Contract rules applied: `canvas-no-app-ui`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, and `workflow-required`.
- Decision: Remove the redundant `UNPACK_FLIP_Y_WEBGL` texture upload transform because shader sampling already converts the bottom-left WebGL fragment coordinates into top-left image UV coordinates.
- Alternatives rejected: Flipping the final canvas or export only would leave preview/export inconsistent; changing the shader coordinate convention would touch focus math and media transforms unnecessarily.
- State/output mapping: The source texture now uploads in its native row order; existing `outputUv` and cover/crop transforms remain the single orientation mapping shared by preview and export.
- Files changed: `src/app/warp-renderer.tsx`, `e2e/warp.spec.ts`, and this worklog.
- Verification: `npm run verify:quick` passed 12/12 script tests and 221/221 app tests; focused Chromium Warp acceptance passed 4/4, including direct canvas color sampling that proves red remains at the top and blue at the bottom.
- Skipped checks: The full performance checkpoint is not required for a one-line texture orientation correction that does not change shader workload, resolution, or interaction cost.
- Risks: None beyond WebGL implementation availability already declared for the renderer.

### Iteration — Click mode dashboard

- Request: Connect Clip Lab and Path Blur under a branded screen at the base URL using the supplied Click logo.
- Task type: Tier 2 route and product-navigation behavior.
- User-visible result: `/` now presents the Click identity and two responsive visual mode cards; Clip Lab opens `/clip-lab` and Path Blur opens `/warp`.
- Source/reference checked: Supplied logo SVG, current TanStack route tree, existing Clip Lab and Warp Toolcraft routes, global typography/colors, and browser route labels.
- Reference inputs: The exact inline Click logo supplied by the user and the two existing product experiences.
- Docs/contracts read: Toolcraft workflow, runtime boundary, brainstorming, writing-plans, browser, and the existing product worklog.
- Contract rules applied: `runtime-shell-required` for each editor route, `canvas-no-app-ui` by keeping navigation outside product canvas output, `acceptance-product-observable`, and `workflow-required`.
- Decision: Make the base URL a lightweight React/SVG/CSS launcher, preserve both existing product URLs, and present the Warp product to users as “Path Blur” without renaming its stable route.
- Alternatives rejected: Embedding both editors on one page would duplicate runtime state and reduce clarity; redirecting `/` to one product would not provide the requested mode choice; renaming `/warp` would break current bookmarks.
- State/output mapping: Dashboard cards perform route navigation only; product state, canvas output, persistence, controls, and exports remain owned by the selected Toolcraft app.
- Files changed: `src/routes/index.tsx`, `src/styles.css`, `e2e/dashboard.spec.ts`, `docs/dashboard-spec.md`, `docs/dashboard-plan.md`, and this worklog.
- Verification: `npm run typecheck` passed; `npm run verify:quick` passed 12/12 script tests and 221/221 app tests; focused browser acceptance verifies the logo, heading, both card destinations, destination Toolcraft panel titles, single-column mobile layout, and absence of horizontal overflow; in-app browser inspection confirmed the final desktop composition at the live root URL.
- Skipped checks: Renderer performance checks are not required because neither product renderer, workload control, canvas, export, timeline, nor layers changed.
- Risks: “Path Blur” is the user-facing mode name while the stable implementation route remains `/warp`; future analytics should map that URL to the display name.

### Iteration — Reduce dashboard to a minimal mode launcher

- Request: Simplify the dashboard to match the supplied reference: black screen, centered Click logo, and two compact buttons.
- Task type: Tier 1 root-route presentation correction.
- User-visible result: `/` now contains only the compact white Click mark and the Speed Rays and Speed Blur buttons centered on a pure black screen.
- Source/reference checked: The supplied 2048×1152 launcher screenshot, current root component and CSS, and both stable product routes.
- Reference inputs: User-provided screenshot showing the exact content hierarchy, negative space, dark button styling, and centered composition.
- Docs/contracts read: Toolcraft workflow, runtime boundary, assembly workflow, decision contract, systematic-debugging, brainstorming, writing-plans, and browser instructions.
- Contract rules applied: `runtime-shell-required` for destination editors, `canvas-no-app-ui` by keeping the launcher outside product canvas output, `acceptance-product-observable`, and `workflow-required`.
- Decision: Remove cards, preview artwork, headings, descriptions, grid texture, glow, footer, and decorative motion; retain only the semantic logo and two route links with subdued hover and visible keyboard focus.
- Alternatives rejected: Scaling down the complex cards would retain the wrong information hierarchy; keeping preview art would conflict with the reference's deliberate empty space.
- State/output mapping: Speed Rays navigates to the existing Clip Lab Toolcraft app at `/clip-lab`; Speed Blur navigates to the existing Path Blur Toolcraft app at `/warp`; no product state or renderer behavior changes.
- Files changed: `src/routes/index.tsx`, `src/styles.css`, `e2e/dashboard.spec.ts`, `docs/dashboard-spec.md`, `docs/dashboard-plan.md`, and this worklog.
- Verification: `npm run typecheck` passed; focused Chromium acceptance passed 1/1 and verifies both visible labels, both destination editor titles, and no horizontal overflow at a 390×844 viewport.
- Skipped checks: The full performance checkpoint is explicitly not required for this post-first-working non-performance edit because schemas, canvas output, controls, exports, and renderer workload are unchanged; the final pre-deploy gate covers the app and browser suites.
- Risks: The 118px logo and 48px buttons intentionally follow the compact reference scale and may feel understated on very large displays.

### Iteration — Align browser gate with the mode launcher routes

- Request: Publish the connected Click tools to Vercel.
- Task type: Tier 4 final pre-deployment verification and preview deployment.
- User-visible result: The deployable browser suite enters Clip Lab through `/clip-lab`, matching the new root launcher instead of assuming Clip Lab still occupies `/`.
- Source/reference checked: Full `npm run verify:final` failure output, Clip Lab Playwright setup, dashboard route tree, and focused dashboard navigation coverage.
- Reference inputs: The accepted root launcher with Speed Rays linking to `/clip-lab` and Speed Blur linking to `/warp`.
- Docs/contracts read: Vercel deployment skill, Vercel CLI guidance, Toolcraft workflow, systematic-debugging, and browser acceptance contract.
- Contract rules applied: `runtime-shell-required`, `acceptance-product-observable`, `workflow-required`, and the Tier 4 final gate.
- Decision: Change only the Clip Lab browser suite's entry URL and stale root-product test title; retain every Clip Lab behavior assertion and dedicated route.
- Alternatives rejected: Redirecting `/` back to Clip Lab would remove the requested launcher; bypassing the failing full gate would publish with invalid acceptance coverage.
- State/output mapping: Browser acceptance now follows the same Speed Rays destination used by the launcher; product controls, renderer, media, timeline, and export mappings are unchanged.
- Files changed: `e2e/clip-lab.spec.ts` and this worklog.
- Verification: The corrected full final gate is rerun before the Vercel deployment command.
- Skipped checks: The full performance checkpoint is explicitly not required for this post-first-working navigation-test alignment because no product renderer or workload changed.
- Risks: None; `/clip-lab` was already the stable dedicated product route.

### Iteration — Paste images into both creative modes

- Request: Support `Cmd+V` image import in Speed Rays and Speed Blur, then publish the finished change to production.
- Task type: Tier 3 shared app-level media import behavior plus Tier 4 production deployment gate.
- User-visible result: Pasting a copied image anywhere outside an active text-editing field replaces the current source image in either mode and immediately updates that mode's product output.
- Source/reference checked: Existing FileDrop and canvas-drop `media.import` flows, both renderer source targets, runtime media reducer replacement behavior, the prior Heat renderer paste pattern, and focused browser paste payloads.
- Reference inputs: User request for direct image clipboard paste in both tools; no external visual reference.
- Docs/contracts read: Toolcraft workflow, runtime boundary, media upload, acceptance testing, decision contract, performance modules, brainstorming, writing-plans, browser, and Vercel deployment workflow.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `controls-product-coverage`, `acceptance-product-observable`, `performance-coverage-levels`, and `workflow-required`.
- Decision: Add one app-level hook under `src/app` that decodes clipboard image files, preserves their natural dimensions, and dispatches the existing `media.import` command to the renderer-specific source target; keep copied Toolcraft runtime files unchanged.
- Alternatives rejected: Adding separate route-local file state would bypass runtime reset/transforms/export; patching the copied runtime would fail source-integrity and broaden the behavior beyond the two requested modes; intercepting paste inside text fields would break ordinary editing.
- State/output mapping: Speed Rays maps pasted files to `clip.source`; Speed Blur maps them to `warp.source`; single-layer `replaceExisting` preserves the existing media lifecycle while each renderer consumes the new runtime asset.
- Files changed: `src/app/use-clipboard-image-import.ts`, both product renderers, `e2e/clipboard-image-paste.spec.ts`, `docs/clipboard-image-paste-plan.md`, and this worklog.
- Verification: Focused Chromium acceptance passed 3/3 for Speed Rays paste, Speed Blur paste, and focused text-field ownership; targeted full-HD/4K raster import performance passed 1/1, with Speed Rays inside its existing 120ms frame budget and Speed Blur's measured one-time 4K decode/texture-upload/first-draw cost covered by its source-import-only 400ms ceiling; `npm run verify:final` passed 221/221 app tests, the production build, and 14/14 functional browser tests.
- Skipped checks: The full performance checkpoint is explicitly not required for this post-first-working non-performance edit; targeted full-HD Speed Rays and 4K Speed Blur media-import budgets exercise the exact pasted-image path.
- Risks: Browsers expose copied image data only when the clipboard contains an image file; a copied remote image URL or HTML fragment without an image file remains normal clipboard content.

### Iteration — Click Tools browser identity

- Request: Replace the favicon with the supplied Click icon, rename the page to “Click Tools,” and publish the update to production.
- Task type: Tier 0 branding metadata plus production deployment.
- User-visible result: Browser tabs display “Click Tools” with the supplied lavender Click icon on every route.
- Source/reference checked: Supplied 96×96 PNG, current HTML title, Toolcraft server identity marker, and root browser acceptance.
- Reference inputs: `/var/folders/t4/k6gz0smn2s1dmzsnxr0ycs3m0000gn/T/codex-clipboard-a866b13c-aae1-46b7-9ee6-0772eabd21b7.png`.
- Docs/contracts read: Toolcraft workflow, browser verification skill, and Vercel production deployment workflow.
- Contract rules applied: `workflow-required` and the Toolcraft server identity requirement.
- Decision: Embed the exact supplied PNG as the document favicon data URL and update both `<title>` and `toolcraft-app-title` so browser branding and local server identity stay aligned.
- Alternatives rejected: Redrawing the icon as SVG could alter the supplied artwork; changing only `<title>` would leave the Toolcraft identity marker stale.
- State/output mapping: Static document metadata affects browser identity only; routes, runtime state, canvases, controls, media, and exports remain unchanged.
- Files changed: `index.html`, `e2e/dashboard.spec.ts`, and this worklog.
- Verification: `npm run build` passed and emitted the updated HTML metadata; focused Chromium acceptance passed 1/1 and verifies the “Click Tools” title, exact PNG favicon data source, launcher, and both route destinations before production deployment.
- Skipped checks: The full performance checkpoint is explicitly not required for this post-first-working metadata-only edit because no runtime or renderer workload changed.
- Risks: Data-URL favicon caching is browser-managed; a hard refresh may be needed in an already-open tab.

### Iteration — Warp source-native canvas size

- Request: Remove image-size controls from Warp so uploading or pasting an image uses that image's native resolution, then publish to production.
- Task type: Tier 3 canvas sizing, media import, preview backing, and export-aspect behavior plus Tier 4 production deployment gate.
- User-visible result: Speed Blur no longer exposes Aspect ratio, Canvas width, or Canvas height; each uploaded or pasted image immediately owns the Warp canvas dimensions at its natural pixel size.
- Source/reference checked: Warp schema, runtime intrinsic-media reducer behavior, FileDrop and clipboard media assets with decoded natural size, renderer canvas backing calculation, export helper state sizing, and focused browser tests.
- Reference inputs: User request for pasted-image resolution to own Warp output; no external visual reference.
- Docs/contracts read: Toolcraft workflow, runtime boundary, media upload, setup/export, acceptance testing, brainstorming, writing-plans, and browser instructions.
- Contract rules applied: `canvas-surface-preserved`, `controls-product-coverage`, `output-export-required`, `acceptance-product-observable`, `performance-coverage-levels`, and `workflow-required`.
- Decision: Use the runtime's `intrinsic-media` sizing mode for Warp only and default its retained Resolution scale to 1× so native image dimensions produce native backing pixels without an automatic 8K preview from a 4K source; retain runtime media commands, background, image-export controls, focus handle, and the existing WebGL/export renderer.
- Alternatives rejected: Hiding editable-output controls with CSS would leave the wrong state model; route-local canvas resizing would bypass runtime history/reset; changing Clip Lab would exceed the requested mode scope.
- State/output mapping: `warp.source` media import supplies `asset.size`; the runtime writes that to `state.canvas.size`; Warp preview CSS dimensions, WebGL backing pixels, focus geometry, and export aspect all read the same runtime canvas size.
- Files changed: `src/app/warp-schema.ts`, its schema test, Warp and clipboard browser acceptance, Warp spec/plan, and this worklog.
- Verification: `npm run verify:quick` passed 221/221 app tests; focused browser acceptance passed 7/7 and proves file upload and clipboard paste adopt source dimensions, Warp canvas-size controls are absent, source/native backing pixels match at the 1× default, orientation is preserved, controls remain live, and export succeeds; the isolated 4K intrinsic clipboard import passed its source-import performance budget 1/1; `npm run verify:final` passed 221/221 app tests, the production build, and 14/14 functional browser tests.
- Skipped checks: The full performance checkpoint is explicitly not required for this post-first-working non-performance edit; the targeted 4K Warp source-import scenario covers the larger intrinsic backing workload, while unchanged Speed Rays retains its previously verified media path.
- Risks: Very large source images create correspondingly large preview canvases; users can opt into 2× backing, while the default 1× path and targeted 4K import budget guard the normal workload.

### Iteration — Remove high-Motion Warp grain

- Request: Investigate the remaining Warp noise and test whether smoothing that increases away from the focal point can remove it.
- Task type: Tier 3 visual mismatch and performance-sensitive WebGL renderer correction.
- User-visible result: High Motion produces a stable long-exposure zoom streak without the prior per-pixel grain; the integrated blur span grows naturally away from the chosen focus while the protected focal area remains readable.
- Source/reference checked: The current Warp fragment shader, its `gl_FragCoord`-seeded `exposureJitter`, the supplied woodland long-exposure reference, real local maximum-Motion browser output, and the declared 4K source/2× responsiveness workloads.
- Reference inputs: `/var/folders/t4/k6gz0smn2s1dmzsnxr0ycs3m0000gn/T/codex-clipboard-4607505c-c45d-4f20-9a11-1c9013af6c89.png` and the user's progressive-distance blur suggestion.
- Docs/contracts read: Toolcraft workflow, decision contract, runtime boundary, renderer technique, core/app performance, acceptance testing, brainstorming, writing-plans, systematic-debugging, browser verification, and in-app browser control instructions.
- Contract rules applied: `canvas-no-app-ui`, `canvas-surface-preserved`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, and `workflow-required`.
- Decision: Remove fragment-coordinate stochastic jitter and use six centered deterministic samples along each straight radial exposure path. Because the physical sample span is proportional to pixel distance from the focus, smoothing increases progressively outward without adding a separate blur layer or preprocessing pass.
- Alternatives rejected: Keeping stochastic jitter retains visible high-Motion grain; a capped mipmapped progressive blur looked smooth but failed the 4K import and Motion budgets at 639.1 ms and 370.8 ms frame gaps respectively; eight samples previously exceeded live 4K responsiveness; lowering render scale or source fidelity would violate the quality contract.
- State/output mapping: `warp.strength` still controls radial travel, `warp.softness` controls deterministic sample distribution/weighting, `warp.falloff` protects the focal region, and `warp.blend` mixes the same original texture with the completed exposure; preview and export share this shader.
- Files changed: `src/app/warp-renderer.tsx`, `src/app/warp-renderer.test.ts`, `src/app/warp-schema.ts`, `src/app/warp-performance.ts`, `docs/warp-spec.md`, `docs/warp-plan.md`, `docs/warp-progressive-blur-plan.md`, and this worklog.
- Verification: `npm run verify:quick` passed 222/222 app/contract tests; focused Warp Chromium acceptance passed 4/4 for import, orientation, live Motion/focus pixels, and export; the 4K intrinsic paste and maximum-Motion/2× targeted budgets passed 2/2 after rejecting the mip path; in-app browser inspection at Motion 100 showed stable continuous outward streaks with no shader/runtime warnings; `npm run verify:final` passed 222/222 app/contract tests, the production build, and 14/14 functional browser tests.
- Skipped checks: The full global performance suite is not required for this post-first-working visual correction; both changed workload paths—the source upload and maximum-Motion redraw—ran their declared 4K targeted budgets, while unrelated Clip Lab workloads are unchanged.
- Risks: Six deterministic samples can reveal structured separation on unusually high-frequency source patterns at maximum travel, but avoids stochastic grain and stays inside the guaranteed live 4K budget; WebGL 2 remains required.

### Iteration — Restore the previous Warp exposure look

- Request: Undo the progressive/deterministic Warp experiment because the previous result looked better.
- Task type: Tier 3 user-directed renderer rollback with preview/export pixel impact.
- User-visible result: Warp again uses the exact prior stratified six-sample exposure, restoring the softer continuous high-Motion appearance preferred by the user.
- Source/reference checked: The immediately preceding deterministic renderer, the earlier accepted `exposureJitter` shader recorded in this worklog/spec, and the user's direct visual comparison in the local app.
- Reference inputs: User feedback that the previous Warp result was better; no new external asset.
- Docs/contracts read: Toolcraft workflow, decision contract, runtime boundary, renderer technique, core performance, brainstorming, writing-plans, systematic-debugging, and the existing acceptance/performance contract context.
- Contract rules applied: `canvas-no-app-ui`, `canvas-surface-preserved`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, and `workflow-required`.
- Decision: Restore `exposureJitter(gl_FragCoord.xy, index)` and the prior stratified progress calculation exactly; remove the progressive-blur-only test/plan while leaving intrinsic media sizing, clipboard import, controls, background, focus handle, and export unchanged.
- Alternatives rejected: Further tuning the deterministic variant would ignore the user's direct preference; reverting broader Warp/media changes would unnecessarily remove accepted native-size and paste behavior.
- State/output mapping: Runtime targets and commands are unchanged; only the fragment sampling positions used by the shared preview/export shader return to the prior calculation.
- Files changed: `src/app/warp-renderer.tsx`, `src/app/warp-schema.ts`, `src/app/warp-performance.ts`, `docs/warp-spec.md`, `docs/warp-plan.md`, progressive-blur test/plan removal, `docs/warp-progressive-blur-rollback-plan.md`, and this worklog.
- Verification: `npm run verify:quick` passed 221/221 app/contract tests; focused Warp browser acceptance plus the targeted 4K/2× maximum-Motion budget passed 5/5; `npm run verify:final` passed 221/221 app/contract tests, the production build, and 14/14 functional browser tests.
- Skipped checks: Full global performance is not required for this post-first-working rollback; the restored kernel previously passed the exact targeted 4K scenario and is rechecked here.
- Risks: The restored stochastic sampling can show fine grain at extreme Motion, which is the known tradeoff explicitly accepted by choosing the visually preferred previous version.

## Evidence

- Source reviewed: `src/app/clip-lab-schema.ts`, `src/app/clip-lab-renderer.tsx`, `src/routes`, `e2e`, package dependencies, and all top-level product docs.
- Contract applied: Toolcraft workflow, runtime boundary, setup/export, media upload, timeline, acceptance, performance, and decision-contract rules.
- Evidence: Canonical schema/route re-exports, Clip Lab-only product contracts, deletion inventory, build output, browser payload assertions, and local server identity.

## Verification

- Verification tier: Tier 3 for the solid current-frame SVG geometry correction.
- Run: `npm run typecheck`, focused Copy SVG browser acceptance, and `npm run verify:quick` passed; in-app browser root load reported no console errors.
- Skip: Full performance checkpoint is not required because this post-first-working pass changes only still-export serialization and does not alter preview animation, workload controls, viewport interaction, or video encoding.
- Verification tier: Tier 4.
- Run: `npm run verify:final` passed Toolcraft docs/integrity, 12/12 port-helper checks, 219/219 app/contract tests, TypeScript, the production build, and 6/6 functional browser tests.
- Browser: Root and `/clip-lab` alias rendered the same Radial Clip Lab SVG product; current-frame PNG/SVG, animated SVG, fixed-timestamp video, nonlinear playback, and edited timeline duration all passed.
- Browser: The focused maximum-ray workload passed 1/1 at full HD with 1200 Whirlpool rays, 100% participation, 70% overlap, and Speed 10.
- Browser performance checkpoint not required for this post-first-working non-performance cleanup because no renderer math or workload limit changed.
- Run: `npm run dev` confirmed the saved port already serves the Radial Clip Lab Toolcraft identity at `http://127.0.0.1:3002/`.

## Risks

- Risk: Clipboard and WebCodecs delivery still depend on browser capability and will report their existing unsupported-browser errors where those APIs are unavailable.
- Risk: The 8K still and 4K video options remain intentionally export-only heavy workloads.
### Iteration — Paper Texture Batch tool

- Request: Build a simple app that uploads up to roughly 40 images, applies the supplied fine paper/halftone texture consistently to all of them, and supports batch delivery.
- Task type: Tier 4 first working version of a secondary Toolcraft product route with multi-image media, WebGL pixel renderer, still export, batch ZIP export, acceptance, and performance coverage.
- User-visible result: `/paper-texture` opens Paper Texture Batch with an ordered multi-image uploader, Fine dots/Newsprint/Fibers styles, Amount/Scale/Print fade controls, live preview of the first ordered image, PNG/JPG output, and one-click ZIP export for the full batch. The root launcher now includes Paper Texture alongside Speed Rays and Speed Blur.
- Source/reference checked: The supplied 2048×1024 news-image crop was inspected at original resolution. Its fine regular dot screen, warm pale paper, visible texture in white space, and preserved dark-type legibility define the default Fine dots treatment.
- Reference inputs: `/var/folders/t4/k6gz0smn2s1dmzsnxr0ycs3m0000gn/T/codex-clipboard-a495d1f6-cb0d-4ba5-91e4-1c14a40f4a37.png`.
- Docs/contracts read: `AGENTS.md`, `docs/toolcraft/workflow.md`, runtime boundary, assembly workflow, decision contract, control selection, layout, schema reference, component rules, acceptance testing, core/performance, renderer technique, performance, setup/export, media upload, and the brainstorming, writing-plans, systematic-debugging, and browser skills.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `canvas-surface-preserved`, `layers-enable-only-when-needed`, `timeline-mode-choice`, `controls-product-coverage`, `output-export-required`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.
- Decision: Use the built-in multiple-image `fileDrop` as the ordered batch owner and a one-pass WebGL 2 fragment shader for Fine dots, Newsprint, and Fibers. Preview the first runtime-ordered source; apply one shared runtime recipe to every image; reuse one export shader/program/surface across the serial batch; encode selected PNG/JPG bytes; and package stored entries into a standards-compatible ZIP with determinate per-image progress and a hard 40-image export boundary.
- Alternatives rejected: A custom uploader would duplicate built-in thumbnail sorting/transforms; layers would misrepresent one shared batch as composited objects; Canvas 2D per-pixel loops would multiply CPU cost by output pixels and batch count; applying CSS filters would not create exportable pattern pixels; downloading 40 independent files would create browser prompts and lose one-action batch delivery; retaining decoded full-resolution canvases for all images would increase peak memory unnecessarily.
- State/output mapping: `paper.sources` owns runtime media order and rotate/flip metadata; the first ordered asset feeds the cached preview texture; `paper.style`, `paper.amount`, `paper.scale`, and `paper.fade` update shader uniforms; `export.includeBackground` and `paper.background` control live/PNG compositing; Image Export format/resolution feed the standard Toolcraft export canvas; `paper.exportAction` routes single-image or serial ZIP delivery through `onPanelAction` and reports progress.
- Files changed: `src/app/paper-texture-schema.ts`, `src/app/paper-texture-renderer.tsx`, `src/app/paper-texture-acceptance.ts`, `src/app/paper-texture-performance.ts`, Paper schema/renderer tests, `src/routes/paper-texture.tsx`, route tree and launcher/CSS, Paper functional and performance browser tests, Paper spec/plan, dashboard acceptance, self-contained Warp test fixture, corrected Clip Lab performance route, and this worklog.
- Verification: `npm run verify:final` passed 226 app/contract tests, production build, and 16/16 functional browser tests. After the reusable batch export-session optimization, `npm run verify:quick` passed 226/226, `npm run typecheck` passed, and focused Paper browser acceptance passed 2/2. The first-version Paper performance checkpoint used runner `playwright-fallback` because no agent-controlled browser tool was exposed: 4K media import, 4K/Resolution-scale-2 live Scale drag, and a real 40-image 4K-source batch all passed 3/3; the 40-image ZIP completed in 5.0–5.4 seconds against the declared 8-second budget.
- Skipped checks: At the user's request, repeated unrelated global checks were stopped after Paper's full functional and app-specific performance evidence passed. The global sequential performance suite was not treated as Paper evidence because a pre-existing Warp frame-gap case, run after the 40-image archive, intermittently measured 182–199 ms against its 180 ms budget; Paper passed all three of its scenarios on every run.
- Risks: WebGL 2 is required. A 40-image 8K batch can create a large final in-memory ZIP even though decode/render/encode is serial; the tested full batch used 4K-class sources and 2K delivery, while 8K remains an explicitly selected export-only workload. The ZIP uses stored entries rather than deflate compression, so already-compressed PNG/JPG bytes are not recompressed.
