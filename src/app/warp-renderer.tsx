import * as React from "react";

import {
  createToolcraftPngExportCanvas,
  shouldIncludeToolcraftPreviewBackground,
  type ToolcraftMediaAsset,
  type ToolcraftMediaTransform,
  type ToolcraftState,
} from "@/toolcraft/runtime";
import { useToolcraft } from "@/toolcraft/runtime/react";

import { useClipboardImageImport } from "./use-clipboard-image-import";

export type Focus = { x: number; y: number };
export type WarpSettings = {
  background: string;
  blend: number;
  falloff: number;
  focus: Focus;
  softness: number;
  strength: number;
};

const vertexSource = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * .5 + .5;
  gl_Position = vec4(a_position, 0., 1.);
}`;

const fragmentSource = `#version 300 es
precision highp float;
uniform sampler2D u_image;
uniform vec2 u_source;
uniform vec2 u_output;
uniform vec2 u_focus;
uniform vec4 u_effect;
uniform vec3 u_background;
uniform vec3 u_transform;
uniform float u_includeBackground;
in vec2 v_uv;
out vec4 outColor;

vec2 sourceUv(vec2 outputUv) {
  vec2 uv = outputUv;
  float sourceAspect = u_source.x / max(1., u_source.y);
  float outputAspect = u_output.x / max(1., u_output.y);
  if (sourceAspect > outputAspect) {
    float visibleWidth = outputAspect / sourceAspect;
    uv.x = (uv.x - .5) * visibleWidth + .5;
  } else {
    float visibleHeight = sourceAspect / outputAspect;
    uv.y = (uv.y - .5) * visibleHeight + .5;
  }
  if (u_transform.y > .5) uv.x = 1. - uv.x;
  if (u_transform.z > .5) uv.y = 1. - uv.y;
  int rotation = int(u_transform.x + .5);
  if (rotation == 1) uv = vec2(uv.y, 1. - uv.x);
  else if (rotation == 2) uv = 1. - uv;
  else if (rotation == 3) uv = vec2(1. - uv.y, uv.x);
  return clamp(uv, vec2(0.), vec2(1.));
}

float exposureJitter(vec2 pixel, float sampleIndex) {
  vec3 seed = fract(vec3(pixel.xyx) * .1031 + sampleIndex * vec3(.11369, .13787, .09987));
  seed += dot(seed, seed.yzx + 33.33);
  return fract((seed.x + seed.y) * seed.z);
}

void main() {
  vec2 outputUv = vec2(v_uv.x, 1. - v_uv.y);
  vec2 delta = outputUv - u_focus;
  vec2 aspect = vec2(u_output.x / max(1., u_output.y), 1.);
  float maximumRadius = max(
    max(length((vec2(0., 0.) - u_focus) * aspect), length((vec2(1., 0.) - u_focus) * aspect)),
    max(length((vec2(0., 1.) - u_focus) * aspect), length((vec2(1., 1.) - u_focus) * aspect))
  );
  float radialPosition = clamp(length(delta * aspect) / max(.000001, maximumRadius), 0., 1.);
  float focusRadius = u_effect.z * .36;
  float exposureMask = smoothstep(focusRadius, min(.96, focusRadius + .24), radialPosition);
  float travel = u_effect.x * .72 * exposureMask;
  vec4 original = texture(u_image, sourceUv(outputUv));
  vec3 accumulatedLight = vec3(0.);
  float accumulatedAlpha = 0.;
  float totalWeight = 0.;
  float maximumAlpha = original.a;
  for (int sampleIndex = 0; sampleIndex < 6; sampleIndex++) {
    float index = float(sampleIndex);
    float jitter = exposureJitter(gl_FragCoord.xy, index);
    float progress = (index + jitter) / 6.;
    float exposureProgress = mix(progress * progress, sqrt(max(0., progress)), u_effect.y);
    float crispWeight = (1. - progress) * (1. - progress) + .18;
    float weight = mix(crispWeight, 1., u_effect.y);
    vec2 samplePoint = mix(outputUv, u_focus, exposureProgress * travel);
    vec4 sampleColor = texture(u_image, sourceUv(samplePoint));
    accumulatedLight += sampleColor.rgb * weight;
    accumulatedAlpha += sampleColor.a * weight;
    maximumAlpha = max(maximumAlpha, sampleColor.a);
    totalWeight += weight;
  }
  vec3 exposedRgb = accumulatedLight / max(.000001, totalWeight);
  exposedRgb = clamp((exposedRgb - .5) * (1. + u_effect.x * .18) + .5, 0., 1.);
  vec4 exposed = vec4(exposedRgb, max(maximumAlpha, accumulatedAlpha / max(.000001, totalWeight)));
  vec4 product = mix(original, exposed, u_effect.w * exposureMask);
  if (u_includeBackground > .5) {
    product = vec4(mix(u_background, product.rgb, product.a), 1.);
  }
  outColor = product;
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create Warp shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Warp shader compilation failed.";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function hexRgb(value: string): [number, number, number] {
  const hex = value.replace("#", "").padEnd(6, "0").slice(0, 6);
  return [0, 2, 4].map((index) => {
    const parsed = Number.parseInt(hex.slice(index, index + 2), 16);
    return Number.isFinite(parsed) ? parsed / 255 : 0;
  }) as [number, number, number];
}

