# Warp source-native sizing plan

Verification tier: Tier 3
Reason: Warp canvas ownership changes from editable output dimensions to imported-media intrinsic dimensions, affecting upload, paste, preview backing pixels, and export aspect.
Run: `npm run verify:quick`, focused Warp upload/paste/browser acceptance, focused Warp source-import performance, `npm run verify:final`, and production deployment.
Skip: The global full performance checkpoint is not required for this post-first-working non-performance edit; the targeted 4K source-import scenario covers the changed sizing workload.

1. Change only Warp canvas sizing to `intrinsic-media`; keep Clip Lab on editable output sizing.
2. Prove Aspect ratio and Canvas width/height controls are absent in Warp.
3. Prove upload and clipboard paste set product CSS dimensions and backing pixels from natural source dimensions.
4. Confirm the existing renderer and export pipeline consume the runtime-owned canvas size.
5. Run the final production gate and deploy the verified build to the existing Vercel production alias.
