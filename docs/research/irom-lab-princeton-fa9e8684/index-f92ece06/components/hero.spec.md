# Hero specification

## Overview

- Target: `src/components/site/hero-carousel.tsx`
- Interaction: time-driven slideshow + click controls.
- Reference screenshot: `docs/design-references/irom-lab-princeton-fa9e8684/index-f92ece06/reference-desktop.png`

## Exact reference values

- Margin: `20px clamp(32px, 6vw, 80px) 0`; captured desktop side margin `76.8px`.
- Height: captured `518.4px`, reference minimum `72vh`.
- Radius: `20px`; overflow hidden; base background `#111111`.
- Overlay: horizontal black gradient from `.65` opacity on the left to `.05` on the right, plus vertical black gradient.
- Content: relative z-index 2, vertical padding `80px`.
- Title: `70.4px / 73.92px`, weight `800`, letter spacing `-1.76px`, white.
- Tagline: `17.92px / 27.776px`, white at `.95` opacity, bottom margin `36px`.
- CTA: `12px 22px`, `6px` radius, `1.5px` border; primary `#B31B1B`.
- Pager: absolute bottom `28px`, centered, gap `14px`; circles `42px`.

## Product behavior

Five image layers rotate every `6.5s`; pause, previous, next, and the live counter mirror the reference control model. At <= 700px the hero uses 14px radius, 36px controls, 16px pager offset, and a wrapping tagline.
