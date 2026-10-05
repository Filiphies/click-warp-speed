# Implementation plan

1. Replace `src/app/app-schema.ts` with the Text/SVG source workflow, semantic control sections, playback timeline, localStorage persistence, export sections, and sticky PNG/video actions.
2. Add `src/app/striped-block-renderer.tsx` for cached text/SVG mask extraction, sampled block geometry, seamless build timing, whole-form motion, preview drawing, and PNG/video exports.
3. Update `src/routes/index.tsx` to render the new product and route sticky actions to its exporter.
4. Replace the product readiness, section inventory, transfer/video study metadata, and acceptance rows in `src/app/app-acceptance.ts`.
5. Replace `src/app/app-performance.ts` with the Canvas 2D renderer technique/pipeline inventory and workload, playback, viewport, and export scenarios.
6. Align app unit tests and browser tests with the new control labels, source modes, canvas observables, timeline behavior, SVG lifecycle, and export actions.
7. Replace the product worklog with the new product decision trail and record final verification evidence.
8. Run Tier 4 checks: `npm run verify:final`, the required first-working browser performance checkpoint, then `npm run dev` and verify the saved local URL.

## Post-delivery correction: outlined cuboids and orbit view

Verification tier: Tier 3
Reason: Renderer geometry, canvas pointer interaction, camera state, surface controls, and viewport acceptance change; the Toolcraft runtime/template and dependency graph do not.
Run: `npm run verify:quick`, focused Playwright orbit/surface/timeline tests, affected viewport performance checks, and a controlled-browser visual inspection.
Skip: Full first-working performance checkpoint is not repeated because this is a post-first-working non-performance correction; targeted animation/viewport evidence covers the changed path.

1. Replace luminous/glow faces with black cuboid faces and crisp white 1px outlines in preview and export.
2. Add schema-backed View rotation and Surface controls, then map them into the renderer and inventory.
3. Add direct pointer drag orbit that writes the same runtime camera target and is excluded from export UI.
4. Update acceptance, performance invalidation, browser coverage, and worklog evidence for the corrected material and camera interaction.
