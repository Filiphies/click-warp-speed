import { ToolcraftApp } from "@/toolcraft/runtime/react";
import type { ToolcraftPanelActionContext } from "@/toolcraft/runtime/react";

import { copyMixPng, exportMixPng, exportMixVideo, MixRenderer } from "../app/mix-renderer";
import { mixSchema } from "../app/mix-schema";
import { clipMotionEasingPresets } from "../app/clip-lab-schema";

function getMixEasingPreset(actionValue: string) {
  if (actionValue === "easing-preset-linear") return clipMotionEasingPresets.linear;
  if (actionValue === "easing-preset-in") return clipMotionEasingPresets.easeIn;
  if (actionValue === "easing-preset-out") return clipMotionEasingPresets.easeOut;
  if (actionValue === "easing-preset-in-out") return clipMotionEasingPresets.easeInOut;
  return null;
}

async function onMixAction({ action, dispatch, reportProgress, state }: ToolcraftPanelActionContext): Promise<void> {
  const easingPreset = getMixEasingPreset(action.value);
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
  if (action.value === "export-mix-video") await exportMixVideo(state, reportProgress);
  else if (action.value === "export-mix-png") await exportMixPng(state);
  else if (action.value === "copy-mix-png") await copyMixPng(state);
  else return;
  reportProgress(1);
}

export function MixHome(): React.JSX.Element {
  return <ToolcraftApp
    schema={mixSchema}
    canvasContent={<MixRenderer />}
    renderDefaultCanvasMedia={false}
    onPanelAction={onMixAction}
    className="h-dvh min-h-dvh"
  />;
}
