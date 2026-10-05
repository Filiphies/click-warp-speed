import * as React from "react";
import type { Mp4OutputFormat, VideoCodec, WebMOutputFormat } from "mediabunny";

import {
  createToolcraftPngExportCanvas,
  getToolcraftTimelineLoopProgress,
  getToolcraftVideoExportSize,
  shouldIncludeToolcraftExportBackground,
  shouldIncludeToolcraftPreviewBackground,
  type ToolcraftMediaAsset,
  type ToolcraftMediaTransform,
  type ToolcraftState,
} from "@/toolcraft/runtime";
import { useToolcraft } from "@/toolcraft/runtime/react";
import { getCurvePointAtX } from "@/toolcraft/ui";

import { useClipboardImageImport } from "./use-clipboard-image-import";

type ClipGradientStop = { color: string; opacity: number; position: number };
type ClipGradient = { angle: number; gradientType: "linear" | "radial" | "angular" | "diamond"; stops: readonly ClipGradientStop[] };
type ClipFieldShape = "straight" | "whirlpool" | "sweep" | "wave";
type ClipEasingPoint = { x: number; y: number };
type ClipSettings = {
  background: string;
  bloomRadius: number;
  bloomStrength: number;
  count: number;
  curl: number;
  edgeNoise: number;
  fieldShape: ClipFieldShape;
  focusX: number;
  focusY: number;
  gradient: ClipGradient;
  minLength: number;
  motionActive: number;
  motionEasing: readonly ClipEasingPoint[];
  motionSeed: number;
  motionSpeed: number;
  motionOverlap: number;
  motionStagger: number;
  noiseAmount: number;
  noiseScale: number;
  noiseSpeed: number;
  threshold: number;
  width: number;
  wiggle: number;
};
type ClipPoint = { x: number; y: number };
type ClipCubic = {
  controlEnd: ClipPoint;
  controlStart: ClipPoint;
  end: ClipPoint;
  start: ClipPoint;
};
type ClipSegment = {
  end: ClipPoint;
  fieldAngle: number;
  fieldEnd: number;
  fieldStart: number;
  geometricLength: number;
  id: string;
  pathData: string;
  points: readonly ClipPoint[];
  start: ClipPoint;
};
type ClipCarrierPoint = { distance: number; point: ClipPoint };
type ClipMotionSegment = {
  carrier: readonly ClipCarrierPoint[];
  repeatDistance: number;
  segment: ClipSegment;
  staticEndDistance: number;
  staticStartDistance: number;
  trailLength: number;
};
type ClipMotionCopy = {
  copyIndex: number;
  dashLength: number;
  dashStart: number;
  segment: ClipSegment;
  windowStart: number;
};
type ClipMotionFrame = { copies: readonly ClipMotionCopy[]; segmentId: string };
type PreparedClipMotion = { motion: ClipMotionSegment; stagger: number };
type ThresholdMask = { alpha: Uint8Array; bottomUp: true; dataUrl: string; height: number; width: number };

const decodedImages = new Map<string, Promise<HTMLImageElement>>();
const maskCache = new Map<string, Promise<ThresholdMask>>();
const linearMotionEasing: readonly ClipEasingPoint[] = [
  { x: 0, y: 0 },
  { x: 0.5, y: 0.5 },
  { x: 1, y: 1 },
];

function numberValue(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function colorValue(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "hex" in value && typeof (value as { hex?: unknown }).hex === "string") return (value as { hex: string }).hex;
  return fallback;
}

function gradientValue(value: unknown): ClipGradient {
  const fallback: ClipGradient = {
    angle: 0,
    gradientType: "linear",
    stops: [
      { color: "#FFFFFF", opacity: 100, position: 0 },
      { color: "#8CB7FF", opacity: 100, position: 0.28 },
      { color: "#2C69D1", opacity: 100, position: 1 },
    ],
  };
  if (!value || typeof value !== "object") return fallback;
  const source = value as { angle?: unknown; gradientType?: unknown; stops?: unknown };
  const stops = Array.isArray(source.stops)
    ? source.stops.flatMap((candidate): ClipGradientStop[] => {
      if (!candidate || typeof candidate !== "object") return [];
      const stop = candidate as { color?: unknown; opacity?: unknown; position?: unknown };
      const position = typeof stop.position === "string" ? Number.parseFloat(stop.position) / 100 : Number(stop.position);
      return [{
        color: colorValue(stop.color, "#FFFFFF"),
        opacity: Math.max(0, Math.min(100, numberValue(stop.opacity, 100))),
        position: Math.max(0, Math.min(1, Number.isFinite(position) ? position : 0)),
      }];
    }).sort((left, right) => left.position - right.position)
    : fallback.stops;
  const gradientType = source.gradientType === "radial" || source.gradientType === "angular" || source.gradientType === "diamond"
    ? source.gradientType
    : "linear";
  return { angle: numberValue(source.angle, 0), gradientType, stops: stops.length >= 2 ? stops : fallback.stops };
}

function focusValue(value: unknown): { x: number; y: number } {
  if (!value || typeof value !== "object") return { x: 0, y: 0 };
  const source = value as { x?: unknown; y?: unknown };
  return { x: numberValue(source.x, 0), y: numberValue(source.y, 0) };
}

function fieldShapeValue(value: unknown): ClipFieldShape {
  return value === "whirlpool" || value === "sweep" || value === "wave" ? value : "straight";
}

function motionEasingValue(value: unknown): readonly ClipEasingPoint[] {
  if (!value || typeof value !== "object") return linearMotionEasing;
  const points = (value as { points?: unknown }).points;
  if (!points || typeof points !== "object") return linearMotionEasing;
  const rgb = (points as { RGB?: unknown }).RGB;
  if (!Array.isArray(rgb)) return linearMotionEasing;
  const normalized = rgb.flatMap((candidate): ClipEasingPoint[] => {
    if (!candidate || typeof candidate !== "object") return [];
    const source = candidate as { x?: unknown; y?: unknown };
    const x = Number(source.x);
    const y = Number(source.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
    return [{ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) }];
  }).sort((left, right) => left.x - right.x);
  return normalized.length >= 2 ? normalized : linearMotionEasing;
}

function applyMotionEasing(phase: number, points: readonly ClipEasingPoint[]): number {
  const normalizedPhase = Math.max(0, Math.min(1, phase));
  if (normalizedPhase <= 0) return 0;
  if (normalizedPhase >= 1) return 1;
  const start = getCurvePointAtX(points, 0, "smooth").y;
  const end = getCurvePointAtX(points, 1, "smooth").y;
  const span = end - start;
  if (Math.abs(span) < 0.000001) return normalizedPhase;
  const value = getCurvePointAtX(points, normalizedPhase, "smooth").y;
  return Math.max(0, Math.min(1, (value - start) / span));
}

function motionEasingSignature(points: readonly ClipEasingPoint[]): string {
  return points.map((point) => `${roundCoordinate(point.x)},${roundCoordinate(point.y)}`).join(";");
}

function getClipSettings(state: ToolcraftState): ClipSettings {
  const focus = focusValue(state.values["clip.focus"]);
  return {
    background: colorValue(state.values["clip.background"], "#05070B"),
    bloomRadius: Math.max(0, Math.min(80, numberValue(state.values["clip.bloomRadius"], 18))),
    bloomStrength: Math.max(0, Math.min(100, numberValue(state.values["clip.bloomStrength"], 35))),
    count: Math.max(32, Math.min(1200, Math.round(numberValue(state.values["clip.count"], 320)))),
    curl: Math.max(-100, Math.min(100, numberValue(state.values["clip.curl"], 45))),
    edgeNoise: Math.max(0, Math.min(100, numberValue(state.values["clip.edgeNoise"], 0))),
    fieldShape: fieldShapeValue(state.values["clip.fieldShape"]),
    focusX: focus.x * 0.46 + 0.5,
    focusY: focus.y * 0.46 + 0.5,
    gradient: gradientValue(state.values["clip.gradient"]),
    minLength: Math.max(0, Math.min(200, numberValue(state.values["clip.minLength"], 12))),
    motionActive: Math.max(0, Math.min(100, numberValue(state.values["clip.motionActive"], 65))),
    motionEasing: motionEasingValue(state.values["clip.motionEasing"]),
    motionSeed: Math.max(1, Math.min(100, Math.round(numberValue(state.values["clip.motionSeed"], 1)))),
    motionSpeed: Math.max(1, Math.min(100, Math.round(numberValue(state.values["clip.motionSpeed"], 1)))),
    motionOverlap: Math.max(0, Math.min(70, numberValue(state.values["clip.motionOverlap"], 0))),
    motionStagger: Math.max(0, Math.min(100, numberValue(state.values["clip.motionStagger"], 70))),
    noiseAmount: Math.max(0, Math.min(100, numberValue(state.values["clip.noiseAmount"], 20))),
    noiseScale: Math.max(1, Math.min(64, Math.round(numberValue(state.values["clip.noiseScale"], 12)))),
    noiseSpeed: Math.max(0, Math.min(20, Math.round(numberValue(state.values["clip.noiseSpeed"], 4)))),
    threshold: Math.max(0, Math.min(1, numberValue(state.values["clip.threshold"], 50) / 100)),
    width: Math.max(0.5, Math.min(100, numberValue(state.values["clip.width"], 1))),
    wiggle: Math.max(0, Math.min(80, numberValue(state.values["clip.wiggle"], 0))),
  };
}

