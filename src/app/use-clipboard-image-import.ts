import * as React from "react";

import type { ToolcraftCanvasSize } from "@/toolcraft/runtime";
import { useToolcraft } from "@/toolcraft/runtime/react";

type ImportedClipboardImage = {
  dataUrl: string;
  size: ToolcraftCanvasSize;
};

function isEditablePasteTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("input, textarea, [contenteditable='true']"));
}

function readFileDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(typeof reader.result === "string" ? reader.result : null));
    reader.addEventListener("error", () => resolve(null));
    reader.readAsDataURL(file);
  });
}

function readImageSize(dataUrl: string, fallbackSize: ToolcraftCanvasSize): Promise<ToolcraftCanvasSize> {
  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const width = Math.round(image.naturalWidth || image.width);
      const height = Math.round(image.naturalHeight || image.height);
      resolve(width > 0 && height > 0 ? { width, height, unit: "px" } : fallbackSize);
    });
    image.addEventListener("error", () => resolve(fallbackSize));
    image.src = dataUrl;
  });
}

async function readClipboardImage(file: File, fallbackSize: ToolcraftCanvasSize): Promise<ImportedClipboardImage | null> {
  const dataUrl = await readFileDataUrl(file);
  if (!dataUrl) return null;
  return { dataUrl, size: await readImageSize(dataUrl, fallbackSize) };
}

function getPastedImageName(file: File): string {
  if (file.name) return file.name;
  const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
  return `pasted-image.${extension}`;
}

export function useClipboardImageImport(sourceTarget: string): void {
  const { dispatch, state } = useToolcraft();
  const fallbackHeight = state.canvas.size.height;
  const fallbackWidth = state.canvas.size.width;

  React.useEffect(() => {
    let active = true;
    const onPaste = (event: ClipboardEvent): void => {
      if (event.defaultPrevented || isEditablePasteTarget(event.target)) return;
      const imageFile = Array.from(event.clipboardData?.files ?? []).find((file) => file.type.startsWith("image/"));
      if (!imageFile) return;

      event.preventDefault();
      const fallbackSize: ToolcraftCanvasSize = { width: fallbackWidth, height: fallbackHeight, unit: "px" };
      void readClipboardImage(imageFile, fallbackSize).then((image) => {
        if (!active || !image) return;
        dispatch({
          asset: {
            assetKind: "image",
            dataUrl: image.dataUrl,
            fileName: getPastedImageName(imageFile),
            mimeType: imageFile.type || "image/png",
            position: { x: 0, y: 0 },
            size: image.size,
            sourceTarget,
          },
          replaceExisting: true,
          type: "media.import",
        });
      });
    };

    document.addEventListener("paste", onPaste);
    return () => {
      active = false;
      document.removeEventListener("paste", onPaste);
    };
  }, [dispatch, fallbackHeight, fallbackWidth, sourceTarget]);
}
