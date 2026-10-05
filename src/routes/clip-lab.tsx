import { ToolcraftApp } from "@/toolcraft/runtime/react";
import type { ToolcraftPanelActionContext } from "@/toolcraft/runtime/react";

import {
  ClipLabRenderer,
  copyClipLabPng,
  copyClipLabSvg,
  exportAnimatedClipLabSvg,
  exportClipLabPng,
  exportClipLabVideo,
} from "../app/clip-lab-renderer";
import { clipLabSchema, clipMotionEasingPresets } from "../app/clip-lab-schema";

function getClipMotionEasingPreset(actionValue: string) {
  if (actionValue === "easing-preset-linear") return clipMotionEasingPresets.linear;
  if (actionValue === "easing-preset-in") return clipMotionEasingPresets.easeIn;
  if (actionValue === "easing-preset-out") return clipMotionEasingPresets.easeOut;
  if (actionValue === "easing-preset-in-out") return clipMotionEasingPresets.easeInOut;
  return null;
}

async function onClipLabAction({ action, dispatch, reportProgress, state }: ToolcraftPanelActionContext): Promise<void> {
  const easingPreset = getClipMotionEasingPreset(action.value);
  if (easingPreset) {
    dispatch({
      label: `Apply ${action.label} easing preset`,
      target: "clip.motionEasing",
      type: "controls.setValue",
      value: easingPreset,
    });
    return;
  }
  reportProgress(0.08);
  if (action.value === "export-clip-video") await exportClipLabVideo(state, reportProgress);
  else if (action.value === "export-clip-animated-svg") await exportAnimatedClipLabSvg(state);
  else if (action.value === "export-clip-png") await exportClipLabPng(state);
  else if (action.value === "copy-clip-png") await copyClipLabPng(state);
  else if (action.value === "copy-clip-svg") await copyClipLabSvg(state);
  else return;
  reportProgress(1);
}

export function ClipLabHome(): React.JSX.Element {
  return <ToolcraftApp
    schema={clipLabSchema}
    canvasContent={<ClipLabRenderer />}
    renderDefaultCanvasMedia={false}
    onPanelAction={onClipLabAction}
    className="h-dvh min-h-dvh"
  />;
}
