# Radial Clip Lab — Product Spec

## Deployment surface

- Radial Clip Lab is the only product and renders at `/` through the canonical `appSchema` and `AppHome` entry points.
- `/clip-lab` is a compatibility alias that renders the same schema, state model, renderer, controls, and delivery actions; it is not a second implementation.
- Legacy product renderers, schemas, product docs, acceptance suites, and unused dependencies are absent from the deployable source tree.

## Product behavior

- Start with a neutral empty canvas until the user uploads a real image.
- Convert the uploaded image to a binary threshold mask: pixels at or above Threshold are white/visible; lower pixels are black/clipped.
- Generate an exact adjustable Count of evenly spaced rays around a user-authored Focus point. Every ray begins at Focus and reaches beyond the canvas.
- Field shape changes the unmasked ray geometry before subtraction: Straight keeps radial rays, Whirlpool progressively rotates them around Focus, Sweep bends the whole field in one direction, and Wave adds broad repeated bends. Curl is a signed strength control, so negative and positive values reverse the bend direction.
- Intersect each ray with the thresholded white mask and convert every contiguous visible interval into its own final path. Multiple white islands on one ray become multiple paths.
- Use each interval's mask-entry and mask-exit points as that path's true endpoints; never retain or hide an underlying full-length ray.
- Serialize every interval with three or more carrier samples as a continuous cubic through-curve instead of visible straight chords. Preserve the exact first and last mask-derived points; true two-point Straight intervals remain straight lines.
- Apply one editable gradient independently across each resulting path, ordered from the endpoint nearest Focus to the farther endpoint.
- Wiggle adds a smooth lateral sine displacement that remains zero at Focus. Width is uniform across every ray.
- Edge noise independently pushes or pulls both mask-derived endpoints along the path's existing field curve. At 0% the exact refined mask intersections are preserved; higher values create a progressively rougher silhouette without adding sideways bumps or changing path direction.
- Min length filters the final mask-derived paths by their actual geometric length in output pixels, removing dot-like fragments without shortening retained paths.
- Playback is an additive preview layer over the finished static design. At time zero, the existing clipped SVG result is unchanged. Pressing the Toolcraft Play control starts a bounded periodic train of moving arc-length windows on each participating segment. Every window travels toward Focus from beyond the far mask boundary; no window is created inside the visible segment. Speed selects how many complete repeat cycles run during one Toolcraft timeline loop, while Easing remaps progress inside each cycle.
- The authored cubic `d` geometry is immutable during playback. Every repeated trail reuses that exact full static path and reveals only its current interval with normalized native stroke dashes; timeline ticks change dash start/length and gradient coordinates, never sampled points or Bézier handles.
- Every moving window keeps the user's existing per-path gradient stops, width, and opacity unchanged. Its gradient endpoints move with the complete unclipped window while the stable dashed stroke follows the original Straight, Whirlpool, Sweep, or Wave curve exactly.
- Each dash window is intersected numerically with the segment's original mask-derived arc interval, so every outgoing trail shortens naturally at the near boundary while the next trail grows in along the same immutable curve at the far boundary. Window starts are an infinite periodic sequence, but the renderer instantiates only the small bounded set that intersects the segment at the current phase. At the end of the forward loop indices shift by one repeat while the visible train remains identical, so the first and last frames stitch without reversal at every Focus position.
- Copy the exact currently visible timeline frame to the clipboard as either resolution-selected PNG pixels or native SVG markup. At the untouched initial time this is the authored static result; after playback or scrub each visible trail window is flattened into its own solid cropped cubic path with the current moving gradient and no dash attributes.
- Export the exact currently visible timeline frame as PNG/JPG, or export one complete forward timeline loop as MP4/WebM. Still delivery snapshots Toolcraft timeline time when the action is invoked and does not resume, pause, or advance playback. Video uses the same curve-window geometry as playback, including the user's Motion participation, stagger, overlap, gradient, and timeline duration. Current and 4K follow the standard Toolcraft video sizing contract; 2× doubles the current editable canvas dimensions. Video is rendered offline at fixed 30 fps timestamps while respecting encoder backpressure, so slow 4K frames extend export time instead of skipping motion phases.
- Export the motion as a standalone animated SVG. It keeps the authored cubic paths, gradients, normalized dash windows, per-path stagger, and Toolcraft loop duration as native vector markup with no embedded video or rasterized frames, so display resolution does not affect sharpness.