function numberValue(value: unknown, fallback: number, min = 0, max = 100): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function colorValue(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "hex" in value && typeof (value as { hex?: unknown }).hex === "string") {
    return (value as { hex: string }).hex;
  }
  return fallback;
}

function focusValue(value: unknown): Focus {
  if (!value || typeof value !== "object") return { x: 0, y: 0 };
  const candidate = value as { x?: unknown; y?: unknown };
  return {
    x: numberValue(candidate.x, 0, -1, 1),
    y: numberValue(candidate.y, 0, -1, 1),
  };
}

function getWarpSettings(state: ToolcraftState): WarpSettings {
  return {
    background: colorValue(state.values["warp.background"], "#05070B"),
    blend: numberValue(state.values["warp.blend"], 100) / 100,
    falloff: numberValue(state.values["warp.falloff"], 32) / 100,
    focus: focusValue(state.values["warp.focus"]),
    softness: numberValue(state.values["warp.softness"], 72) / 100,
    strength: numberValue(state.values["warp.strength"], 64) / 100,
  };
}

function getWarpSource(state: ToolcraftState): ToolcraftMediaAsset | null {
  return state.mediaAssets.find((asset) => asset.sourceTarget === "warp.source") ?? null;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to decode the Warp source image."));
    image.src = url;
  });
}

