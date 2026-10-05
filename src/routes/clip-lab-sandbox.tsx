import { ToolcraftApp } from "@/toolcraft/runtime/react";
import type { ToolcraftPanelActionContext } from "@/toolcraft/runtime/react";

import {
  ClipLabRenderer as ClipLabSandboxRenderer,
  copyClipLabPng as copyClipLabSandboxPng,
  copyClipLabSvg as copyClipLabSandboxSvg,
  exportAnimatedClipLabSvg as exportAnimatedClipLabSandboxSvg,
  exportClipLabPng as exportClipLabSandboxPng,
  exportClipLabVideo as exportClipLabSandboxVideo,
} from "../app/clip-lab-sandbox-renderer";
import {
  clipLabSandboxSchema,
  clipSandboxMotionEasingPresets,
} from "../app/clip-lab-sandbox-schema";

function getClipSandboxEasingPreset(actionValue: string) {
  if (actionValue === "easing-preset-linear") return clipSandboxMotionEasingPresets.linear;
  if (actionValue === "easing-preset-in") return clipSandboxMotionEasingPresets.easeIn;
  if (actionValue === "easing-preset-out") return clipSandboxMotionEasingPresets.easeOut;
  if (actionValue === "easing-preset-in-out") return clipSandboxMotionEasingPresets.easeInOut;
  return null;
}

async function onClipLabSandboxAction({
  action,
  dispatch,
  reportProgress,
  state,
}: ToolcraftPanelActionContext): Promise<void> {
  const easingPreset = getClipSandboxEasingPreset(action.value);
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
  if (action.value === "export-sandbox-video") await exportClipLabSandboxVideo(state, reportProgress);
  else if (action.value === "export-sandbox-animated-svg") await exportAnimatedClipLabSandboxSvg(state);
  else if (action.value === "export-sandbox-png") await exportClipLabSandboxPng(state);
  else if (action.value === "copy-sandbox-png") await copyClipLabSandboxPng(state);
  else if (action.value === "copy-sandbox-svg") await copyClipLabSandboxSvg(state);
  else return;
  reportProgress(1);
}

export function ClipLabSandboxHome(): React.JSX.Element {
  return <ToolcraftApp
    schema={clipLabSandboxSchema}
    canvasContent={<ClipLabSandboxRenderer />}
    renderDefaultCanvasMedia={false}
    onPanelAction={onClipLabSandboxAction}
    className="h-dvh min-h-dvh"
  />;
}
