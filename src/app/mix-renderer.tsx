import * as React from "react";

import {
  createToolcraftPngExportCanvas,
  getToolcraftTimelineLoopProgress,
  shouldIncludeToolcraftExportBackground,
  shouldIncludeToolcraftPreviewBackground,
  type ToolcraftState,
} from "@/toolcraft/runtime";
import { useToolcraft } from "@/toolcraft/runtime/react";

import {
  createClipMotionFrames,
  createClipMotionModel,
  createClipSegments,
  createThresholdMask,
  downloadBlob,
  getClipLabVideoEncoder,
  getClipLabVideoExportSize,
  getClipSettings,
  getClipSource,
  renderClipLabFrame,
  type ClipMotionFrame,
  type PreparedClipMotion,
  type ThresholdMask,
} from "./clip-lab-renderer";
import { useClipboardImageImport } from "./use-clipboard-image-import";
import { WarpGlRenderer, type WarpSettings } from "./warp-renderer";

function numberValue(value: unknown, fallback: number, min = 0, max = 100): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function positiveModulo(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo;
}

function getMixBlurSettings(state: ToolcraftState): WarpSettings {
  const clip = getClipSettings(state);
  return {
    background: clip.background,
    blend: numberValue(state.values["mix.blur.blend"], 100) / 100,
    falloff: numberValue(state.values["mix.blur.falloff"], 32) / 100,
    focus: { x: clip.focusX * 2 - 1, y: clip.focusY * 2 - 1 },
    softness: numberValue(state.values["mix.blur.softness"], 72) / 100,
    strength: numberValue(state.values["mix.blur.strength"], 64) / 100,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("Mix image encoding failed.")),
    mimeType,
    0.95,
  ));
}

async function writePngToClipboard(blob: Blob): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("Clipboard image writing is not supported in this browser.");
  }
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

function renderMixFrame(
  outputCanvas: HTMLCanvasElement,
  raysCanvas: HTMLCanvasElement,
  renderer: WarpGlRenderer,
  clipSettings: ReturnType<typeof getClipSettings>,
  blurSettings: WarpSettings,
  segments: ReturnType<typeof createClipSegments>,
  motionFrames: readonly ClipMotionFrame[],
  baseWidth: number,
  baseHeight: number,
  includeBackground: boolean,
  pathCache?: Map<string, Path2D>,
  rayScale = 1,
): void {
  const rayWidth = Math.max(1, Math.round(outputCanvas.width * rayScale));
  const rayHeight = Math.max(1, Math.round(outputCanvas.height * rayScale));
  if (raysCanvas.width !== rayWidth) raysCanvas.width = rayWidth;
  if (raysCanvas.height !== rayHeight) raysCanvas.height = rayHeight;
  renderClipLabFrame(
    raysCanvas,
    clipSettings,
    segments,
    motionFrames,
    baseWidth,
    baseHeight,
    false,
    pathCache,
  );
  renderer.setSource(raysCanvas, raysCanvas.width, raysCanvas.height);
  renderer.draw(blurSettings, undefined, includeBackground);
}

async function prepareMixGeometry(state: ToolcraftState) {
  const settings = getClipSettings(state);
  const source = getClipSource(state);
  const { width, height } = state.canvas.size;
  const mask = source ? await createThresholdMask(source, settings.threshold, width, height) : null;
  const segments = mask ? createClipSegments(mask, settings, width, height) : [];
  return { segments, settings };
}

function currentMotionFrames(
  state: ToolcraftState,
  settings: ReturnType<typeof getClipSettings>,
  segments: ReturnType<typeof createClipSegments>,
): readonly ClipMotionFrame[] {
  if (!state.timeline.isPlaying && state.timeline.currentTimeSeconds <= 0) return [];
  const phase = positiveModulo(getToolcraftTimelineLoopProgress(state.timeline) * settings.motionSpeed, 1);
  return createClipMotionFrames(
    createClipMotionModel(segments, settings, state.canvas.size.width, state.canvas.size.height),
    phase,
    settings.motionEasing,
  );
}

async function createMixOutputCanvas(state: ToolcraftState): Promise<HTMLCanvasElement> {
  const { segments, settings } = await prepareMixGeometry(state);
  const blurSettings = getMixBlurSettings(state);
  const includeBackground = Boolean(state.values["export.includeBackground"]);
  const motionFrames = currentMotionFrames(state, settings, segments);
  return createToolcraftPngExportCanvas({
    background: settings.background,
    includeBackground,
    resolution: String(state.values["export.image.resolution"] ?? "4k"),
    state,
    render: ({ context, cssHeight, cssWidth, pixelRatio }) => {
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = Math.max(1, Math.round(cssWidth * pixelRatio));
      outputCanvas.height = Math.max(1, Math.round(cssHeight * pixelRatio));
      const raysCanvas = document.createElement("canvas");
      const renderer = new WarpGlRenderer(outputCanvas);
      renderMixFrame(
        outputCanvas,
        raysCanvas,
        renderer,
        settings,
        blurSettings,
        segments,
        motionFrames,
        state.canvas.size.width,
        state.canvas.size.height,
        includeBackground,
      );
      context.drawImage(outputCanvas, 0, 0, cssWidth, cssHeight);
      renderer.destroy();
    },
  });
}

