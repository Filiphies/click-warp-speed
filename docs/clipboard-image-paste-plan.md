# Clipboard image paste implementation plan

Verification tier: Tier 3
Reason: A new media import path feeds both custom renderers and replaces their active source image.
Run: `npm run verify:quick`, focused clipboard browser acceptance for both routes, full `npm run verify:final`, and production Vercel deployment.
Skip: Full performance checkpoint is not required for this post-first-working non-performance edit; paste uses the existing bounded media-import workload already covered for both renderers.

1. Add one app-level hook that reads image files from clipboard paste events, decodes natural dimensions, and dispatches the existing `media.import` command.
2. Bind the hook to `clip.source` in Speed Rays and `warp.source` in Speed Blur.
3. Preserve normal paste behavior while an input, textarea, or contenteditable element owns focus.
4. Add browser acceptance proving pasted image preview and product output in both modes.
5. Run the required gates and deploy the verified build to the production Vercel alias.
