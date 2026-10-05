import { ToolcraftApp } from "@/toolcraft/runtime/react";
import type { ToolcraftPanelActionContext } from "@/toolcraft/runtime/react";

import { exportWarpImage, WarpRenderer } from "../app/warp-renderer";
import { warpSchema } from "../app/warp-schema";

async function onWarpAction({ action, reportProgress, state }: ToolcraftPanelActionContext): Promise<void> {
  if (action.value !== "export-warp-image") return;
  reportProgress(0.08);
  await exportWarpImage(state);
  reportProgress(1);
}

export function WarpHome(): React.JSX.Element {
  return <ToolcraftApp
    schema={warpSchema}
    canvasContent={<WarpRenderer />}
    renderDefaultCanvasMedia={false}
    onPanelAction={onWarpAction}
    className="h-dvh min-h-dvh"
  />;
}
