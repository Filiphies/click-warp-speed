import { describe, expect, it } from "vitest";

import { createStoredZip, PAPER_BATCH_LIMIT } from "./paper-texture-renderer";

describe("Paper Texture batch archive", () => {
  it("writes a stored ZIP with local files, central directory, and end record", async () => {
    const zip = createStoredZip([
      { name: "first-paper.png", bytes: new Uint8Array([1, 2, 3]) },
      { name: "second-paper.jpg", bytes: new Uint8Array([4, 5]) },
    ]);
    const bytes = new Uint8Array(await zip.arrayBuffer());
    const text = new TextDecoder().decode(bytes);
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(text).toContain("first-paper.png");
    expect(text).toContain("second-paper.jpg");
    expect(Array.from(bytes.slice(-22, -18))).toEqual([0x50, 0x4b, 0x05, 0x06]);
    expect(zip.type).toBe("application/zip");
  });

  it("declares the requested forty-image batch boundary", () => {
    expect(PAPER_BATCH_LIMIT).toBe(40);
  });
});
