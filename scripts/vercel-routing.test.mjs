import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

test("Vercel serves the SPA shell for direct client routes", async () => {
  const config = JSON.parse(await fs.readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  const routeSource = await fs.readFile(new URL("../src/routes/root.tsx", import.meta.url), "utf8");

  assert.deepEqual(config.rewrites, [
    {
      destination: "/index.html",
      source: "/(.*)",
    },
  ]);
  assert.match(routeSource, /path:\s*"\/clip-lab\/sandbox"/);
});