## Controls and app surfaces

- Source Mask — `clip.source` (`fileDrop`), `clip.threshold` (continuous stepped slider).
- Ray Field — `clip.focus` (`vector`, direct-authored), `clip.fieldShape` (`select`: Straight, Whirlpool, Sweep, Wave), conditional `clip.curl` (signed continuous slider), `clip.count` (continuous large-range slider), `clip.wiggle` (continuous stepped slider), and `clip.width` (continuous stepped slider).
- Path Ends — `clip.edgeNoise` (continuous stepped percentage slider) and `clip.minLength` (continuous stepped slider).
- Ray Gradient — `clip.gradient` (atomic built-in gradient).
- Motion is one section containing `clip.motionActive` (animated-path participation percentage), `clip.motionSpeed` (1–10 complete replacement cycles per timeline loop), `clip.motionEasingPresets` (local Linear/Ease in/Ease out/Ease in-out actions), `clip.motionEasing` (single smooth editable progress curve, identity/linear by default), `clip.motionStagger` (per-path phase spread), `clip.motionOverlap` (0–70% overlap between the outgoing and replacement copies), and `clip.motionSeed` (deterministic participating paths and phases). There is no separate Easing section. A preset replaces the editable curve points rather than creating a second hidden easing mode, so the curve remains the one source of truth and can be fine-tuned immediately afterward.
- Background — standard `export.includeBackground` plus unlabeled `clip.background` color.
- Image Export — PNG/JPG format and 2K/4K/8K resolution.
- Video Export — MP4/WebM format and Current/2×/4K resolution.
- Sticky delivery — Export Video, Export Animated SVG, Export PNG, Copy PNG, and Copy SVG. Export/Copy PNG and Copy SVG snapshot the current visible frame; animated SVG remains the separate downloaded full loop.
- Playback uses the built-in Toolcraft playback timeline with a product-derived 6-second default forward loop. Timeline duration is the overall motion-speed control; no right-panel transport is added.
- No layers, persistence, custom controls, or source placeholder.

## Animation intent inventory

- Mode: playback timeline.
- User intent: explicitly design a static result first, then press Play.
- Loop: seamless forward-only replacement; no mirror, yoyo, ping-pong, or reverse fallback.
- Default duration: 6 seconds, product-derived as a slow idle conveyor cycle. Timeline duration controls overall seconds while Speed controls the integer number of complete replacement cycles inside that duration; both keep the overall exported loop seam intact.
- Easing: the editable single curve maps normalized time to normalized path travel independently inside every replacement cycle using Toolcraft's smooth cubic interpolation. Linear keeps one editable interior anchor, Ease in and Ease out each use one interior anchor rather than a multi-point sampled approximation, and Ease in-out uses the minimum two interior anchors needed for a real S-curve. Endpoint normalization preserves exact 0→1 travel and the forward loop seam even when endpoint handles move.
- Participation: Animated paths controls which deterministic subset moves; non-participating paths remain as the static design.
- Stagger: 0% synchronizes every participating path; 100% distributes their loop phases across the full cycle.
- Overlap: 0% keeps consecutive moving trails edge-to-edge with no shared visible interval. Increasing Overlap shortens their repeat distance so adjacent trails share that percentage of one trail length; 70% is the bounded maximum. Long segments can therefore show three or more trails at once, but the renderer creates only periodic windows that actually intersect the segment and never spawns one inside it.
- Delivery: Export PNG, Copy PNG, and Copy SVG capture the current timeline frame. At untouched time zero this equals the static authored result; at any played or scrubbed time it includes the same participating periodic windows and gradient geometry visible on canvas. Copy SVG turns those windows into standalone solid path geometry. Export Video records exactly one forward timeline loop from phase 0 through the seamless replacement boundary. Export Animated SVG serializes the same loop as resolution-independent vector animation without mutating the user's gradient or static copied geometry.

## Renderer technique decision

