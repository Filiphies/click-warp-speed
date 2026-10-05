# Radial Clip Lab — Deployment Plan

Verification tier: Tier 4
Reason: Promote the accepted Clip Lab product to the root route, remove every legacy product implementation, and realign deploy-facing contracts, metadata, tests, and dependencies.
Run: `npm install`, `npm run verify:final`, the focused root/alias browser acceptance, and the maximum-ray Clip Lab browser workload; then confirm `npm run dev` serves the saved Toolcraft identity URL.
Skip: The full browser performance checkpoint is not required for this post-first-working non-performance cleanup because renderer geometry, animation math, and export encoding are unchanged; the touched maximum-ray/root-route path still receives focused coverage.

1. Re-export `clipLabSchema` as the app schema and render `ClipLabHome` at `/`; preserve `/clip-lab` as a compatibility alias.
2. Update deploy metadata, acceptance, performance, product-readiness, section inventory, and schema tests so Radial Clip Lab is the only declared product.
3. Delete Flow Streaks and earlier abandoned product renderers, product plans/specs, and product-specific browser suites. Keep Toolcraft runtime, generic verification helpers, and the Clip Lab renderer/tests.
4. Remove dependencies that become unused after legacy product deletion and refresh the lockfile once.
5. Run the final build/test/browser gate, exercise the real root route plus alias, and confirm the saved local server identity.
