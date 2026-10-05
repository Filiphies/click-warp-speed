import type { ToolcraftComponentAcceptance, ToolcraftTransferMode } from "./app-acceptance";

const textureBrowserTest = "browser: paper texture batch applies one live recipe to ordered images";
const exportBrowserTest = "browser: paper texture exports one image and a complete batch zip";

function paperRow(
  id: string,
  componentType: string,
  options: Partial<ToolcraftComponentAcceptance> = {},
): ToolcraftComponentAcceptance {
  return {
    automated: true,
    automatedTestName: `${id} maps through runtime state to paper textured output`,
    browser: true,
    browserTestName: textureBrowserTest,
    componentType,
    evidence: "rendered-pixels",
    expectedObservable: `Changing ${id} changes the GPU paper texture result without moving the canvas viewport.`,
    fixture: "Three ordered asymmetric images including transparent pixels and a mismatched aspect ratio.",
    id,
    kind: "control",
    target: id,
    userAction: `Change ${id} through its visible Toolcraft control.`,
    ...options,
  };
}

export const paperTextureTransferMode: ToolcraftTransferMode = {
  animationIntent: { mode: "none" },
  mode: "new-toolcraft-app",
};

export const paperTextureAcceptance: readonly ToolcraftComponentAcceptance[] = [
  paperRow("paper.sources", "fileDrop", {
    evidence: "media-lifecycle",
    expectedObservable: "Uploading multiple images creates an ordered runtime media set; thumbnail reorder changes the first preview and batch order; 90° rotate and horizontal/vertical flip metadata change preview/export; remove and Reset return to the empty canvas.",
    userAction: "Upload three images, reorder thumbnails, select and rotate/flip an image, remove one, and use Reset while comparing the first preview and batch output order.",
  }),
  paperRow("paper.style", "select", { optionCoverage: ["fine-dots", "newsprint", "fibers"] }),
  paperRow("paper.amount", "slider"),
  paperRow("paper.scale", "slider"),
  paperRow("paper.fade", "slider"),
  paperRow("export.includeBackground", "switch", {
    evidence: "exported-bytes",
    expectedObservable: "Disabling Include hides the live preview product background and makes PNG output transparent; enabling it composites the selected paper color, while video output would keep the product background under the shared export contract.",
  }),
  paperRow("paper.background", "color", { evidence: "exported-bytes" }),
  paperRow("export.image.format", "select", { browserTestName: exportBrowserTest, evidence: "exported-bytes", optionCoverage: ["png", "jpg"] }),
  paperRow("export.image.resolution", "select", { browserTestName: exportBrowserTest, evidence: "exported-bytes", optionCoverage: ["2k", "4k", "8k"] }),
  paperRow("paper.exportAction", "panelActions", {
    actionCoverage: ["export-paper-image", "export-paper-batch"],
    browserTestName: exportBrowserTest,
    evidence: "exported-bytes",
    expectedObservable: "Export PNG downloads the first ordered processed image; Export Batch reports progress and downloads one ZIP containing every ordered image with the same texture recipe.",
    userAction: "Use both sticky actions and inspect the decoded image payload and all ZIP entries.",
  }),
  {
    automated: true,
    automatedTestName: "Paper Texture GPU renderer consumes the ordered source set",
    browser: true,
    browserTestName: textureBrowserTest,
    componentType: "webgl-renderer",
    evidence: "rendered-pixels",
    expectedObservable: "The first ordered source is cover/cropped into the editable canvas and receives the selected dot, newsprint, or fiber treatment at the selected render scale.",
    fixture: "Three ordered asymmetric images with 16:9 and portrait sources.",
    id: "renderer.paperTexture",
    kind: "runtime",
    userAction: "Upload and reorder sources, then compare rendered pixels for every texture style.",
  },
];