export class WarpGlRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly texture: WebGLTexture;
  private hasSource = false;
  private sourceHeight = 1;
  private sourceWidth = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL 2 is required for Radial Warp.");
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    if (!program || !buffer || !texture) throw new Error("Unable to create Radial Warp GPU resources.");
    const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "Unable to link Radial Warp shader.");
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.gl = gl;
    this.program = program;
    this.texture = texture;
  }

  setSource(source: TexImageSource, width: number, height: number): void {
    this.hasSource = true;
    this.sourceWidth = Math.max(1, width);
    this.sourceHeight = Math.max(1, height);
    const { gl } = this;
    gl.useProgram(this.program);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  setImage(image: HTMLImageElement): void {
    this.setSource(image, image.naturalWidth, image.naturalHeight);
  }

  draw(settings: WarpSettings, transform: ToolcraftMediaTransform | undefined, includeBackground: boolean): void {
    if (!this.hasSource) return;
    const { gl, program } = this;
    gl.useProgram(program);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    const rotation = (((transform?.rotationDeg ?? 0) / 90) % 4 + 4) % 4;
    const rotated = rotation % 2 === 1;
    const sourceWidth = rotated ? this.sourceHeight : this.sourceWidth;
    const sourceHeight = rotated ? this.sourceWidth : this.sourceHeight;
    const focusX = (settings.focus.x + 1) / 2;
    const focusY = (settings.focus.y + 1) / 2;
    const background = hexRgb(settings.background);
    gl.uniform2f(gl.getUniformLocation(program, "u_source"), sourceWidth, sourceHeight);
    gl.uniform2f(gl.getUniformLocation(program, "u_output"), this.canvas.width, this.canvas.height);
    gl.uniform2f(gl.getUniformLocation(program, "u_focus"), focusX, focusY);
    gl.uniform4f(gl.getUniformLocation(program, "u_effect"), settings.strength, settings.softness, settings.falloff, settings.blend);
    gl.uniform3f(gl.getUniformLocation(program, "u_background"), background[0], background[1], background[2]);
    gl.uniform3f(gl.getUniformLocation(program, "u_transform"), rotation, transform?.flipHorizontal ? 1 : 0, transform?.flipVertical ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(program, "u_includeBackground"), includeBackground ? 1 : 0);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.disable(gl.BLEND);
    gl.clearColor(background[0], background[1], background[2], includeBackground ? 1 : 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  destroy(): void {
    this.gl.deleteTexture(this.texture);
    this.gl.deleteProgram(this.program);
  }
}

function renderWarpFrame(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  settings: WarpSettings,
  transform: ToolcraftMediaTransform | undefined,
  includeBackground: boolean,
): void {
  const renderer = new WarpGlRenderer(canvas);
  renderer.setImage(image);
  renderer.draw(settings, transform, includeBackground);
  renderer.destroy();
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportWarpImage(state: ToolcraftState): Promise<Blob> {
  const source = getWarpSource(state);
  if (!source) throw new Error("Upload an image before exporting Radial Warp.");
  const image = await loadImage(source.dataUrl);
  const settings = getWarpSettings(state);
  const includeBackground = Boolean(state.values["export.includeBackground"]);
  const output = createToolcraftPngExportCanvas({
    background: settings.background,
    includeBackground,
    resolution: state.values["export.image.resolution"] as string,
    state,
    render: ({ context, cssHeight, cssWidth, pixelRatio }) => {
      const frame = document.createElement("canvas");
      frame.width = Math.round(cssWidth * pixelRatio);
      frame.height = Math.round(cssHeight * pixelRatio);
      renderWarpFrame(frame, image, settings, source.transform, includeBackground);
      context.drawImage(frame, 0, 0, cssWidth, cssHeight);
    },
  });
  const format = state.values["export.image.format"] === "jpg" ? "jpg" : "png";
  const mime = format === "jpg" ? "image/jpeg" : "image/png";
  const blob = await new Promise<Blob>((resolve, reject) => output.toBlob(
    (value) => value ? resolve(value) : reject(new Error("Radial Warp image export failed.")),
    mime,
    0.94,
  ));
  downloadBlob(blob, `radial-warp.${format}`);
  return blob;
}

export function WarpRenderer(): React.JSX.Element | null {
  const { dispatch, state } = useToolcraft();
  useClipboardImageImport("warp.source");
  const source = getWarpSource(state);
  const settings = getWarpSettings(state);
  const includeBackground = shouldIncludeToolcraftPreviewBackground({ state });
  const renderScale = numberValue(state.values["canvas.renderScale"], 1, 1, 2);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const rendererRef = React.useRef<WarpGlRenderer | null>(null);
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!source) {
      setImage(null);
      return;
    }
    void loadImage(source.dataUrl).then((next) => {
      if (!cancelled) setImage(next);
    });
    return () => { cancelled = true; };
  }, [source?.dataUrl]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    rendererRef.current?.destroy();
    rendererRef.current = new WarpGlRenderer(canvas);
    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [source?.dataUrl]);

  React.useEffect(() => {
    if (!image || !rendererRef.current) return;
    rendererRef.current.setImage(image);
  }, [image, source?.dataUrl]);

  React.useEffect(() => {
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;
    if (!renderer || !canvas || !image || !source) return;
    canvas.width = Math.max(1, Math.round(state.canvas.size.width * renderScale));
    canvas.height = Math.max(1, Math.round(state.canvas.size.height * renderScale));
    renderer.draw(settings, source.transform, includeBackground);
    canvas.dataset.warpRefining = "false";
  }, [image, includeBackground, renderScale, settings.background, settings.blend, settings.falloff, settings.focus.x, settings.focus.y, settings.softness, settings.strength, source?.transform?.flipHorizontal, source?.transform?.flipVertical, source?.transform?.rotationDeg, state.canvas.size.height, state.canvas.size.width]);

  const updateFocus = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1));
    dispatch({
      label: "Move Warp focus",
      target: "warp.focus",
      type: "controls.setValue",
      value: { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 },
    });
  }, [dispatch]);

  if (!source) return null;

  return <div
    className="absolute inset-0"
    data-blend={Math.round(settings.blend * 100)}
    data-falloff={Math.round(settings.falloff * 100)}
    data-focus-x={settings.focus.x}
    data-focus-y={settings.focus.y}
    data-softness={Math.round(settings.softness * 100)}
    data-strength={Math.round(settings.strength * 100)}
    data-toolcraft-product-output=""
    style={{ height: state.canvas.size.height, width: state.canvas.size.width }}
  >
    <canvas
      aria-label="Radial zoom warp output"
      className="absolute inset-0 block size-full"
      ref={canvasRef}
      style={{ backgroundColor: includeBackground ? settings.background : "transparent" }}
    />
    <button
      aria-label="Drag Warp focus"
      className="absolute z-10 size-5 -translate-x-1/2 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-white bg-blue-500 shadow-[0_0_0_2px_rgba(37,99,235,0.72),0_2px_8px_rgba(0,0,0,0.5)]"
      data-warp-focus-handle=""
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
      style={{ left: `${(settings.focus.x + 1) * 50}%`, top: `${(settings.focus.y + 1) * 50}%` }}
      type="button"
    />
  </div>;
}
