# Click Mode Launcher

## Product behavior

- `/` is a minimal branded launcher, not an editor canvas.
- A compact supplied white Click mark sits above three dark buttons on a pure black screen.
- Speed Rays routes to Clip Lab at `/clip-lab`; Speed Blur routes to Path Blur at `/warp`; Mix routes to the combined ray-and-blur tool at `/mix`.
- There are no previews, headings, descriptions, cards, decorative backgrounds, or secondary content.
- The launcher is keyboard accessible, responsive, and preserves the existing tool URLs.

## Design decisions

- Canvas sizing: full viewport launcher with document scrolling on compact screens.
- Panels and media: none; the dashboard does not own product state.
- Renderer: regular React/SVG/CSS with only the supplied logo and route links.
- Timeline and layers: none.
- Persistence: none.
- Export: delegated to the selected Toolcraft product.

## Acceptance

- The logo and all three mode buttons are centered at `/`.
- Speed Rays opens `/clip-lab` and its Toolcraft app.
- Speed Blur opens `/warp` and its Toolcraft app.
- Mix opens `/mix` and its Toolcraft app.
- Every button remains usable on narrow screens and exposes visible keyboard focus.
