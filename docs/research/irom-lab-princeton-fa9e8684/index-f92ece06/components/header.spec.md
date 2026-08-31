# Header specification

## Overview

- Target: `src/components/site/site-header.tsx`
- Interaction: sticky + click-driven mobile menu.
- Reference screenshot: `docs/design-references/irom-lab-princeton-fa9e8684/index-f92ece06/reference-desktop.png`

## Exact reference values

- Header: `position: sticky`, `z-index: 100`, computed height `111px`.
- Background: `rgba(251, 250, 247, 0.82)`.
- Border bottom: `1px solid #E5E5E5`.
- Inner padding: `14px 32px`; flex gap `24px`.
- Brand image height: `76px`.
- Nav link: `font-size: 1.02rem`, `font-weight: 500`, `padding: 6px 12px`, radius `6px`.
- Active nav: white text on `#B31B1B`.

## Product changes

The product uses a CSS-built MI Lab mark and text wordmark so the site is not branded as Princeton. Media and Software are intentionally absent. At <= 980px the nav becomes a menu button and an absolute dropdown.