export async function copyMixPng(state: ToolcraftState): Promise<Blob> {
  const canvas = await createMixOutputCanvas(state);
  const blob = await canvasToBlob(canvas, "image/png");
  await writePngToClipboard(blob);
  return blob;
}

export async function exportMixPng(state: ToolcraftState): Promise<Blob> {
  const canvas = await createMixOutputCanvas(state);
  const format = state.values["export.image.format"] === "jpg" ? "jpg" : "png";
  const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
  const blob = await canvasToBlob(canvas, mimeType);
  const resolution = String(state.values["export.image.resolution"] ?? "4k");
  downloadBlob(blob, `mix-${resolution}.${format}`);
  return blob;
}

export async function exportMixVideo(
  state: ToolcraftState,
  reportProgress: (progress: number) => void,
): Promise<Blob> {
  if (typeof VideoEncoder === "undefined") throw new Error("Timestamped video export is not supported in this browser.");
  const { segments, settings } = await prepareMixGeometry(state);
  const blurSettings = getMixBlurSettings(state);
  const resolution = String(state.values["export.video.resolution"] ?? "current");
  const size = getClipLabVideoExportSize(state, resolution);
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = size.width;
  outputCanvas.height = size.height;
  const raysCanvas = document.createElement("canvas");
  const renderer = new WarpGlRenderer(outputCanvas);
  const includeBackground = shouldIncludeToolcraftExportBackground({ format: "video", schema: state.schema });
  const fps = 30;
  const durationSeconds = Math.max(1, state.timeline.durationSeconds);
  const frameCount = Math.max(1, Math.round(durationSeconds * fps));
  const motionModel = createClipMotionModel(
    segments,
    settings,
    state.canvas.size.width,
    state.canvas.size.height,
  );
  const pathCache = new Map<string, Path2D>();
  const requestedFormat = String(state.values["export.video.format"] ?? "mp4");
  const videoTools = await import("mediabunny");
  const encoder = await getClipLabVideoEncoder(videoTools, requestedFormat, size.width, size.height, fps);
  const target = new videoTools.BufferTarget();
  const output = new videoTools.Output({ format: encoder.format, target });
  const videoSource = new videoTools.CanvasSource(outputCanvas, {
    bitrate: encoder.bitrate,
    codec: encoder.codec,
    keyFrameInterval: 2,
  });
  output.addVideoTrack(videoSource, { frameRate: fps });

  try {
    reportProgress(0);
    await output.start();
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const phase = frameIndex / frameCount * settings.motionSpeed;
      renderMixFrame(
        outputCanvas,
        raysCanvas,
        renderer,
        settings,
        blurSettings,
        segments,
        createClipMotionFrames(motionModel, phase, settings.motionEasing),
        state.canvas.size.width,
        state.canvas.size.height,
        includeBackground,
        pathCache,
      );
      await videoSource.add(frameIndex / fps, 1 / fps, { keyFrame: frameIndex % (fps * 2) === 0 });
      reportProgress((frameIndex + 1) / frameCount);
    }
    videoSource.close();
    const mimeType = await output.getMimeType();
    await output.finalize();
    if (!target.buffer || target.buffer.byteLength === 0) throw new Error("Mix video export produced no bytes.");
    const blob = new Blob([target.buffer], { type: mimeType });
    downloadBlob(blob, `mix-${resolution}${encoder.format.fileExtension}`);
    reportProgress(1);
    return blob;
  } catch (error) {
    if (output.state !== "canceled" && output.state !== "finalized") await output.cancel();
    throw error instanceof Error ? error : new Error("Mix video encoder failed.");
  } finally {
    renderer.destroy();
  }
}

