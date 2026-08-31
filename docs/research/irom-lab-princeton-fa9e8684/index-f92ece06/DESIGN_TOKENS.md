# Reference design tokens

Source: `https://irom-lab.princeton.edu/index.html`

The implementation keeps the reference's visual language while using lab-owned demo content. The original page's “Media” and “Software” navigation items are intentionally omitted.

## Palette

- Accent: `#B31B1B`
- Accent deep / hover: `#8E1414`
- Accent soft: `#FBEAEA`
- Ink: `#111111`
- Ink soft: `#2A2A2A`
- Slate: `#555555`
- Slate light: `#888888`
- Line: `#E5E5E5`
- Line soft: `#F0F0F0`
- Background: `#FFFFFF`
- Muted background: `#F6F6F6`

## Typography

- Body: `Open Sans`, system sans fallback; computed `16px / 26.4px`.
- Hero title: `Open Sans`, weight `800`, computed `70.4px / 73.92px` at the captured 1280px viewport, letter spacing `-1.76px`.
- Hero tagline: weight `400`, computed `17.92px / 27.776px`.
- CTA: weight `600`, computed `15.2px / 25.08px`.
- Utility labels: `JetBrains Mono`, uppercase or letter-spaced.

## Geometry

- Reference header: sticky, minimum height `111px`, translucent warm white with 14px backdrop blur.
- Hero: 20px top margin, 20px radius, `72vh` minimum height; captured at `518.4px`.
- Hero desktop side margin: `clamp(32px, 6vw, 80px)`; captured at `76.8px`.
- Reading column: `760px`; overall container: `1120px`.
- CTA: `12px 22px` padding, `6px` radius, `1.5px` border.
- Motion: `180ms cubic-bezier(.2,.7,.3,1)` for controls and links.
