# Speed Rays Sandbox — Implementation Plan

Verification tier: Tier 3
Reason: Independent schema/route plus SVG and Canvas 2D styling changes affect product output, timeline playback, and delivery without changing the shared Toolcraft runtime.
Run: `npm run verify:quick`; focused Vitest files for sandbox schema/renderer contracts; focused Chromium acceptance at `/clip-lab/sandbox`; targeted sandbox maximum-style playback, viewport drag/zoom, and export scenarios.
Skip: `npm run verify:perf` is not required for this post-first-working feature route; run only targeted performance scenarios for the touched renderer workload.

1. Add `src/app/clip-lab-sandbox-schema.ts` as an independent `defineToolcraft` product contract. Preserve Speed Rays sections, playback timeline, no-layers/no-persistence policy, editable output sizing, and standard export sections. Raise Width/Speed limits, add built-in Bloom and Noise sliders, export a complete section inventory, and use sandbox-specific sticky action values.
2. Add `src/app/clip-lab-sandbox-renderer.tsx` from the accepted Speed Rays renderer so `/clip-lab` remains behaviorally untouched. Extend its settings parser, SVG preview/current-frame/animated serializers, Canvas 2D still/video replay, data observables, filenames, and deterministic timeline-driven noise/bloom styling.
3. Add `src/routes/clip-lab-sandbox.tsx` as a thin `ToolcraftApp` composition with sandbox schema, renderer, clipboard import, easing actions, and delivery handlers. Register only `/clip-lab/sandbox` in `src/routes/root.tsx`.
4. Add focused schema/renderer unit coverage proving independent route limits, section inventory, deterministic seamless noise, bloom serialization, and original Speed Rays limits remain unchanged.
5. Extend browser acceptance with real upload, high Width/Speed interaction, bloom/noise changes, timeline pause/play stability, current-frame still/SVG output, video/animated SVG delivery, and original-route regression checks.
6. Add a sandbox performance config or focused scenario entries covering maximum Width/Speed/Bloom/Noise playback plus viewport drag/zoom without weakening the existing Speed Rays budgets.
7. Update `docs/toolcraft/agent-worklog.md` with the Tier 3 decision trail, renderer/timeline/control/export/performance evidence, concrete verification results, skipped full checkpoint reason, and remaining risks.
8. Run the required checks, fix root causes through systematic debugging if any fail, verify the real app in the controlled browser, then start or reuse the local Toolcraft server and report the sandbox URL.
