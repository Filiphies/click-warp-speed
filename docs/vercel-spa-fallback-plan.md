# Vercel SPA Fallback — Fix Plan

Verification tier: Tier 4
Reason: Production hosting configuration affects direct navigation and refresh behavior for every client-side product route.
Run: `npm run verify:final`, `vercel build`, inspect the generated routing configuration, deploy the linked project to production, and confirm the deployment reaches `READY`.
Skip: The full performance checkpoint is not required for this post-first-working hosting-only fix because schemas, renderers, canvas workloads, exports, and runtime behavior are unchanged.

1. Add a root `vercel.json` rewrite from `/(.*)` to `/index.html` so Vercel serves the Vite SPA shell for direct nested-route requests.
2. Add a focused script test that proves the rewrite exists, points to `/index.html`, and covers the registered `/clip-lab/sandbox` client route.
3. Update the Toolcraft worklog with the production failure evidence, root cause, hosting decision, verification, and deployment result.
4. Run the final functional gate, generate the Vercel output locally, and deploy the linked `click-warp-speed` project to production.
