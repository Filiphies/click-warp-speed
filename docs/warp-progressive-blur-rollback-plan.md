# Warp Progressive Blur Rollback Plan

Verification tier: Tier 3
Reason: Reverting the latest Warp fragment-sampling experiment changes visible preview/export pixels but not schema state, media sizing, controls, routes, or runtime source.
Run: `npm run verify:quick`, focused Warp browser acceptance, and the 4K maximum-Motion performance scenario.
Skip: No production deployment unless explicitly requested.

1. Restore the previous six-sample stratified per-pixel exposure jitter in `src/app/warp-renderer.tsx`.
2. Restore the matching Warp schema, performance inventory, and product-spec wording.
3. Remove the progressive-blur-only regression test and implementation plan.
4. Record the user-requested rollback in the Toolcraft worklog and verify preview/export behavior.
