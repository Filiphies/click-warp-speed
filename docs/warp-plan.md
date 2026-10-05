# Warp Implementation Plan

1. Align the Warp section to the supplied long-exposure photo with `Motion`, `Exposure`, `Focus area`, and opaque 100% `Blend` controls plus the existing Focus vector/handle.
2. Replace the Image Tunnel ribbon field in `src/app/warp-renderer.tsx` with a static six-sample photographic zoom-burst kernel: stratified fixed jitter, straight radial exposure paths, full alpha, contrast restoration, protected focal zone, and preview/export parity. Keep cached decode/texture upload, cover/crop, media transforms, focal handle, and standard PNG/JPG export unchanged.
3. Update `src/app/warp-performance.ts` so the pipeline and scenarios describe the fixed stratified long-exposure kernel; keep realistic 4K media, render-scale, viewport, and export evidence.
4. Update Warp unit and browser acceptance to prove there is no refining frame sequence, the output remains opaque for an opaque source, Motion/Exposure/Focus change final pixels live, and export matches the stable preview model.
5. Update `docs/toolcraft/agent-worklog.md` with the diagnosed root causes, rejected accumulation approach, state/output mapping, performance measurements, verification, and risks.
6. Run `npm run typecheck`, focused Warp tests, `npm run verify:quick`, functional Chromium acceptance, the targeted 4K renderer scenario, and a visual browser inspection at `/warp`.
