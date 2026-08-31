# Publication list specification

## Overview

- Target: `src/components/site/publication-list.tsx`
- Interaction: click-driven filters and client-side search.

## Exact reference values

- Year band: flex baseline, `56px 0 18px`, bottom border `1px solid #E5E5E5`.
- Publication row: single-column compact variant, `25px 0`, bottom border `1px solid #F0F0F0`.
- Title: approximately `1.15rem`, weight `700`, line-height `1.35`.
- Metadata: slate, approximately `.92rem` and italic for venue.
- Link chips: small buttons with `4px` radius and 1px line.

## Product behavior

The filters are All, Conference, Journal, and Preprint. Search matches title, authors, and venue. Optional files/links are rendered as Project, PDF, Code, and Video actions.
