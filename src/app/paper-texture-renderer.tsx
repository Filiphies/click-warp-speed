import * as React from "react";

import {
  createToolcraftPngExportCanvas,
  shouldIncludeToolcraftPreviewBackground,
  type ToolcraftMediaAsset,
  type ToolcraftMediaTransform,
  type ToolcraftState,
} from "@/toolcraft/runtime";
import { useToolcraft } from "@/toolcraft/runtime/react";

type PaperStyle = "fibers" | "fine-dots" | "newsprint";
type PaperSettings = {
  amount: number;
  background: string;
  fade: number;
  scale: number;
  style: PaperStyle;
};

export const PAPER_BATCH_LIMIT = 40;

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
uniform vec4 u_paper;
uniform vec3 u_background;
uniform vec3 u_transform;
uniform float u_includeBackground;
uniform float u_pixelRatio;
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

float hash21(vec2 point) {
  point = fract(point * vec2(123.34, 456.21));
  point += dot(point, point + 45.32);
  return fract(point.x * point.y);
}

float fineDots(vec2 pixel, float scale) {
  vec2 cell = mod(pixel, scale) - scale * .5;
  float radius = max(.55, scale * .115);
  return 1. - smoothstep(radius - .45, radius + .45, length(cell));
}

float newsprint(vec2 pixel, float scale, float luminance) {
  float angle = .2617994;
  mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 point = rotation * pixel;
  vec2 cell = mod(point, scale) - scale * .5;
  float radius = scale * mix(.42, .13, luminance);
  return 1. - smoothstep(radius - .55, radius + .55, length(cell));
}

float fibers(vec2 pixel, float scale) {
  float row = floor(pixel.y / max(1., scale * .45));
  float wobble = sin(pixel.x * .038 + row * 2.17) * .38;
  float strand = 1. - smoothstep(.12, .72, abs(fract(pixel.y / max(1., scale * .45) + wobble) - .5));
  float broken = smoothstep(.28, .9, hash21(vec2(floor(pixel.x / max(2., scale * 1.7)), row)));
  float grain = smoothstep(.7, .98, hash21(floor(pixel / max(1., scale * .8))));
  return clamp(strand * broken * .75 + grain * .35, 0., 1.);
}

void main() {
  vec2 outputUv = vec2(v_uv.x, 1. - v_uv.y);
  vec4 source = texture(u_image, sourceUv(outputUv));
  vec2 pixel = gl_FragCoord.xy / max(1., u_pixelRatio);
  float luminance = dot(source.rgb, vec3(.2126, .7152, .0722));
  float scale = max(2., u_paper.y);
  float pattern = u_paper.z < .5
    ? fineDots(pixel, scale)
    : u_paper.z < 1.5
      ? newsprint(pixel, scale * 1.35, luminance)
      : fibers(pixel, scale * 1.8);
  float ink = pattern * u_paper.x;
  vec3 faded = mix(source.rgb, u_background, u_paper.w);
  vec3 textured = mix(faded, faded * mix(vec3(.55), vec3(.78), luminance), ink);
  vec4 product = vec4(clamp(textured, 0., 1.), source.a);
  if (u_includeBackground > .5) {
    product = vec4(mix(u_background, product.rgb, product.a), 1.);
  }
  outColor = product;
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create the Paper Texture shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Paper Texture shader compilation failed.";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function numberValue(value: unknown, fallback: number, min: number, max: number): number {
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

function hexRgb(value: string): [number, number, number] {
  const hex = value.replace("#", "").padEnd(6, "0").slice(0, 6);
  return [0, 2, 4].map((index) => {
    const parsed = Number.parseInt(hex.slice(index, index + 2), 16);
    return Number.isFinite(parsed) ? parsed / 255 : 0;
  }) as [number, number, number];
}

function styleValue(value: unknown): PaperStyle {
  return value === "newsprint" || value === "fibers" ? value : "fine-dots";
}

function getPaperSettings(state: ToolcraftState): PaperSettings {
  return {
    amount: numberValue(state.values["paper.amount"], 28, 0, 100) / 100,
    background: colorValue(state.values["paper.background"], "#F4F1E8"),
    fade: numberValue(state.values["paper.fade"], 8, 0, 40) / 100,
    scale: numberValue(state.values["paper.scale"], 5, 2, 16),
    style: styleValue(state.values["paper.style"]),
  };
}

export function getPaperSources(state: ToolcraftState): ToolcraftMediaAsset[] {
  return state.mediaAssets.filter((asset) => asset.sourceTarget === "paper.sources");
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to decode a Paper Texture source image."));
    image.src = url;
  });
}

class PaperTextureGlRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly texture: WebGLTexture;
  private image: HTMLImageElement | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL 2 is required for Paper Texture Batch.");
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    if (!program || !buffer || !texture) throw new Error("Unable to create Paper Texture GPU resources.");
    const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "Unable to link the Paper Texture shader.");
    }
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

  setImage(image: HTMLImageElement): void {
    this.image = image;
    const { gl } = this;
    gl.useProgram(this.program);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }

  draw(settings: PaperSettings, transform: ToolcraftMediaTransform | undefined, includeBackground: boolean, pixelRatio: number): void {
    if (!this.image) return;
    const { gl, program } = this;
    const rotation = (((transform?.rotationDeg ?? 0) / 90) % 4 + 4) % 4;
    const rotated = rotation % 2 === 1;
    const sourceWidth = rotated ? this.image.naturalHeight : this.image.naturalWidth;
    const sourceHeight = rotated ? this.image.naturalWidth : this.image.naturalHeight;
    const background = hexRgb(settings.background);
    const styleIndex = settings.style === "newsprint" ? 1 : settings.style === "fibers" ? 2 : 0;
    gl.useProgram(program);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform2f(gl.getUniformLocation(program, "u_source"), sourceWidth, sourceHeight);
    gl.uniform2f(gl.getUniformLocation(program, "u_output"), this.canvas.width, this.canvas.height);
    gl.uniform4f(gl.getUniformLocation(program, "u_paper"), settings.amount, settings.scale, styleIndex, settings.fade);
    gl.uniform3f(gl.getUniformLocation(program, "u_background"), background[0], background[1], background[2]);
    gl.uniform3f(gl.getUniformLocation(program, "u_transform"), rotation, transform?.flipHorizontal ? 1 : 0, transform?.flipVertical ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(program, "u_includeBackground"), includeBackground ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(program, "u_pixelRatio"), Math.max(1, pixelRatio));
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

function renderPaperFrame(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  settings: PaperSettings,
  transform: ToolcraftMediaTransform | undefined,
  includeBackground: boolean,
  pixelRatio: number,
): void {
  const renderer = new PaperTextureGlRenderer(canvas);
  renderer.setImage(image);
  renderer.draw(settings, transform, includeBackground, pixelRatio);
  renderer.destroy();
}

function canvasToBlob(canvas: HTMLCanvasElement, format: "jpg" | "png"): Promise<Blob> {
  const mime = format === "jpg" ? "image/jpeg" : "image/png";
  return new Promise((resolve, reject) => canvas.toBlob(
    (value) => value ? resolve(value) : reject(new Error("Paper Texture image encoding failed.")),
    mime,
    0.94,
  ));
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeBaseName(fileName: string, index: number): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const safe = withoutExtension.normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return safe || `image-${String(index + 1).padStart(2, "0")}`;
}

type PaperExportSession = {
  canvas: HTMLCanvasElement;
  renderer: PaperTextureGlRenderer;
};

async function renderPaperExportCanvas(
  state: ToolcraftState,
  source: ToolcraftMediaAsset,
  session?: PaperExportSession,
): Promise<HTMLCanvasElement> {
  const image = await loadImage(source.dataUrl);
  const settings = getPaperSettings(state);
  const includeBackground = Boolean(state.values["export.includeBackground"]);
  return createToolcraftPngExportCanvas({
    background: settings.background,
    includeBackground,
    resolution: state.values["export.image.resolution"] as string,
    state,
    render: ({ context, cssHeight, cssWidth, pixelRatio }) => {
      const frame = session?.canvas ?? document.createElement("canvas");
      const width = Math.max(1, Math.round(cssWidth * pixelRatio));
      const height = Math.max(1, Math.round(cssHeight * pixelRatio));
      if (frame.width !== width) frame.width = width;
      if (frame.height !== height) frame.height = height;
      if (session) {
        session.renderer.setImage(image);
        session.renderer.draw(settings, source.transform, includeBackground, pixelRatio);
      } else {
        renderPaperFrame(frame, image, settings, source.transform, includeBackground, pixelRatio);
      }
      context.drawImage(frame, 0, 0, cssWidth, cssHeight);
    },
  });
}

export async function exportPaperImage(state: ToolcraftState, shouldDownload = true): Promise<Blob> {
  const source = getPaperSources(state)[0];
  if (!source) throw new Error("Upload at least one image before exporting Paper Texture.");
  const format = state.values["export.image.format"] === "jpg" ? "jpg" : "png";
  const canvas = await renderPaperExportCanvas(state, source);
  const blob = await canvasToBlob(canvas, format);
  if (shouldDownload) downloadBlob(blob, `${safeBaseName(source.fileName, 0)}-paper.${format}`);
  return blob;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function setUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function setUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true);
}

export type StoredZipEntry = { bytes: Uint8Array; name: string };

