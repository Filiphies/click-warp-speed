# Remove Paper Texture From Site — Plan

Verification tier: Tier 4
Reason: Removing a registered product route and launcher entry changes the production navigation surface and deployable route tree.
Run: `npm run verify:final`, inspect the production bundle route tree, deploy the linked Vercel project to production, and confirm the deployment reaches `READY`.
Skip: The full performance checkpoint is not required for this post-first-working removal because no remaining renderer, canvas, animation, export, or workload behavior changes.

1. Remove the Paper Texture link from `src/routes/index.tsx`.
2. Unregister and stop importing the Paper Texture route in `src/routes/root.tsx`.
3. Remove Paper Texture functional and performance browser suites because the product is no longer reachable.
4. Update dashboard acceptance to prove Paper Texture is absent while Speed Rays and Speed Blur remain available.
5. Keep the Paper Texture implementation and unit contracts recoverable but unreachable and excluded from the production bundle.
6. Update the worklog, run the full final gate, and redeploy production.
