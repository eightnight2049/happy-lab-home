# News specification

## Overview

- Target: `src/components/site/news-list.tsx`
- Interaction: static list + click-driven progressive disclosure.

## Exact reference values

- Reading width: `760px`; homepage news in the reference expands to approximately `900px`.
- Row: CSS grid with `96px 1fr`, `18px` gap, `18px 0` padding.
- Separator: `1px dashed #E5E5E5`.
- Date: `0.9rem`, weight `600`, accent deep red.
- Body: `1rem`, line-height `1.55`, ink soft.

## Product behavior

The first four items render by default; a button reveals the rest. Content is received from the public API, so editors can update the list through the CMS.
