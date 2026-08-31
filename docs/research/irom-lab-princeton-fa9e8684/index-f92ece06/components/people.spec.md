# People specification

## Overview

- Target: `src/components/site/people-grid.tsx`
- Interaction: static cards with link hover states.

## Exact reference values

- Grid: `repeat(auto-fill, minmax(170px, 1fr))`, `28px 24px` gap.
- Photo: 1:1 aspect ratio, `12px` radius, 1px soft border.
- Name: approximately `1.02rem`, weight `600`.
- Role: `.85rem`, slate.

## Product behavior

If no portrait URL is stored, the component shows accessible initials. The lead faculty profile uses a two-column card and the remaining people use the reference grid.
