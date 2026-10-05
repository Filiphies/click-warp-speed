# Paper Texture Batch — Implementation Plan

Verification tier: Tier 4
Reason: This is the first working version of a new Toolcraft product route with multi-media upload, a custom WebGL renderer, still and batch export, new acceptance coverage, and new renderer workload.
Run: `npm run ai:check`, targeted schema/unit tests, `npm run verify:final`, the full browser performance checkpoint with the controlled browser or `npm run verify:perf` fallback, then `npm run dev` and verify the saved app identity URL.
Skip: No required final checks are skipped. `npm install` is unnecessary because dependencies and lockfiles are unchanged.

1. Add `src/app/paper-texture-schema.ts` with the exported control-section inventory, editable canvas, multi-image `fileDrop`, shared texture controls, mandatory Background and Image Export sections, sticky single/batch actions, no timeline/layers, no persistence, and automatic settings transfer.
2. Add `src/app/paper-texture-renderer.tsx` with cached source decoding, a reusable WebGL 2 texture/composite pipeline, runtime media order and transforms, standard Toolcraft still export, serial batch processing, ZIP packaging, progress reporting, and safe output naming.
3. Add `src/routes/paper-texture.tsx`, register `/paper-texture`, and add Paper Texture to the existing launcher without changing the other tools.
4. Add schema/renderer unit tests and focused Playwright acceptance for multi-upload/order/transforms, live texture controls, canvas sizing, single output, batch ZIP contents, viewport stability, and the 40-image boundary.
5. Add `paperTextureAcceptance` and `paperTexturePerformance` contracts, including a 4K media fixture, 40-item batch fixture, texture slider drag scenarios, preview/zoom stability, and export workload.
6. Update dashboard acceptance and `docs/toolcraft/agent-worklog.md` with reference evidence, decisions, state/output mapping, verification results, and remaining risks.
7. Run the Tier 4 gate, inspect the real UI in the required browser workflow, run the first-version performance checkpoint, and leave the verified local URL available.