- Source representation: one runtime-owned uploaded image plus its rotate/flip metadata.
- Product representation: native SVG paths created by subtracting black mask intervals from focal rays.
- Preview renderer: SVG with one path and one focus-oriented gradient per resulting visible interval.
- Still renderer: a shared current-frame native SVG serializer resolves Toolcraft timeline progress through the same motion model as preview, splits the authored cubics at each visible window boundary, and emits normal solid paths. Copy SVG writes that flattened frame directly, while Export/Copy PNG rasterize it through `createToolcraftPngExportCanvas` at the selected image resolution.
- Video renderer: Canvas 2D replays cached static `Path2D` segments and lightweight per-frame curve windows at the selected video size, then dynamically loads a WebCodecs-backed encoder and feeds it an offline fixed-timestamp MP4/WebM sequence at a pixel-aware requested bitrate.
- Animated-vector renderer: standalone SVG reuses each immutable cubic `d`, expresses the bounded periodic trail train through shared per-index CSS keyframes with per-path stagger delays, and linearly interpolates sampled gradient geometry along the same cached carrier for one seamless repeated Toolcraft-duration loop.
- Why: the visible result is editable vector line geometry. The bitmap is only a bounded intersection lookup; after subtraction, each retained interval has real endpoints and is no longer clipped presentation.
- Alternatives rejected: an SVG `clipPath` or Canvas `destination-in` would preserve hidden full rays and apply gradients over the wrong extent; WebGL would produce pixels instead of the requested separate line paths.
- Fidelity risk: the threshold mask is evaluated at a bounded 512px long edge, so very fine source details can stair-step; this is acceptable for deciding whether the concept is worth rebuilding properly.

## Render pipeline inventory

1. Decode/transform — cache by media data URL and rotate/flip metadata.
2. Threshold mask — draw cover/crop into a bounded source canvas, threshold luminance in one small WebGL pass, and read the resulting alpha lookup; neither canvas is product output.
3. Field geometry and ray intersection — map Count focal rays through the selected Straight, Whirlpool, Sweep, or Wave function with signed Curl and optional Wiggle, sample those actual curves against mask alpha, and split every contiguous white run.
4. Segment geometry — refine each run's entry/exit boundaries, apply deterministic Edge noise as independent along-curve endpoint offsets, orient the result nearest-Focus first, measure its sampled carrier length, discard it when shorter than Min length, and serialize three-or-more samples as a continuous cubic through-curve with endpoint clamping.
5. Segment styling — create a separate user-space gradient over every resulting path and render the optional Background plus SVG paths.
6. Playback composition — prepare an extended arc-length lookup once for each participating segment only to locate complete moving-window gradient endpoints; on timeline ticks map each staggered per-path cycle phase through Easing, then compute every periodic dash interval that intersects the immutable static cubic path. The candidate count is derived from the 0–70% repeat scale and remains bounded. No frame rebuilds carriers, path points, `d`, or Bézier handles.
7. Video delivery — reuse the prepared motion model and cached `Path2D` objects to replay exact phase `frameIndex / frameCount` on an export-sized Canvas 2D surface, preserving the background and per-path gradient, then await timestamped frame encoding at `frameIndex / 30` with a bitrate derived from output pixels and frame rate.
8. Animated SVG delivery — serialize participating paths as the bounded set of periodic immutable cubic copies that can intersect during a loop. Each copy-index class uses one shared sampled CSS keyframe generated from the Easing curve, while per-path gradient geometry uses the same bounded eased samples; non-participating paths remain unchanged static vectors.

Source/transform/Threshold invalidate passes 1–7; Focus/Shape/Curl/Count/Wiggle invalidate field intersection and segment geometry; Edge noise invalidates only deterministic segment endpoints and downstream motion carriers; Width/Gradient invalidate styling; participation/stagger/overlap/seed invalidate motion metadata or curve windows; Speed, Easing, and timeline ticks invalidate only playback phase/timing; Background invalidates only composition; still delivery snapshots runtime timeline progress and serializes/rasterizes the matching current frame at the selected image resolution; video delivery reuses the same geometry and Speed-multiplied, Easing-remapped phase function at its selected resolution.

## Acceptance