export function MixRenderer(): React.JSX.Element | null {
  const { dispatch, state } = useToolcraft();
  useClipboardImageImport("clip.source");
  const source = getClipSource(state);
  const settings = React.useMemo(() => getClipSettings(state), [state.values]);
  const blurSettings = React.useMemo(() => getMixBlurSettings(state), [state.values]);
  const includeBackground = shouldIncludeToolcraftPreviewBackground({ state });
  const renderScale = numberValue(state.values["canvas.renderScale"], 1, 1, 2);
  const { width, height } = state.canvas.size;
  const [mask, setMask] = React.useState<ThresholdMask | null>(null);
  const outputRef = React.useRef<HTMLCanvasElement | null>(null);
  const raysRef = React.useRef<HTMLCanvasElement | null>(null);
  const rendererRef = React.useRef<WarpGlRenderer | null>(null);
  const pathCacheRef = React.useRef(new Map<string, Path2D>());
  const lastPreviewDrawAtRef = React.useRef(0);
  const didInitializePlayback = React.useRef(false);

  React.useLayoutEffect(() => {
    if (didInitializePlayback.current) return;
    didInitializePlayback.current = true;
    if (state.timeline.isPlaying) dispatch({ type: "timeline.togglePlayback" });
  }, [dispatch, state.timeline.isPlaying]);

  React.useEffect(() => {
    let cancelled = false;
    if (!source) {
      setMask(null);
      return;
    }
    setMask(null);
    void createThresholdMask(source, settings.threshold, width, height).then((nextMask) => {
      if (!cancelled) setMask(nextMask);
    });
    return () => { cancelled = true; };
  }, [height, settings.threshold, source?.dataUrl, source?.transform?.flipHorizontal, source?.transform?.flipVertical, source?.transform?.rotationDeg, width]);

  React.useEffect(() => {
    const canvas = outputRef.current;
    if (!canvas || !source) return;
    rendererRef.current?.destroy();
    rendererRef.current = new WarpGlRenderer(canvas);
    raysRef.current = document.createElement("canvas");
    pathCacheRef.current.clear();
    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
      raysRef.current = null;
    };
  }, [source?.dataUrl]);

  const segments = React.useMemo(
    () => mask ? createClipSegments(mask, settings, width, height) : [],
    [height, mask, settings, width],
  );
  const timelinePhase = getToolcraftTimelineLoopProgress(state.timeline);
  const motionPhase = positiveModulo(timelinePhase * settings.motionSpeed, 1);
  const motionEnabled = state.timeline.isPlaying || state.timeline.currentTimeSeconds > 0;
  const motionModel = React.useMemo<readonly PreparedClipMotion[]>(
    () => motionEnabled ? createClipMotionModel(segments, settings, width, height) : [],
    [height, motionEnabled, segments, settings, width],
  );
  const motionFrames = React.useMemo<readonly ClipMotionFrame[]>(
    () => motionEnabled ? createClipMotionFrames(motionModel, motionPhase, settings.motionEasing) : [],
    [motionEnabled, motionModel, motionPhase, settings.motionEasing],
  );

  React.useEffect(() => {
    const output = outputRef.current;
    const rays = raysRef.current;
    const renderer = rendererRef.current;
    if (!output || !rays || !renderer || !mask || !source) return;
    const drawStartedAt = performance.now();
    if (state.timeline.isPlaying && drawStartedAt - lastPreviewDrawAtRef.current < 1000 / 30) return;
    lastPreviewDrawAtRef.current = drawStartedAt;
    const outputWidth = Math.max(1, Math.round(width * renderScale));
    const outputHeight = Math.max(1, Math.round(height * renderScale));
    if (output.width !== outputWidth) output.width = outputWidth;
    if (output.height !== outputHeight) output.height = outputHeight;
    renderMixFrame(
      output,
      rays,
      renderer,
      settings,
      blurSettings,
      segments,
      motionFrames,
      width,
      height,
      includeBackground,
      pathCacheRef.current,
      0.75,
    );
    output.dataset.mixReady = "true";
  }, [blurSettings, height, includeBackground, mask, motionFrames, renderScale, segments, settings, source, state.timeline.isPlaying, width]);

  const updateFocus = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;
    const normalizedX = (event.clientX - bounds.left) / bounds.width;
    const normalizedY = (event.clientY - bounds.top) / bounds.height;
    const x = Math.max(-1, Math.min(1, (normalizedX - 0.5) / 0.46));
    const y = Math.max(-1, Math.min(1, (normalizedY - 0.5) / 0.46));
    dispatch({
      label: "Move Mix focus",
      target: "clip.focus",
      type: "controls.setValue",
      value: { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 },
    });
  }, [dispatch]);

  if (!source) return null;

  return <div
    className="absolute inset-0"
    data-blend={Math.round(blurSettings.blend * 100)}
    data-exposure={Math.round(blurSettings.softness * 100)}
    data-focus-area={Math.round(blurSettings.falloff * 100)}
    data-mask-ready={mask ? "true" : "false"}
    data-motion-phase={Number(motionPhase.toFixed(6))}
    data-motion-playing={state.timeline.isPlaying ? "true" : "false"}
    data-ray-count={settings.count}
    data-segment-count={segments.length}
    data-strength={Math.round(blurSettings.strength * 100)}
    data-toolcraft-product-output=""
    style={{ height, width }}
  >
    <canvas
      aria-label="Mix speed rays and blur output"
      className="absolute inset-0 block size-full"
      ref={outputRef}
      style={{ backgroundColor: includeBackground ? settings.background : "transparent" }}
    />
    <button
      aria-label="Drag Mix focus"
      className="absolute z-10 size-5 -translate-x-1/2 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-white bg-blue-500 shadow-[0_0_0_2px_rgba(37,99,235,0.72),0_2px_8px_rgba(0,0,0,0.5)]"
      data-mix-focus-handle=""
      onPointerCancel={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        updateFocus(event);
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        event.preventDefault();
        event.stopPropagation();
        updateFocus(event);
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        event.stopPropagation();
        updateFocus(event);
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      style={{ left: `${settings.focusX * 100}%`, top: `${settings.focusY * 100}%` }}
      type="button"
    />
  </div>;
}