export function createStoredZip(entries: readonly StoredZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const localChunks: BlobPart[] = [];
  const centralChunks: BlobPart[] = [];
  let localOffset = 0;
  let centralSize = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const checksum = crc32(entry.bytes);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    setUint32(localView, 0, 0x04034b50);
    setUint16(localView, 4, 20);
    setUint16(localView, 6, 0x0800);
    setUint16(localView, 8, 0);
    setUint32(localView, 14, checksum);
    setUint32(localView, 18, entry.bytes.length);
    setUint32(localView, 22, entry.bytes.length);
    setUint16(localView, 26, name.length);
    local.set(name, 30);
    localChunks.push(local, Uint8Array.from(entry.bytes));

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    setUint32(centralView, 0, 0x02014b50);
    setUint16(centralView, 4, 20);
    setUint16(centralView, 6, 20);
    setUint16(centralView, 8, 0x0800);
    setUint16(centralView, 10, 0);
    setUint32(centralView, 16, checksum);
    setUint32(centralView, 20, entry.bytes.length);
    setUint32(centralView, 24, entry.bytes.length);
    setUint16(centralView, 28, name.length);
    setUint32(centralView, 42, localOffset);
    central.set(name, 46);
    centralChunks.push(central);
    centralSize += central.length;
    localOffset += local.length + entry.bytes.length;
  }
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  setUint32(endView, 0, 0x06054b50);
  setUint16(endView, 8, entries.length);
  setUint16(endView, 10, entries.length);
  setUint32(endView, 12, centralSize);
  setUint32(endView, 16, localOffset);
  return new Blob([...localChunks, ...centralChunks, end], { type: "application/zip" });
}

export async function exportPaperBatch(
  state: ToolcraftState,
  reportProgress: (progress: number) => void = () => undefined,
  shouldDownload = true,
): Promise<Blob> {
  const sources = getPaperSources(state);
  if (sources.length === 0) throw new Error("Upload at least one image before exporting a batch.");
  if (sources.length > PAPER_BATCH_LIMIT) throw new Error(`Paper Texture Batch supports up to ${PAPER_BATCH_LIMIT} images at a time.`);
  const format = state.values["export.image.format"] === "jpg" ? "jpg" : "png";
  const names = new Map<string, number>();
  const entries: StoredZipEntry[] = [];
  const frame = document.createElement("canvas");
  const session = { canvas: frame, renderer: new PaperTextureGlRenderer(frame) };
  try {
    for (const [index, source] of sources.entries()) {
      const canvas = await renderPaperExportCanvas(state, source, session);
      const blob = await canvasToBlob(canvas, format);
      const base = safeBaseName(source.fileName, index);
      const occurrence = names.get(base) ?? 0;
      names.set(base, occurrence + 1);
      const suffix = occurrence === 0 ? "" : `-${occurrence + 1}`;
      entries.push({ bytes: new Uint8Array(await blob.arrayBuffer()), name: `${base}${suffix}-paper.${format}` });
      reportProgress((index + 1) / (sources.length + 1));
    }
  } finally {
    session.renderer.destroy();
  }
  const zip = createStoredZip(entries);
  reportProgress(1);
  if (shouldDownload) downloadBlob(zip, "paper-texture-batch.zip");
  return zip;
}

export function PaperTextureRenderer(): React.JSX.Element | null {
  const { state } = useToolcraft();
  const source = getPaperSources(state)[0] ?? null;
  const settings = getPaperSettings(state);
  const includeBackground = shouldIncludeToolcraftPreviewBackground({ state });
  const renderScale = numberValue(state.values["canvas.renderScale"], 1, 1, 2);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const rendererRef = React.useRef<PaperTextureGlRenderer | null>(null);
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    rendererRef.current = new PaperTextureGlRenderer(canvas);
    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [source?.id]);

  React.useEffect(() => {
    let cancelled = false;
    if (!source) {
      setImage(null);
      return;
    }
    void loadImage(source.dataUrl).then((nextImage) => {
      if (!cancelled) setImage(nextImage);
    });
    return () => { cancelled = true; };
  }, [source?.dataUrl]);

  React.useEffect(() => {
    if (!image || !rendererRef.current) return;
    rendererRef.current.setImage(image);
  }, [image]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer || !image || !source) return;
    canvas.width = Math.max(1, Math.round(state.canvas.size.width * renderScale));
    canvas.height = Math.max(1, Math.round(state.canvas.size.height * renderScale));
    renderer.draw(settings, source.transform, includeBackground, renderScale);
    canvas.dataset.paperAmount = String(Math.round(settings.amount * 100));
    canvas.dataset.paperScale = String(settings.scale);
  }, [image, includeBackground, renderScale, settings.amount, settings.background, settings.fade, settings.scale, settings.style, source?.transform?.flipHorizontal, source?.transform?.flipVertical, source?.transform?.rotationDeg, state.canvas.size.height, state.canvas.size.width]);

  if (!source) return null;

  return <canvas
    aria-label="Paper textured image output"
    className="absolute inset-0 block size-full"
    data-batch-count={getPaperSources(state).length}
    data-paper-style={settings.style}
    data-toolcraft-product-output=""
    ref={canvasRef}
    style={{ backgroundColor: includeBackground ? settings.background : "transparent", height: state.canvas.size.height, width: state.canvas.size.width }}
  />;
}