function getClipSource(state: ToolcraftState): ToolcraftMediaAsset | null {
  return state.mediaAssets.find((asset) => asset.sourceTarget === "clip.source") ?? null;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  const cached = decodedImages.get(dataUrl);
  if (cached) return cached;
  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to decode the Clip Lab image."));
    image.src = dataUrl;
  });
  decodedImages.set(dataUrl, pending);
  return pending;
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  transform: ToolcraftMediaTransform | undefined,
): void {
  const rotation = ((transform?.rotationDeg ?? 0) % 360 + 360) % 360;
  const swapped = rotation === 90 || rotation === 270;
  const rotatedWidth = swapped ? image.naturalHeight : image.naturalWidth;
  const rotatedHeight = swapped ? image.naturalWidth : image.naturalHeight;
  const scale = Math.max(width / Math.max(1, rotatedWidth), height / Math.max(1, rotatedHeight));
  context.save();
  context.translate(width / 2, height / 2);
  context.scale(transform?.flipHorizontal ? -1 : 1, transform?.flipVertical ? -1 : 1);
  context.rotate(rotation * Math.PI / 180);
  context.drawImage(image, -image.naturalWidth * scale / 2, -image.naturalHeight * scale / 2, image.naturalWidth * scale, image.naturalHeight * scale);
  context.restore();
}

function transformKey(transform: ToolcraftMediaTransform | undefined): string {
  return `${transform?.rotationDeg ?? 0}:${transform?.flipHorizontal ? 1 : 0}:${transform?.flipVertical ? 1 : 0}`;
}

async function createThresholdMask(asset: ToolcraftMediaAsset, threshold: number, width: number, height: number): Promise<ThresholdMask> {
  const longEdge = 512;
  const scale = longEdge / Math.max(width, height);
  const maskWidth = Math.max(1, Math.round(width * scale));
  const maskHeight = Math.max(1, Math.round(height * scale));
  const key = `${asset.dataUrl}:${transformKey(asset.transform)}:${threshold.toFixed(3)}:${maskWidth}x${maskHeight}`;
  const cached = maskCache.get(key);
  if (cached) return cached;
  const pending = loadImage(asset.dataUrl).then((image) => {
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = maskWidth;
    sourceCanvas.height = maskHeight;
    const sourceContext = sourceCanvas.getContext("2d");
    if (!sourceContext) {
      const alpha = new Uint8Array(maskWidth * maskHeight * 4);
      return { alpha, bottomUp: true as const, dataUrl: "", height: maskHeight, width: maskWidth };
    }
    drawCover(sourceContext, image, maskWidth, maskHeight, asset.transform);

    const thresholdCanvas = document.createElement("canvas");
    thresholdCanvas.width = maskWidth;
    thresholdCanvas.height = maskHeight;
    const gl = thresholdCanvas.getContext("webgl", { premultipliedAlpha: false });
    if (!gl) {
      const alpha = new Uint8Array(maskWidth * maskHeight * 4);
      return { alpha, bottomUp: true as const, dataUrl: "", height: maskHeight, width: maskWidth };
    }
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Unable to create the Clip Lab threshold shader.");
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, "attribute vec2 p; varying vec2 uv; void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}");
    const fragment = compile(gl.FRAGMENT_SHADER, "precision mediump float; varying vec2 uv; uniform sampler2D sourceImage; uniform float cutoff; void main(){vec3 c=texture2D(sourceImage,uv).rgb;float a=step(cutoff,dot(c,vec3(.2126,.7152,.0722)));gl_FragColor=vec4(1.,1.,1.,a);}");
    const program = gl.createProgram();
    if (!program) throw new Error("Unable to create the Clip Lab threshold program.");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
    gl.uniform1i(gl.getUniformLocation(program, "sourceImage"), 0);
    gl.uniform1f(gl.getUniformLocation(program, "cutoff"), threshold);
    gl.viewport(0, 0, maskWidth, maskHeight);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const alpha = new Uint8Array(maskWidth * maskHeight * 4);
    gl.readPixels(0, 0, maskWidth, maskHeight, gl.RGBA, gl.UNSIGNED_BYTE, alpha);
    const dataUrl = thresholdCanvas.toDataURL("image/png");
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { alpha, bottomUp: true as const, dataUrl, height: maskHeight, width: maskWidth };
  });
  maskCache.set(key, pending);
  if (maskCache.size > 16) maskCache.delete(maskCache.keys().next().value as string);
  return pending;
}

