# Remove Badge Lab Sandbox — Implementation Plan

Verification tier: Tier 4
Reason: Remove one complete generated product route, its custom renderer, schema, exports, acceptance/performance contracts, and browser coverage without changing the remaining tools or shared runtime.
Run: route/source reference scan and `npm run typecheck`; run the full final gate only if the user asks for broader verification.
Skip: Renderer, export, viewport, and performance checks for Badge Lab are deleted with the product; existing product behavior is unchanged.

1. Unregister `/badge-lab/sandbox` and remove its import from `src/routes/root.tsx` while preserving every other current route.
2. Delete Badge Lab schema, renderer, route, acceptance, performance, unit, and browser files.
3. Delete the Badge Lab product spec and implementation plan because the sandbox itself is being removed.
4. Restore the worklog's current product decisions to the remaining tools and add a removal decision-trail entry.
5. Scan for live Badge Lab imports/routes and run a TypeScript check. Do not run browser or performance suites unless explicitly requested.
