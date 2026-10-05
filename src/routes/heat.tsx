import { ToolcraftApp } from "@/toolcraft/runtime/react";
import type { ToolcraftPanelActionContext } from "@/toolcraft/runtime/react";

import { ThermalVisionRenderer, exportThermalPng, exportThermalVideo } from "../app/heat-renderer";
import { appSchema as heatSchema } from "../app/heat-schema";

async function onHeatAction({ action, reportProgress, state }: ToolcraftPanelActionContext): Promise<void> {
  if (action.value !== "export-png" && action.value !== "export-video") return;
  reportProgress(0.1);
  if (action.value === "export-video") await exportThermalVideo(state, reportProgress);
  else await exportThermalPng(state);
  reportProgress(1);
}

export function HeatVisionHome(): React.JSX.Element {
  return <ToolcraftApp
    schema={heatSchema}
    canvasContent={<ThermalVisionRenderer />}
    renderDefaultCanvasMedia={false}
    onPanelAction={onHeatAction}
    className="h-dvh min-h-dvh"
  />;
}