- A real upload remains invisible while producing separate SVG paths only for the ray intervals inside the white threshold region.
- Every rendered path has its own mask-derived start/end points and its own gradient spanning that path; there is no final clip path or hidden full ray.
- Threshold changes retained coverage.
- Moving Focus changes ray convergence and gradient orientation.
- Shape switches between visibly distinct straight, whirlpool, sweep, and wave fields; Curl changes bend strength and direction while every path still begins from its focal ray geometry before mask subtraction.
- At Wave Curl 100, long paths use continuous cubic SVG geometry with no visible interior straight-chord corners; Copy SVG preserves that curve by splitting its cubic geometry rather than rebuilding the visible window from straight samples.
- Count changes the ray count; Wiggle adds local variation on top of the chosen field; Width and Gradient visibly change output.
- Edge noise at 0% reproduces the exact clean intersections; raising it produces both longer and shorter paths with endpoints displaced only along their existing field curves, and returning to 0% restores the original geometry exactly.
- Raising Min length reduces short/dot-like SVG fragments while leaving longer paths intact.
- The initial paused/time-zero frame matches the static authored SVG; Play advances two arc-length dash windows toward Focus along each segment's actual field curve and Pause freezes the current frame.
- Animated paths can leave part of the field static; Stagger, Overlap, and Seed visibly alter replacement timing/placement without changing gradient definitions. At 0% adjacent dash windows share no interval; at 50% adjacent windows share half a trail length and the periodic train may show three or more simultaneous trails on a long segment. Across sampled phases, every newly visible trail must enter through a segment boundary rather than appearing at an interior dash position.
- Speed from 1–10 visibly advances the same immutable curve windows by that many complete forward cycles per Toolcraft timeline loop in preview, video, and animated SVG; static geometry and overall exported duration do not change. Speed 10 is the intended lightspeed extreme.
- Linear, Ease in, Ease out, and Ease in-out each replace the visible editable Easing curve and visibly change paused motion output where applicable; Ease in/out show exactly one interior point and a cubic curve with no straight path commands, while Ease in-out shows two interior points for its S-curve. The resulting curve is used by preview, fixed-frame video, and animated SVG, remains manually editable, and resetting Motion restores the linear diagonal.
- Dragging an off-center Easing control point after applying a preset changes the within-cycle acceleration while preserving the same static cubic paths, exact overall duration, and seamless endpoints.
- Whirlpool, Sweep, and Wave animation changes only normalized dash windows and gradient coordinates: every animated copy keeps byte-identical `d` geometry to its original static path across every frame, uses no SVG translation transform, and therefore cannot form a new kink where copies meet.
- The 6-second forward loop stitches at its boundary because the leading and following arc windows exchange roles inside the original segment interval; top-left and bottom-right Focus corner fixtures must produce the same bounded curve-window behavior.
- Clearing the image returns to a neutral canvas; runtime rotate/flip actions affect the mask.
- Copy PNG writes non-empty `image/png` bytes at the selected resolution; Copy SVG writes native solid path/gradient markup rather than embedding a bitmap or retaining `pathLength`, `stroke-dasharray`, or `stroke-dashoffset`. After playback is paused away from time zero, both payloads match the visible trail-window frame and differ from the authored time-zero result.
- Export PNG/JPG downloads non-empty bytes for the currently visible frame at the selected image resolution.
- Export Video downloads a non-empty supported MP4/WebM recording at Current, exact 2×, or standard 4K dimensions, requests a high pixel-aware bitrate, contains exactly 30 timestamped frames per configured second with no wall-clock phase skips, includes the product background, and contains changing curve-window frames rather than a static still or rigidly translated nonlinear paths.
- Export Animated SVG downloads non-empty native SVG markup with the original cubic paths, gradients, two shared normalized dash-window keyframes, per-path stagger delays, and configured loop duration; its per-path animation-node count stays bounded and it contains no bitmap image, canvas snapshot, video, or translated path geometry.
- The maximum 1200-ray, full-HD-source POC remains interactable in the focused browser smoke check.
- The targeted maximum-motion smoke uses 1200 Whirlpool rays with 100% participation and verifies timeline playback changes curve-window path geometry without rebuilding the threshold mask.
