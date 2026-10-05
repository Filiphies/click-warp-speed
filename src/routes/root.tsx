import { Outlet, createRootRoute, createRoute } from "@tanstack/react-router";

import { AppHome } from "./index";
import { ClipLabHome } from "./clip-lab";
import { ClipLabSandboxHome } from "./clip-lab-sandbox";
import { HeatVisionHome } from "./heat";
import { MixHome } from "./mix";
import { WarpHome } from "./warp";

function RootLayout(): React.JSX.Element {
  return <Outlet />;
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  component: AppHome,
  getParentRoute: () => rootRoute,
  path: "/",
});

const clipLabRoute = createRoute({
  component: ClipLabHome,
  getParentRoute: () => rootRoute,
  path: "/clip-lab",
});

const clipLabSandboxRoute = createRoute({
  component: ClipLabSandboxHome,
  getParentRoute: () => rootRoute,
  path: "/clip-lab/sandbox",
});

const heatRoute = createRoute({
  component: HeatVisionHome,
  getParentRoute: () => rootRoute,
  path: "/heat",
});

const mixRoute = createRoute({
  component: MixHome,
  getParentRoute: () => rootRoute,
  path: "/mix",
});

const warpRoute = createRoute({
  component: WarpHome,
  getParentRoute: () => rootRoute,
  path: "/warp",
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  clipLabRoute,
  clipLabSandboxRoute,
  heatRoute,
  mixRoute,
  warpRoute,
]);
