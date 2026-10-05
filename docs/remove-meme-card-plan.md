# Remove Meme P&L — Implementation Plan

Verification tier: Tier 4
Reason: Completely remove one registered Toolcraft product, including its route, launcher entry, app contracts, renderer/export code, source asset, tests, and product documentation. The route tree and production bundle change broadly even though remaining product behavior is unchanged.
Run: `npm run ai:check`, `npm run typecheck`, `npm run verify:final`, focused route-removal browser acceptance, source/bundle reference scans, `npm run dev`, then a fresh Vercel preview deployment.
Skip: Full performance verification is not required for this post-first-working removal because it deletes a renderer/workload and does not change any remaining product renderer, animation, export, canvas, or runtime path.

1. Remove the Meme P&L launcher link and unregister `/meme-card` from `src/routes/root.tsx`.
2. Delete the Meme route, schema, renderer, export, acceptance, performance, unit, browser, spec, and product-plan files plus the dedicated collage asset.
3. Update dashboard browser acceptance and documentation to describe the remaining three public tools: Speed Rays, Speed Blur, and Mix.
4. Update `docs/toolcraft/agent-worklog.md` with the complete-removal decision trail, unchanged remaining-product decisions, verification evidence, and deployment result.
5. Run reference scans, typecheck, the full final gate, verify `/meme-card` resolves through the generic Not Found behavior, confirm the production bundle contains no Meme product registration, keep the local app running, and publish a fresh preview to the linked Vercel project.
