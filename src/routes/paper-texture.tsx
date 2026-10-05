import { ToolcraftApp } from "@/toolcraft/runtime/react";
import type { ToolcraftPanelActionContext } from "@/toolcraft/runtime/react";

import { exportPaperBatch, exportPaperImage, PaperTextureRenderer } from "../app/paper-texture-renderer";
import { paperTextureSchema } from "../app/paper-texture-schema";

async function onPaperTextureAction({ action, reportProgress, state }: ToolcraftPanelActionContext): Promise<void> {
  reportProgress(0.04);
  if (action.value === "export-paper-image") await exportPaperImage(state);
  else if (action.value === "export-paper-batch") await exportPaperBatch(state, reportProgress);
  else return;
  reportProgress(1);
}

export function PaperTextureHome(): React.JSX.Element {
  return <ToolcraftApp
    schema={paperTextureSchema}
    canvasContent={<PaperTextureRenderer />}
    className="h-dvh min-h-dvh"
    onPanelAction={onPaperTextureAction}
    renderDefaultCanvasMedia={false}
  />;
}