function roundCoordinate(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function pointOnField(focusX: number, focusY: number, radius: number, angle: number, settings: ClipSettings, progress: number): ClipPoint {
  const curl = settings.curl / 100;
  const distance = radius * progress;
  let directionAngle = angle;
  let lateralOffset = 0;

  if (settings.fieldShape === "whirlpool") {
    directionAngle += curl * Math.PI * 2 * Math.sign(progress) * Math.pow(Math.abs(progress), 1.2);
  } else if (settings.fieldShape === "sweep") {
    lateralOffset = curl * radius * 0.42 * progress * Math.abs(progress);
  } else if (settings.fieldShape === "wave") {
    lateralOffset = curl * radius * 0.09 * Math.sin(progress * Math.PI * 4) * Math.sin(progress * Math.PI);
  }

  const directionX = Math.cos(directionAngle);
  const directionY = Math.sin(directionAngle);
  const baseDirectionX = Math.cos(angle);
  const baseDirectionY = Math.sin(angle);
  const wiggle = Math.sin(progress * Math.PI * 2 + angle * 2.7) * settings.wiggle * Math.sin(Math.PI * progress);
  const normalX = -Math.sin(directionAngle);
  const normalY = Math.cos(directionAngle);
  return {
    x: focusX + directionX * distance - baseDirectionY * lateralOffset + normalX * wiggle,
    y: focusY + directionY * distance + baseDirectionX * lateralOffset + normalY * wiggle,
  };
}

function pathFromPoints(points: readonly ClipPoint[]): string {
  if (points.length === 0) return "";
  const commands = [`M${roundCoordinate(points[0].x)} ${roundCoordinate(points[0].y)}`];
  if (points.length === 1) return commands[0];
  if (points.length === 2) {
    commands.push(`L${roundCoordinate(points[1].x)} ${roundCoordinate(points[1].y)}`);
    return commands.join(" ");
  }
  for (const cubic of cubicSegmentsFromPoints(points)) {
    commands.push(`C${roundCoordinate(cubic.controlStart.x)} ${roundCoordinate(cubic.controlStart.y)} ${roundCoordinate(cubic.controlEnd.x)} ${roundCoordinate(cubic.controlEnd.y)} ${roundCoordinate(cubic.end.x)} ${roundCoordinate(cubic.end.y)}`);
  }
  return commands.join(" ");
}

function cubicSegmentsFromPoints(points: readonly ClipPoint[]): readonly ClipCubic[] {
  const cubics: ClipCubic[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const before = points[Math.max(0, index - 1)];
    const start = points[index];
    const end = points[index + 1];
    const after = points[Math.min(points.length - 1, index + 2)];
    const controlStart = {
      x: start.x + (end.x - before.x) / 6,
      y: start.y + (end.y - before.y) / 6,
    };
    const controlEnd = {
      x: end.x - (after.x - start.x) / 6,
      y: end.y - (after.y - start.y) / 6,
    };
    cubics.push({ controlEnd, controlStart, end, start });
  }
  return cubics;
}

function interpolatePoint(start: ClipPoint, end: ClipPoint, progress: number): ClipPoint {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}

function pointOnCubic(cubic: ClipCubic, progress: number): ClipPoint {
  const inverse = 1 - progress;
  return {
    x: inverse ** 3 * cubic.start.x
      + 3 * inverse ** 2 * progress * cubic.controlStart.x
      + 3 * inverse * progress ** 2 * cubic.controlEnd.x
      + progress ** 3 * cubic.end.x,
    y: inverse ** 3 * cubic.start.y
      + 3 * inverse ** 2 * progress * cubic.controlStart.y
      + 3 * inverse * progress ** 2 * cubic.controlEnd.y
      + progress ** 3 * cubic.end.y,
  };
}

function splitCubic(cubic: ClipCubic, progress: number): readonly [ClipCubic, ClipCubic] {
  const startControl = interpolatePoint(cubic.start, cubic.controlStart, progress);
  const controlBridge = interpolatePoint(cubic.controlStart, cubic.controlEnd, progress);
  const endControl = interpolatePoint(cubic.controlEnd, cubic.end, progress);
  const leftControl = interpolatePoint(startControl, controlBridge, progress);
  const rightControl = interpolatePoint(controlBridge, endControl, progress);
  const splitPoint = interpolatePoint(leftControl, rightControl, progress);
  return [
    { controlEnd: leftControl, controlStart: startControl, end: splitPoint, start: cubic.start },
    { controlEnd: endControl, controlStart: rightControl, end: cubic.end, start: splitPoint },
  ];
}

function sliceCubic(cubic: ClipCubic, startProgress: number, endProgress: number): ClipCubic {
  if (startProgress <= 0 && endProgress >= 1) return cubic;
  const [beforeEnd] = splitCubic(cubic, endProgress);
  if (startProgress <= 0) return beforeEnd;
  const [, slice] = splitCubic(beforeEnd, startProgress / Math.max(0.000001, endProgress));
  return slice;
}

function pathFromCubics(cubics: readonly ClipCubic[]): string {
  if (cubics.length === 0) return "";
  return [
    `M${roundCoordinate(cubics[0].start.x)} ${roundCoordinate(cubics[0].start.y)}`,
    ...cubics.map((cubic) => `C${roundCoordinate(cubic.controlStart.x)} ${roundCoordinate(cubic.controlStart.y)} ${roundCoordinate(cubic.controlEnd.x)} ${roundCoordinate(cubic.controlEnd.y)} ${roundCoordinate(cubic.end.x)} ${roundCoordinate(cubic.end.y)}`),
  ].join(" ");
}

function createSolidPathWindow(points: readonly ClipPoint[], startProgress: number, lengthProgress: number): string {
  const start = Math.max(0, Math.min(1, startProgress));
  const end = Math.max(start, Math.min(1, start + lengthProgress));
  if (end - start < 0.000001 || points.length < 2) return "";
  if (points.length === 2) {
    const lineStart = interpolatePoint(points[0], points[1], start);
    const lineEnd = interpolatePoint(points[0], points[1], end);
    return `M${roundCoordinate(lineStart.x)} ${roundCoordinate(lineStart.y)} L${roundCoordinate(lineEnd.x)} ${roundCoordinate(lineEnd.y)}`;
  }

  const cubics = cubicSegmentsFromPoints(points);
  const arcTables = cubics.map((cubic) => {
    const samples: Array<{ distance: number; progress: number }> = [{ distance: 0, progress: 0 }];
    let distance = 0;
    let previous = cubic.start;
    for (let sample = 1; sample <= 16; sample += 1) {
      const progress = sample / 16;
      const point = pointOnCubic(cubic, progress);
      distance += Math.hypot(point.x - previous.x, point.y - previous.y);
      samples.push({ distance, progress });
      previous = point;
    }
    return { cubic, length: distance, samples };
  });
  const totalLength = arcTables.reduce((total, table) => total + table.length, 0);
  if (totalLength < 0.000001) return "";

  const locate = (normalizedProgress: number): { segmentIndex: number; segmentProgress: number } => {
    const targetDistance = Math.max(0, Math.min(totalLength, normalizedProgress * totalLength));
    let traversed = 0;
    for (let segmentIndex = 0; segmentIndex < arcTables.length; segmentIndex += 1) {
      const table = arcTables[segmentIndex];
      if (targetDistance <= traversed + table.length || segmentIndex === arcTables.length - 1) {
        const localDistance = Math.max(0, Math.min(table.length, targetDistance - traversed));
        for (let sampleIndex = 1; sampleIndex < table.samples.length; sampleIndex += 1) {
          const sample = table.samples[sampleIndex];
          if (localDistance <= sample.distance || sampleIndex === table.samples.length - 1) {
            const previous = table.samples[sampleIndex - 1];
            const sampleSpan = Math.max(0.000001, sample.distance - previous.distance);
            const sampleProgress = (localDistance - previous.distance) / sampleSpan;
            return {
              segmentIndex,
              segmentProgress: previous.progress + (sample.progress - previous.progress) * sampleProgress,
            };
          }
        }
      }
      traversed += table.length;
    }
    return { segmentIndex: arcTables.length - 1, segmentProgress: 1 };
  };

  const windowStart = locate(start);
  const windowEnd = locate(end);
  const windowCubics: ClipCubic[] = [];
  for (let segmentIndex = windowStart.segmentIndex; segmentIndex <= windowEnd.segmentIndex; segmentIndex += 1) {
    const segmentStart = segmentIndex === windowStart.segmentIndex ? windowStart.segmentProgress : 0;
    const segmentEnd = segmentIndex === windowEnd.segmentIndex ? windowEnd.segmentProgress : 1;
    if (segmentEnd - segmentStart < 0.000001) continue;
    windowCubics.push(sliceCubic(cubics[segmentIndex], segmentStart, segmentEnd));
  }
  return pathFromCubics(windowCubics);
}

function hashUnit(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function clipNoiseBand(segmentId: string, scale: number): number {
  const rayIndex = Number.parseInt(segmentId.split("-")[0] ?? "0", 10);
  return Math.floor((Number.isFinite(rayIndex) ? rayIndex : 0) / Math.max(1, scale));
}

function clipNoiseOpacity(segmentId: string, settings: ClipSettings, timelinePhase: number): number {
  if (settings.noiseAmount <= 0) return 1;
  const band = clipNoiseBand(segmentId, settings.noiseScale);
  const phaseOffset = hashUnit(`sandbox-noise:${settings.motionSeed}:${band}`);
  if (settings.noiseSpeed <= 0) {
    return 1 - settings.noiseAmount / 100 * 0.72 * hashUnit(`sandbox-noise-static:${settings.motionSeed}:${band}`);
  }
  const phase = positiveModulo(timelinePhase * settings.noiseSpeed + phaseOffset, 1);
  const primary = Math.sin(phase * Math.PI * 2);
  const detail = Math.sin((phase * 2 + phaseOffset * 0.37) * Math.PI * 2);
  const noise = Math.max(0, Math.min(1, 0.5 + primary * 0.34 + detail * 0.16));
  return 1 - settings.noiseAmount / 100 * 0.72 * noise;
}

function positiveModulo(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo;
}

function createClipMotionSegment(
  segment: ClipSegment,
  settings: ClipSettings,
  overlap: number,
  width: number,
  height: number,
): ClipMotionSegment | null {
  if (segment.geometricLength < 0.001 || segment.fieldEnd <= segment.fieldStart) return null;
  const focusX = settings.focusX * width;
  const focusY = settings.focusY * height;
  const radius = Math.hypot(width, height) * 1.15;
  const pointAt = (progress: number) => pointOnField(focusX, focusY, radius, segment.fieldAngle, settings, progress);
  const progressStep = Math.max(1 / 4096, (segment.fieldEnd - segment.fieldStart) / Math.max(24, segment.points.length - 1));
  const repeatScale = 1 - overlap / 100;
  const extensionDistance = segment.geometricLength + settings.width * 2;
  const backward: ClipPoint[] = [segment.start];
  let backwardLength = 0;
  let backwardProgress = segment.fieldStart;
  for (let index = 0; index < 512 && backwardLength < extensionDistance; index += 1) {
    backwardProgress -= progressStep;
    const point = pointAt(backwardProgress);
    const previous = backward[backward.length - 1];
    backwardLength += Math.hypot(point.x - previous.x, point.y - previous.y);
    backward.push(point);
  }
  const forward: ClipPoint[] = [segment.end];
  let forwardLength = 0;
  let forwardProgress = segment.fieldEnd;
  for (let index = 0; index < 512 && forwardLength < extensionDistance; index += 1) {
    forwardProgress += progressStep;
    const point = pointAt(forwardProgress);
    const previous = forward[forward.length - 1];
    forwardLength += Math.hypot(point.x - previous.x, point.y - previous.y);
    forward.push(point);
  }
  const carrierPoints = [
    ...backward.slice().reverse(),
    ...segment.points.slice(1),
    ...forward.slice(1),
  ];
  const carrier: ClipCarrierPoint[] = [];
  let distance = 0;
  carrierPoints.forEach((point, index) => {
    if (index > 0) distance += Math.hypot(point.x - carrierPoints[index - 1].x, point.y - carrierPoints[index - 1].y);
    carrier.push({ distance, point });
  });
  const staticStartIndex = backward.length - 1;
  const staticEndIndex = staticStartIndex + segment.points.length - 1;
  const staticStartDistance = carrier[staticStartIndex].distance;
  const staticEndDistance = carrier[staticEndIndex].distance;
  const trailLength = staticEndDistance - staticStartDistance;
  if (trailLength < 0.001) return null;

  return {
    carrier,
    repeatDistance: trailLength * repeatScale,
    segment,
    staticEndDistance,
    staticStartDistance,
    trailLength,
  };
}

function pointAtCarrierDistance(carrier: readonly ClipCarrierPoint[], targetDistance: number): ClipPoint {
  const clamped = Math.max(carrier[0].distance, Math.min(carrier[carrier.length - 1].distance, targetDistance));
  let low = 0;
  let high = carrier.length - 1;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (carrier[middle].distance < clamped) low = middle;
    else high = middle;
  }
  const start = carrier[low];
  const end = carrier[high];
  const span = Math.max(0.000001, end.distance - start.distance);
  const progress = (clamped - start.distance) / span;
  return {
    x: start.point.x + (end.point.x - start.point.x) * progress,
    y: start.point.y + (end.point.y - start.point.y) * progress,
  };
}

function createMotionCopyState(motion: ClipMotionSegment, windowStartDistance: number, copyIndex: number): ClipMotionCopy {
  const windowEndDistance = windowStartDistance + motion.trailLength;
  const visibleStartDistance = Math.max(windowStartDistance, motion.staticStartDistance);
  const visibleEndDistance = Math.min(windowEndDistance, motion.staticEndDistance);
  const visibleLength = Math.max(0, visibleEndDistance - visibleStartDistance);
  return {
    copyIndex,
    dashLength: Math.max(0, Math.min(1, visibleLength / motion.trailLength)),
    dashStart: Math.max(0, Math.min(1, (visibleStartDistance - motion.staticStartDistance) / motion.trailLength)),
    segment: {
      ...motion.segment,
      end: pointAtCarrierDistance(motion.carrier, windowEndDistance),
      id: `${motion.segment.id}-motion-${copyIndex}`,
      start: pointAtCarrierDistance(motion.carrier, windowStartDistance),
    },
    windowStart: (windowStartDistance - motion.staticStartDistance) / motion.trailLength,
  };
}

function createMotionCopyForPhase(motion: ClipMotionSegment, phase: number, copyIndex: number): ClipMotionCopy {
  const windowStartDistance = motion.staticStartDistance + motion.repeatDistance * (copyIndex - phase);
  return createMotionCopyState(motion, windowStartDistance, copyIndex);
}

function motionCopyIndicesForPhase(motion: ClipMotionSegment, phase: number): readonly number[] {
  const intersectionRadius = motion.trailLength / Math.max(0.000001, motion.repeatDistance);
  const firstIndex = Math.floor(phase - intersectionRadius) + 1;
  const lastIndex = Math.ceil(phase + intersectionRadius) - 1;
  return Array.from({ length: Math.max(0, lastIndex - firstIndex + 1) }, (_, index) => firstIndex + index);
}

function createClipMotionModel(
  segments: readonly ClipSegment[],
  settings: ClipSettings,
  width: number,
  height: number,
): readonly PreparedClipMotion[] {
  return segments.flatMap((segment): PreparedClipMotion[] => {
    if (hashUnit(`active:${settings.motionSeed}:${segment.id}`) >= settings.motionActive / 100) return [];
    const motion = createClipMotionSegment(segment, settings, settings.motionOverlap, width, height);
    if (!motion) return [];
    return [{
      motion,
      stagger: hashUnit(`phase:${settings.motionSeed}:${segment.id}`) * settings.motionStagger / 100,
    }];
  });
}

function createClipMotionFrames(
  model: readonly PreparedClipMotion[],
  timelinePhase: number,
  easing: readonly ClipEasingPoint[],
): readonly ClipMotionFrame[] {
  return model.map(({ motion, stagger }) => {
    const phase = applyMotionEasing(positiveModulo(timelinePhase + stagger, 1), easing);
    return {
      copies: motionCopyIndicesForPhase(motion, phase)
        .map((copyIndex) => createMotionCopyForPhase(motion, phase, copyIndex))
        .filter((copy) => copy.dashLength * motion.trailLength >= 0.001),
      segmentId: motion.segment.id,
    };
  });
}

function createClipSegments(mask: ThresholdMask, settings: ClipSettings, width: number, height: number): readonly ClipSegment[] {
  const focusX = settings.focusX * width;
  const focusY = settings.focusY * height;
  const radius = Math.hypot(width, height) * 1.15;
  const maskScale = Math.max(mask.width / width, mask.height / height);
  const curlStrength = Math.abs(settings.curl) / 100;
  const samplingMultiplier = settings.fieldShape === "whirlpool"
    ? 1 + curlStrength * 0.8
    : settings.fieldShape === "wave" ? 1 + curlStrength * 0.35 : settings.fieldShape === "sweep" ? 1 + curlStrength * 0.2 : 1;
  const sampleCount = Math.max(96, Math.ceil(radius * maskScale * 1.35 * samplingMultiplier));
  const segments: ClipSegment[] = [];

  for (let rayIndex = 0; rayIndex < settings.count; rayIndex += 1) {
    const angle = rayIndex / settings.count * Math.PI * 2;
    const pointAt = (progress: number) => pointOnField(focusX, focusY, radius, angle, settings, progress);
    const insideAt = (progress: number) => {
      const point = pointAt(progress);
      const x = Math.floor(point.x / width * mask.width);
      const y = Math.floor(point.y / height * mask.height);
      if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return false;
      const pixelY = mask.bottomUp ? mask.height - 1 - y : y;
      return mask.alpha[(pixelY * mask.width + x) * 4 + 3] > 0;
    };
    const refineBoundary = (low: number, high: number, highInside: boolean) => {
      for (let iteration = 0; iteration < 7; iteration += 1) {
        const middle = (low + high) / 2;
        if (insideAt(middle) === highInside) high = middle;
        else low = middle;
      }
      return (low + high) / 2;
    };

    let runStart: number | null = insideAt(0) ? 0 : null;
    let previousProgress = 0;
    let previousInside = runStart !== null;
    let runIndex = 0;
    const commitRun = (start: number, end: number) => {
      const candidateRunIndex = runIndex;
      runIndex += 1;
      if (end - start < 1 / sampleCount * 0.75) return;
      let pathStart = start;
      let pathEnd = end;
      if (settings.edgeNoise > 0) {
        const derivativeStep = 1 / 4096;
        const progressOffsetForDistance = (progress: number, distance: number) => {
          const before = pointAt(progress - derivativeStep);
          const after = pointAt(progress + derivativeStep);
          const pixelsPerProgress = Math.hypot(after.x - before.x, after.y - before.y) / (derivativeStep * 2);
          return distance / Math.max(1, pixelsPerProgress);
        };
        const maxOffsetPixels = Math.min(width, height) * 0.12 * settings.edgeNoise / 100;
        const startOffsetPixels = (hashUnit(`edge-start:${rayIndex}:${candidateRunIndex}`) * 2 - 1) * maxOffsetPixels;
        const endOffsetPixels = (hashUnit(`edge-end:${rayIndex}:${candidateRunIndex}`) * 2 - 1) * maxOffsetPixels;
        pathStart += progressOffsetForDistance(start, startOffsetPixels);
        pathEnd += progressOffsetForDistance(end, endOffsetPixels);
      }
      if (pathEnd - pathStart < 1 / sampleCount * 0.75) return;
      const fieldDetail = settings.fieldShape === "whirlpool"
        ? 48 + curlStrength * 48
        : settings.fieldShape === "wave" ? 64 : settings.fieldShape === "sweep" ? 36 : 0;
      const pointDetail = Math.max(settings.wiggle < 0.05 ? 0 : 36, fieldDetail);
      const pointSteps = pointDetail === 0 ? 1 : Math.max(2, Math.ceil((pathEnd - pathStart) * pointDetail));
      const points = Array.from({ length: pointSteps + 1 }, (_, index) => pointAt(pathStart + (pathEnd - pathStart) * index / pointSteps));
      const geometricLength = points.slice(1).reduce((total, point, index) => {
        const previous = points[index];
        return total + Math.hypot(point.x - previous.x, point.y - previous.y);
      }, 0);
      if (geometricLength < settings.minLength) return;
      const segment: ClipSegment = {
        end: points[points.length - 1],
        fieldAngle: angle,
        fieldEnd: pathEnd,
        fieldStart: pathStart,
        geometricLength,
        id: `${rayIndex}-${candidateRunIndex}`,
        pathData: pathFromPoints(points),
        points,
        start: points[0],
      };
      segments.push(segment);
    };

    for (let sample = 1; sample <= sampleCount; sample += 1) {
      const progress = sample / sampleCount;
      const inside = insideAt(progress);
      if (inside && !previousInside) runStart = refineBoundary(previousProgress, progress, true);
      if (!inside && previousInside && runStart !== null) {
        commitRun(runStart, refineBoundary(previousProgress, progress, false));
        runStart = null;
      }
      previousProgress = progress;
      previousInside = inside;
    }
    if (previousInside && runStart !== null) commitRun(runStart, 1);
  }
  return segments;
}

function gradientAxis(segment: ClipSegment, settings: ClipSettings): { x1: number; x2: number; y1: number; y2: number } {
  const deltaX = segment.end.x - segment.start.x;
  const deltaY = segment.end.y - segment.start.y;
  const length = Math.max(0.001, Math.hypot(deltaX, deltaY));
  const baseAngle = Math.atan2(deltaY, deltaX);
  const typeOffset = settings.gradient.gradientType === "angular"
    ? Math.PI / 2
    : settings.gradient.gradientType === "diamond" ? Math.PI / 4 : 0;
  const angle = baseAngle + settings.gradient.angle * Math.PI / 180 + typeOffset;
  const centerX = (segment.start.x + segment.end.x) / 2;
  const centerY = (segment.start.y + segment.end.y) / 2;
  const halfX = Math.cos(angle) * length / 2;
  const halfY = Math.sin(angle) * length / 2;
  return { x1: centerX - halfX, x2: centerX + halfX, y1: centerY - halfY, y2: centerY + halfY };
}

function gradientElement(segment: ClipSegment, settings: ClipSettings, gradientId = segment.id): React.JSX.Element {
  const stops = settings.gradient.stops.map((stop, index) => <stop
    key={index}
    offset={`${stop.position * 100}%`}
    stopColor={stop.color}
    stopOpacity={stop.opacity / 100}
  />);
  if (settings.gradient.gradientType === "radial") {
    const radius = Math.max(0.001, Math.hypot(segment.end.x - segment.start.x, segment.end.y - segment.start.y));
    return <radialGradient id={`clip-gradient-${gradientId}`} gradientUnits="userSpaceOnUse" cx={segment.start.x} cy={segment.start.y} fx={segment.start.x} fy={segment.start.y} key={gradientId} r={radius}>{stops}</radialGradient>;
  }
  const axis = gradientAxis(segment, settings);
  return <linearGradient id={`clip-gradient-${gradientId}`} gradientUnits="userSpaceOnUse" key={gradientId} {...axis}>{stops}</linearGradient>;
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function bloomFilterMarkup(settings: ClipSettings): string {
  if (settings.bloomStrength <= 0 || settings.bloomRadius <= 0) return "";
  return `<filter id="clip-sandbox-bloom" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${roundCoordinate(settings.bloomRadius)}"/></filter>`;
}

function styledPathGroupsMarkup(paths: readonly string[], settings: ClipSettings): string {
  const crisp = `<g data-clip-sandbox-core="">${paths.join("")}</g>`;
  if (settings.bloomStrength <= 0 || settings.bloomRadius <= 0) return crisp;
  return `<g data-clip-sandbox-bloom="" filter="url(#clip-sandbox-bloom)" opacity="${roundCoordinate(settings.bloomStrength / 100)}">${paths.join("")}</g>${crisp}`;
}

function gradientMarkup(segment: ClipSegment, settings: ClipSettings): string {
  const stops = settings.gradient.stops.map((stop) => `<stop offset="${roundCoordinate(stop.position * 100)}%" stop-color="${escapeXml(stop.color)}" stop-opacity="${roundCoordinate(stop.opacity / 100)}"/>`).join("");
  if (settings.gradient.gradientType === "radial") {
    const radius = Math.max(0.001, Math.hypot(segment.end.x - segment.start.x, segment.end.y - segment.start.y));
    return `<radialGradient id="clip-gradient-${segment.id}" gradientUnits="userSpaceOnUse" cx="${roundCoordinate(segment.start.x)}" cy="${roundCoordinate(segment.start.y)}" fx="${roundCoordinate(segment.start.x)}" fy="${roundCoordinate(segment.start.y)}" r="${roundCoordinate(radius)}">${stops}</radialGradient>`;
  }
  const axis = gradientAxis(segment, settings);
  return `<linearGradient id="clip-gradient-${segment.id}" gradientUnits="userSpaceOnUse" x1="${roundCoordinate(axis.x1)}" y1="${roundCoordinate(axis.y1)}" x2="${roundCoordinate(axis.x2)}" y2="${roundCoordinate(axis.y2)}">${stops}</linearGradient>`;
}

function serializeClipLabSvg(width: number, height: number, settings: ClipSettings, segments: readonly ClipSegment[], includeBackground: boolean, timelinePhase: number): string {
  const gradients = segments.map((segment) => gradientMarkup(segment, settings)).join("");
  const paths = segments.map((segment) => `<path d="${segment.pathData}" fill="none" opacity="${roundCoordinate(clipNoiseOpacity(segment.id, settings, timelinePhase))}" stroke="url(#clip-gradient-${segment.id})" stroke-width="${roundCoordinate(settings.width)}" stroke-linecap="round" stroke-linejoin="round"/>`);
  const background = includeBackground ? `<rect width="100%" height="100%" fill="${escapeXml(settings.background)}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" data-clip-sandbox="" data-noise-phase="${roundCoordinate(timelinePhase)}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><defs>${gradients}${bloomFilterMarkup(settings)}</defs>${background}${styledPathGroupsMarkup(paths, settings)}</svg>`;
}

function serializeClipLabFrameSvg(
  width: number,
  height: number,
  settings: ClipSettings,
  segments: readonly ClipSegment[],
  motionFrames: readonly ClipMotionFrame[],
  includeBackground: boolean,
  motionPhase: number,
  timelinePhase: number,
): string {
  const motionBySegmentId = new Map(motionFrames.map((frame) => [frame.segmentId, frame]));
  const gradients: string[] = [];
  const paths: string[] = [];
  segments.forEach((segment) => {
    const motionFrame = motionBySegmentId.get(segment.id);
    if (!motionFrame) {
      gradients.push(gradientMarkup(segment, settings));
      paths.push(`<path d="${segment.pathData}" data-clip-segment-id="${segment.id}" fill="none" opacity="${roundCoordinate(clipNoiseOpacity(segment.id, settings, timelinePhase))}" stroke="url(#clip-gradient-${segment.id})" stroke-width="${roundCoordinate(settings.width)}" stroke-linecap="round" stroke-linejoin="round"/>`);
      return;
    }
    motionFrame.copies.forEach((copy) => {
      const pathData = createSolidPathWindow(segment.points, copy.dashStart, copy.dashLength);
      if (!pathData) return;
      gradients.push(gradientMarkup(copy.segment, settings));
      paths.push(`<path d="${pathData}" data-clip-motion-copy="${copy.copyIndex}" data-clip-motion-window-length="${roundCoordinate(copy.dashLength)}" data-clip-motion-window-origin="${roundCoordinate(copy.windowStart)}" data-clip-motion-window-start="${roundCoordinate(copy.dashStart)}" data-clip-segment-id="${segment.id}" data-clip-solid-window="true" fill="none" opacity="${roundCoordinate(clipNoiseOpacity(segment.id, settings, timelinePhase))}" stroke="url(#clip-gradient-${copy.segment.id})" stroke-width="${roundCoordinate(settings.width)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    });
  });
  const background = includeBackground ? `<rect width="100%" height="100%" fill="${escapeXml(settings.background)}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" data-clip-frame="current" data-clip-sandbox="" data-motion-phase="${roundCoordinate(motionPhase)}" data-noise-phase="${roundCoordinate(timelinePhase)}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><defs>${gradients.join("")}${bloomFilterMarkup(settings)}</defs>${background}${styledPathGroupsMarkup(paths, settings)}</svg>`;
}

type AnimatedSvgTiming = { begin: string; duration: string; keyTimes: string };

const animatedSvgSampleCount = 48;

function normalizedDashWindow(phase: number, copyIndex: number, overlap: number): { dashLength: number; dashStart: number } {
  const repeatDistance = 1 - overlap / 100;
  const windowStart = repeatDistance * (copyIndex - phase);
  const visibleStart = Math.max(0, windowStart);
  const visibleEnd = Math.min(1, windowStart + 1);
  return {
    dashLength: Math.max(0, visibleEnd - visibleStart),
    dashStart: Math.max(0, Math.min(1, visibleStart)),
  };
}

function animatedMotionCopyIndices(overlap: number): readonly number[] {
  const intersectionRadius = 1 / Math.max(0.000001, 1 - overlap / 100);
  const firstIndex = Math.floor(-intersectionRadius) + 1;
  const lastIndex = Math.ceil(1 + intersectionRadius) - 1;
  return Array.from({ length: Math.max(0, lastIndex - firstIndex + 1) }, (_, index) => firstIndex + index);
}

function motionCopyToken(copyIndex: number): string {
  return copyIndex < 0 ? `n${Math.abs(copyIndex)}` : `p${copyIndex}`;
}

function animatedDashKeyframes(settings: ClipSettings, copyIndex: number): string {
  return Array.from({ length: animatedSvgSampleCount + 1 }, (_, index) => {
    const time = index / animatedSvgSampleCount;
    const phase = applyMotionEasing(time, settings.motionEasing);
    const window = normalizedDashWindow(phase, copyIndex, settings.motionOverlap);
    return `${roundCoordinate(time * 100)}%{stroke-dasharray:${roundCoordinate(window.dashLength)} 2;stroke-dashoffset:${roundCoordinate(-window.dashStart)}}`;
  }).join("");
}

function animatedAttributeMarkup(attributeName: string, values: readonly string[], timing: AnimatedSvgTiming): string {
  return `<animate attributeName="${attributeName}" begin="${timing.begin}" calcMode="linear" dur="${timing.duration}" keyTimes="${timing.keyTimes}" repeatCount="indefinite" values="${values.join(";")}"/>`;
}

function gradientStopsMarkup(settings: ClipSettings): string {
  return settings.gradient.stops.map((stop) => `<stop offset="${roundCoordinate(stop.position * 100)}%" stop-color="${escapeXml(stop.color)}" stop-opacity="${roundCoordinate(stop.opacity / 100)}"/>`).join("");
}

function animatedGradientMarkup(
  samples: readonly ClipMotionCopy[],
  settings: ClipSettings,
  gradientId: string,
  timing: AnimatedSvgTiming,
): string {
  const stops = gradientStopsMarkup(settings);
  if (settings.gradient.gradientType === "radial") {
    const centersX = samples.map((copy) => roundCoordinate(copy.segment.start.x));
    const centersY = samples.map((copy) => roundCoordinate(copy.segment.start.y));
    const radii = samples.map((copy) => roundCoordinate(Math.max(0.001, Math.hypot(
      copy.segment.end.x - copy.segment.start.x,
      copy.segment.end.y - copy.segment.start.y,
    ))));
    return `<radialGradient id="${gradientId}" gradientUnits="userSpaceOnUse" cx="${centersX[0]}" cy="${centersY[0]}" fx="${centersX[0]}" fy="${centersY[0]}" r="${radii[0]}">${stops}${animatedAttributeMarkup("cx", centersX, timing)}${animatedAttributeMarkup("cy", centersY, timing)}${animatedAttributeMarkup("fx", centersX, timing)}${animatedAttributeMarkup("fy", centersY, timing)}${animatedAttributeMarkup("r", radii, timing)}</radialGradient>`;
  }
  const axes = samples.map((copy) => gradientAxis(copy.segment, settings));
  const x1 = axes.map((axis) => roundCoordinate(axis.x1));
  const y1 = axes.map((axis) => roundCoordinate(axis.y1));
  const x2 = axes.map((axis) => roundCoordinate(axis.x2));
  const y2 = axes.map((axis) => roundCoordinate(axis.y2));
  return `<linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse" x1="${x1[0]}" y1="${y1[0]}" x2="${x2[0]}" y2="${y2[0]}">${stops}${animatedAttributeMarkup("x1", x1, timing)}${animatedAttributeMarkup("y1", y1, timing)}${animatedAttributeMarkup("x2", x2, timing)}${animatedAttributeMarkup("y2", y2, timing)}</linearGradient>`;
}

function serializeAnimatedClipLabSvg(
  width: number,
  height: number,
  settings: ClipSettings,
  segments: readonly ClipSegment[],
  includeBackground: boolean,
  durationSeconds: number,
): string {
  const gradients: string[] = [];
  const paths: string[] = [];
  const keyTimes = Array.from({ length: animatedSvgSampleCount + 1 }, (_, index) => roundCoordinate(index / animatedSvgSampleCount)).join(";");
  const cycleDurationSeconds = durationSeconds / settings.motionSpeed;
  const duration = `${roundCoordinate(cycleDurationSeconds)}s`;
  const motionModel = createClipMotionModel(segments, settings, width, height);
  const motionBySegmentId = new Map(motionModel.map((prepared) => [prepared.motion.segment.id, prepared]));
  const copyIndices = animatedMotionCopyIndices(settings.motionOverlap);
  const noiseMinimumOpacity = roundCoordinate(1 - settings.noiseAmount / 100 * 0.72);
  const noiseAnimationName = "clip-sandbox-noise";
  const noiseDuration = settings.noiseSpeed > 0 ? `${roundCoordinate(durationSeconds / settings.noiseSpeed)}s` : "";
  const noiseKeyframes = settings.noiseAmount > 0 && settings.noiseSpeed > 0
    ? `@keyframes ${noiseAnimationName}{0%,100%{opacity:1}33%{opacity:${noiseMinimumOpacity}}67%{opacity:${roundCoordinate(1 - settings.noiseAmount / 100 * 0.28)}}}`
    : "";
  const dashAnimationStyles = `<style>${copyIndices.map((copyIndex) => `@keyframes clip-lab-copy-${motionCopyToken(copyIndex)}{${animatedDashKeyframes(settings, copyIndex)}}`).join("")}${noiseKeyframes}</style>`;
  const noiseStyleFor = (segmentId: string) => {
    const opacity = roundCoordinate(clipNoiseOpacity(segmentId, settings, 0));
    if (!noiseDuration) return `opacity:${opacity}`;
    const band = clipNoiseBand(segmentId, settings.noiseScale);
    const delay = -hashUnit(`sandbox-noise:${settings.motionSeed}:${band}`) * durationSeconds / settings.noiseSpeed;
    return `animation-name:${noiseAnimationName};animation-duration:${noiseDuration};animation-delay:${roundCoordinate(delay)}s;animation-timing-function:linear;animation-iteration-count:infinite;opacity:${opacity}`;
  };

  segments.forEach((segment) => {
    const prepared = motionBySegmentId.get(segment.id);
    if (!prepared) {
      gradients.push(gradientMarkup(segment, settings));
      paths.push(`<path d="${segment.pathData}" fill="none" stroke="url(#clip-gradient-${segment.id})" stroke-width="${roundCoordinate(settings.width)}" stroke-linecap="round" stroke-linejoin="round" style="${noiseStyleFor(segment.id)}"/>`);
      return;
    }

    const { motion, stagger } = prepared;
    const timing: AnimatedSvgTiming = {
      begin: `${roundCoordinate(-stagger * cycleDurationSeconds)}s`,
      duration,
      keyTimes,
    };
    for (const copyIndex of copyIndices) {
      const samples = Array.from({ length: animatedSvgSampleCount + 1 }, (_, index) => createMotionCopyForPhase(
        motion,
        applyMotionEasing(index / animatedSvgSampleCount, settings.motionEasing),
        copyIndex,
      ));
      const copyToken = motionCopyToken(copyIndex);
      const gradientId = `clip-animated-gradient-${segment.id}-${copyToken}`;
      const initialCopy = samples[0];
      const animationName = `clip-lab-copy-${copyToken}`;
      const noiseStyle = noiseStyleFor(segment.id);
      const animationStyle = noiseDuration
        ? `animation-name:${animationName},${noiseAnimationName};animation-duration:${duration},${noiseDuration};animation-delay:${roundCoordinate(-stagger * cycleDurationSeconds)}s,${roundCoordinate(-hashUnit(`sandbox-noise:${settings.motionSeed}:${clipNoiseBand(segment.id, settings.noiseScale)}`) * durationSeconds / settings.noiseSpeed)}s;animation-timing-function:linear,linear;animation-iteration-count:infinite,infinite;opacity:${roundCoordinate(clipNoiseOpacity(segment.id, settings, 0))}`
        : `animation-name:${animationName};animation-duration:${duration};animation-delay:${roundCoordinate(-stagger * cycleDurationSeconds)}s;animation-timing-function:linear;animation-iteration-count:infinite;${noiseStyle}`;
      gradients.push(animatedGradientMarkup(samples, settings, gradientId, timing));
      paths.push(`<path d="${segment.pathData}" data-clip-motion-copy="${copyIndex}" data-clip-segment-id="${segment.id}" fill="none" pathLength="1" stroke="url(#${gradientId})" stroke-dasharray="${roundCoordinate(initialCopy.dashLength)} 2" stroke-dashoffset="${roundCoordinate(-initialCopy.dashStart)}" stroke-width="${roundCoordinate(settings.width)}" stroke-linecap="round" stroke-linejoin="round" style="${animationStyle}"/>`);
    }
  });

  const background = includeBackground ? `<rect width="100%" height="100%" fill="${escapeXml(settings.background)}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" data-clip-animation="stable-dash-window" data-clip-sandbox="" data-duration-seconds="${roundCoordinate(durationSeconds)}" data-cycle-duration-seconds="${roundCoordinate(cycleDurationSeconds)}" data-motion-easing="${motionEasingSignature(settings.motionEasing)}" data-motion-overlap="${settings.motionOverlap}" data-motion-speed="${settings.motionSpeed}" data-noise-speed="${settings.noiseSpeed}" data-vector-animation="true" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><metadata>Speed Rays Sandbox native animated SVG with immutable cubic paths, bloom, and seamless deterministic shimmer.</metadata><defs>${dashAnimationStyles}${gradients.join("")}${bloomFilterMarkup(settings)}</defs>${background}${styledPathGroupsMarkup(paths, settings)}</svg>`;
}

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Unable to rasterize the Clip Lab SVG.")); };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Clip Lab image encoding failed.")), mimeType, 0.95));
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function gradientColor(color: string, opacity: number): string {
  const normalized = color.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(normalized)?.[1];
  const long = /^#([0-9a-f]{6})$/i.exec(normalized)?.[1];
  const hex = long ?? (short ? short.split("").map((digit) => `${digit}${digit}`).join("") : null);
  if (!hex) return opacity >= 0.999 ? normalized : `color-mix(in srgb, ${normalized} ${Math.round(opacity * 100)}%, transparent)`;
  return `rgba(${Number.parseInt(hex.slice(0, 2), 16)}, ${Number.parseInt(hex.slice(2, 4), 16)}, ${Number.parseInt(hex.slice(4, 6), 16)}, ${opacity})`;
}

function canvasGradient(context: CanvasRenderingContext2D, segment: ClipSegment, settings: ClipSettings): CanvasGradient {
  const gradient = settings.gradient.gradientType === "radial"
    ? context.createRadialGradient(
      segment.start.x,
      segment.start.y,
      0,
      segment.start.x,
      segment.start.y,
      Math.max(0.001, Math.hypot(segment.end.x - segment.start.x, segment.end.y - segment.start.y)),
    )
    : (() => {
      const axis = gradientAxis(segment, settings);
      return context.createLinearGradient(axis.x1, axis.y1, axis.x2, axis.y2);
    })();
  settings.gradient.stops.forEach((stop) => gradient.addColorStop(stop.position, gradientColor(stop.color, stop.opacity / 100)));
  return gradient;
}

function renderClipLabFrame(
  canvas: HTMLCanvasElement,
  settings: ClipSettings,
  segments: readonly ClipSegment[],
  motionFrames: readonly ClipMotionFrame[],
  baseWidth: number,
  baseHeight: number,
  includeBackground: boolean,
  timelinePhase: number,
  pathCache?: Map<string, Path2D>,
): void {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is required for Clip Lab export.");
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (includeBackground) {
    context.fillStyle = settings.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.save();
  context.scale(canvas.width / Math.max(1, baseWidth), canvas.height / Math.max(1, baseHeight));
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = settings.width;
  const motionById = new Map(motionFrames.map((frame) => [frame.segmentId, frame]));
  const pathFor = (pathData: string) => {
    const cached = pathCache?.get(pathData);
    if (cached) return cached;
    const path = new Path2D(pathData);
    pathCache?.set(pathData, path);
    return path;
  };
  const drawSegment = (segment: ClipSegment, sourceSegmentId: string, opacityMultiplier: number, motionCopy?: ClipMotionCopy) => {
    if (motionCopy) {
      const pathLength = Math.max(0.001, segment.geometricLength);
      context.setLineDash([motionCopy.dashLength * pathLength, pathLength * 2]);
      context.lineDashOffset = -motionCopy.dashStart * pathLength;
    } else {
      context.setLineDash([]);
      context.lineDashOffset = 0;
    }
    context.globalAlpha = clipNoiseOpacity(sourceSegmentId, settings, timelinePhase) * opacityMultiplier;
    context.strokeStyle = canvasGradient(context, segment, settings);
    context.stroke(pathFor(segment.pathData));
  };
  const drawAllSegments = (opacityMultiplier: number) => segments.forEach((segment) => {
    const frame = motionById.get(segment.id);
    if (frame) frame.copies.forEach((copy) => drawSegment(copy.segment, segment.id, opacityMultiplier, copy));
    else drawSegment(segment, segment.id, opacityMultiplier);
  });
  if (settings.bloomStrength > 0 && settings.bloomRadius > 0) {
    context.filter = `blur(${settings.bloomRadius * canvas.width / Math.max(1, baseWidth)}px)`;
    drawAllSegments(settings.bloomStrength / 100);
    context.filter = "none";
  }
  drawAllSegments(1);
  context.setLineDash([]);
  context.lineDashOffset = 0;
  context.filter = "none";
  context.globalAlpha = 1;
  context.restore();
}

async function writeClipboardFormats(formats: Record<string, Blob>, textFallback?: string): Promise<void> {
  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    await navigator.clipboard.write([new ClipboardItem(formats)]);
    return;
  }
  if (textFallback != null && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(textFallback);
    return;
  }
  throw new Error("Clipboard writing is not supported in this browser.");
}

async function createCurrentClipLabFrameSvg(state: ToolcraftState, includeBackground: boolean): Promise<string> {
  const settings = getClipSettings(state);
  const source = getClipSource(state);
  const { width, height } = state.canvas.size;
  const mask = source ? await createThresholdMask(source, settings.threshold, width, height) : null;
  const segments = mask ? createClipSegments(mask, settings, width, height) : [];
  const timelinePhase = getToolcraftTimelineLoopProgress(state.timeline);
  const motionEnabled = state.timeline.isPlaying || state.timeline.currentTimeSeconds > 0;
  if (!motionEnabled) return serializeClipLabSvg(width, height, settings, segments, includeBackground, timelinePhase);
  const motionPhase = positiveModulo(timelinePhase * settings.motionSpeed, 1);
  const motionModel = createClipMotionModel(segments, settings, width, height);
  const motionFrames = createClipMotionFrames(motionModel, motionPhase, settings.motionEasing);
  return serializeClipLabFrameSvg(width, height, settings, segments, motionFrames, includeBackground, motionPhase, timelinePhase);
}

async function createAnimatedClipLabSvg(state: ToolcraftState, includeBackground: boolean): Promise<string> {
  const settings = getClipSettings(state);
  const source = getClipSource(state);
  const { width, height } = state.canvas.size;
  const mask = source ? await createThresholdMask(source, settings.threshold, width, height) : null;
  const segments = mask ? createClipSegments(mask, settings, width, height) : [];
  return serializeAnimatedClipLabSvg(
    width,
    height,
    settings,
    segments,
    includeBackground,
    Math.max(1, state.timeline.durationSeconds),
  );
}

async function createClipLabOutputCanvas(state: ToolcraftState): Promise<HTMLCanvasElement> {
  const settings = getClipSettings(state);
  const image = await loadSvgImage(await createCurrentClipLabFrameSvg(state, false));
  return createToolcraftPngExportCanvas({
    background: settings.background,
    includeBackground: Boolean(state.values["export.includeBackground"]),
    resolution: String(state.values["export.image.resolution"] ?? "4k"),
    state,
    render: ({ context, cssHeight, cssWidth }) => context.drawImage(image, 0, 0, cssWidth, cssHeight),
  });
}

export async function copyClipLabPng(state: ToolcraftState): Promise<Blob> {
  const canvas = await createClipLabOutputCanvas(state);
  const blob = await canvasToBlob(canvas, "image/png");
  await writeClipboardFormats({ "image/png": blob });
  return blob;
}

export async function exportClipLabPng(state: ToolcraftState): Promise<Blob> {
  const canvas = await createClipLabOutputCanvas(state);
  const format = stringValue(state.values["export.image.format"], "png");
  const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
  const blob = await canvasToBlob(canvas, mimeType);
  const resolution = stringValue(state.values["export.image.resolution"], "4k");
  downloadBlob(blob, `speed-rays-sandbox-${resolution}.${format === "jpg" ? "jpg" : "png"}`);
  return blob;
}

export async function copyClipLabSvg(state: ToolcraftState): Promise<Blob> {
  const svg = await createCurrentClipLabFrameSvg(state, Boolean(state.values["export.includeBackground"]));
  const svgBlob = new Blob([svg], { type: "image/svg+xml" });
  const formats: Record<string, Blob> = {
    "text/html": new Blob([svg], { type: "text/html" }),
    "text/plain": new Blob([svg], { type: "text/plain" }),
  };
  const clipboardConstructor = typeof ClipboardItem === "undefined"
    ? null
    : ClipboardItem as typeof ClipboardItem & { supports?: (type: string) => boolean };
  if (clipboardConstructor?.supports?.("image/svg+xml")) formats["image/svg+xml"] = svgBlob;
  await writeClipboardFormats(formats, svg);
  return svgBlob;
}

export async function exportAnimatedClipLabSvg(state: ToolcraftState): Promise<Blob> {
  const svg = await createAnimatedClipLabSvg(state, Boolean(state.values["export.includeBackground"]));
  const blob = new Blob([svg], { type: "image/svg+xml" });
  downloadBlob(blob, "speed-rays-sandbox-animated.svg");
  return blob;
}

function getClipLabVideoExportSize(state: ToolcraftState, resolution: string): { height: number; width: number } {
  const standardSize = getToolcraftVideoExportSize({
    resolution: resolution === "4k" ? "4k" : "current",
    state,
  });
  if (resolution !== "2x") return standardSize;
  const roundEven = (value: number) => Math.max(2, Math.round(value / 2) * 2);
  return { height: roundEven(standardSize.height * 2), width: roundEven(standardSize.width * 2) };
}

function getClipLabVideoBitrate(width: number, height: number, fps: number, codec: VideoCodec): number {
  const bitsPerPixelFrame = codec === "vp9" || codec === "av1" ? 0.3 : 0.36;
  return Math.round(Math.max(24_000_000, Math.min(120_000_000, width * height * fps * bitsPerPixelFrame)));
}

async function getClipLabVideoEncoder(
  videoTools: typeof import("mediabunny"),
  requestedFormat: string,
  width: number,
  height: number,
  fps: number,
): Promise<{
  bitrate: number;
  codec: VideoCodec;
  format: Mp4OutputFormat | WebMOutputFormat;
}> {
  const formatOrder = requestedFormat === "mp4" ? ["mp4", "webm"] as const : ["webm", "mp4"] as const;
  for (const formatName of formatOrder) {
    const format = formatName === "mp4" ? new videoTools.Mp4OutputFormat() : new videoTools.WebMOutputFormat();
    const preferredCodecs: VideoCodec[] = formatName === "mp4"
      ? ["avc", "hevc", "vp9", "av1"]
      : ["vp9", "av1", "vp8"];
    const supportedCodecs = preferredCodecs.filter((codec) => format.getSupportedVideoCodecs().includes(codec));
    for (const codec of supportedCodecs) {
      const bitrate = getClipLabVideoBitrate(width, height, fps, codec);
      const encodable = await videoTools.getFirstEncodableVideoCodec([codec], { bitrate, height, width });
      if (encodable) return { bitrate, codec: encodable, format };
    }
  }
  throw new Error("This browser cannot encode MP4 or WebM video at the selected Clip Lab size.");
}

export async function exportClipLabVideo(
  state: ToolcraftState,
  reportProgress: (progress: number) => void,
): Promise<Blob> {
  if (typeof VideoEncoder === "undefined") throw new Error("Timestamped video export is not supported in this browser.");
  const settings = getClipSettings(state);
  const source = getClipSource(state);
  const baseWidth = state.canvas.size.width;
  const baseHeight = state.canvas.size.height;
  const mask = source ? await createThresholdMask(source, settings.threshold, baseWidth, baseHeight) : null;
  const segments = mask ? createClipSegments(mask, settings, baseWidth, baseHeight) : [];
  const resolution = stringValue(state.values["export.video.resolution"], "current");
  const size = getClipLabVideoExportSize(state, resolution);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const includeBackground = shouldIncludeToolcraftExportBackground({ format: "video", schema: state.schema });
  const fps = 30;
  const durationSeconds = Math.max(1, state.timeline.durationSeconds);
  const frameCount = Math.max(1, Math.round(durationSeconds * fps));
  const motionModel = createClipMotionModel(segments, settings, baseWidth, baseHeight);
  const pathCache = new Map<string, Path2D>();
  const requestedFormat = stringValue(state.values["export.video.format"], "mp4");
  const videoTools = await import("mediabunny");
  const encoder = await getClipLabVideoEncoder(videoTools, requestedFormat, size.width, size.height, fps);
  const target = new videoTools.BufferTarget();
  const output = new videoTools.Output({ format: encoder.format, target });
  const videoSource = new videoTools.CanvasSource(canvas, {
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
      renderClipLabFrame(
        canvas,
        settings,
        segments,
        createClipMotionFrames(motionModel, phase, settings.motionEasing),
        baseWidth,
        baseHeight,
        includeBackground,
        frameIndex / frameCount,
        pathCache,
      );
      await videoSource.add(frameIndex / fps, 1 / fps, { keyFrame: frameIndex % (fps * 2) === 0 });
      reportProgress((frameIndex + 1) / frameCount);
    }
    videoSource.close();
    const mimeType = await output.getMimeType();
    await output.finalize();
    if (!target.buffer || target.buffer.byteLength === 0) throw new Error("Clip Lab video export produced no bytes.");
    const blob = new Blob([target.buffer], { type: mimeType });
    downloadBlob(blob, `speed-rays-sandbox-${resolution}${encoder.format.fileExtension}`);
    reportProgress(1);
    return blob;
  } catch (error) {
    if (output.state !== "canceled" && output.state !== "finalized") await output.cancel();
    throw error instanceof Error ? error : new Error("Clip Lab video encoder failed.");
  }
}

export function ClipLabRenderer(): React.JSX.Element {
  const { dispatch, state } = useToolcraft();
  useClipboardImageImport("clip.source");
  const [mask, setMask] = React.useState<ThresholdMask | null>(null);
  const didInitializePlayback = React.useRef(false);
  const settings = React.useMemo(() => getClipSettings(state), [state.values]);
  const source = getClipSource(state);
  const includeBackground = shouldIncludeToolcraftPreviewBackground({ state });
  const { width, height } = state.canvas.size;

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
  const motionFrameBySegmentId = React.useMemo(
    () => new Map(motionFrames.map((motionFrame) => [motionFrame.segmentId, motionFrame])),
    [motionFrames],
  );
  const animatedSegmentCount = motionFrames.length;

  const pathElement = (segment: ClipSegment, key: string, motionCopy?: ClipMotionCopy, gradientId = segment.id, sourceSegmentId = segment.id) => <path
    data-clip-motion-copy={motionCopy?.copyIndex}
    data-clip-motion-window-length={motionCopy ? Number(motionCopy.dashLength.toFixed(6)) : undefined}
    data-clip-motion-window-origin={motionCopy ? Number(motionCopy.windowStart.toFixed(6)) : undefined}
    data-clip-motion-window-start={motionCopy ? Number(motionCopy.dashStart.toFixed(6)) : undefined}
    data-clip-segment=""
    data-clip-segment-id={sourceSegmentId}
    d={segment.pathData}
    fill="none"
    key={key}
    pathLength={motionCopy ? 1 : undefined}
    opacity={clipNoiseOpacity(sourceSegmentId, settings, timelinePhase)}
    stroke={`url(#clip-gradient-${gradientId})`}
    strokeDasharray={motionCopy ? `${Number(motionCopy.dashLength.toFixed(6))} 2` : undefined}
    strokeDashoffset={motionCopy ? -Number(motionCopy.dashStart.toFixed(6)) : undefined}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={settings.width}
  />;
  const renderPaths = (keyPrefix: string) => segments.map((segment) => {
    const motionFrame = motionFrameBySegmentId.get(segment.id);
    if (!motionFrame) return pathElement(segment, `${keyPrefix}-${segment.id}`);
    return <React.Fragment key={`${keyPrefix}-${segment.id}`}>
      {motionFrame.copies.map((copy) => pathElement(
        copy.segment,
        `${keyPrefix}-${segment.id}-${copy.copyIndex}`,
        copy,
        copy.segment.id,
        segment.id,
      ))}
    </React.Fragment>;
  });

  return <svg
    aria-label="Speed Rays Sandbox output"
    className="absolute inset-0 block size-full"
    data-mask-ready={mask ? "true" : "false"}
    data-edge-noise={settings.edgeNoise}
    data-field-curl={settings.curl}
    data-field-shape={settings.fieldShape}
    data-motion-active={settings.motionActive}
    data-motion-animated-count={animatedSegmentCount}
    data-motion-easing={motionEasingSignature(settings.motionEasing)}
    data-motion-path-mode="stable-dash-window"
    data-motion-phase={roundCoordinate(motionPhase)}
    data-motion-playing={state.timeline.isPlaying ? "true" : "false"}
    data-motion-seed={settings.motionSeed}
    data-motion-speed={settings.motionSpeed}
    data-motion-overlap={settings.motionOverlap}
    data-motion-stagger={settings.motionStagger}
    data-bloom-radius={settings.bloomRadius}
    data-bloom-strength={settings.bloomStrength}
    data-noise-amount={settings.noiseAmount}
    data-noise-phase={roundCoordinate(timelinePhase)}
    data-noise-scale={settings.noiseScale}
    data-noise-speed={settings.noiseSpeed}
    data-min-length={settings.minLength}
    data-ray-count={settings.count}
    data-ray-width={settings.width}
    data-segment-count={segments.length}
    data-toolcraft-product-output=""
    preserveAspectRatio="none"
    role="img"
    style={{ height, width }}
    viewBox={`0 0 ${width} ${height}`}
  >
    {includeBackground ? <rect data-clip-background="" fill={settings.background} height={height} width={width} /> : null}
    <defs>
      {settings.bloomStrength > 0 && settings.bloomRadius > 0 ? <filter id="clip-sandbox-bloom" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation={settings.bloomRadius} />
      </filter> : null}
      {segments.flatMap((segment) => {
        const motionFrame = motionFrameBySegmentId.get(segment.id);
        if (!motionFrame) return [gradientElement(segment, settings)];
        return motionFrame.copies.map((copy) => gradientElement(copy.segment, settings, copy.segment.id));
      })}
    </defs>
    {settings.bloomStrength > 0 && settings.bloomRadius > 0
      ? <g data-clip-sandbox-bloom="" filter="url(#clip-sandbox-bloom)" opacity={settings.bloomStrength / 100}>{renderPaths("bloom")}</g>
      : null}
    <g data-clip-sandbox-core="">{renderPaths("core")}</g>
  </svg>;
}
