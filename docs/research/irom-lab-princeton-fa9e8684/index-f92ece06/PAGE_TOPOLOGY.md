# Page topology

## Source mapping

- Source: `https://irom-lab.princeton.edu/index.html`
- Product route: `/`
- Artifact key: `irom-lab-princeton-fa9e8684/index-f92ece06`

## Visual order

1. Sticky header with logo and page navigation.
2. Rounded cinematic hero with dark media layer, headline, tagline, four CTAs, and centered slideshow controls.
3. Reading-width News list with dated rows and an expand/collapse control when there are more than four items.
4. Research preview cards.
5. Featured publication band.
6. Footer with contact and admin link.

The product additionally exposes `/research`, `/publications`, `/people`, `/join`, and `/admin`. There are no Media or Software routes.

## Layout and ownership

- Public pages use a shared `SiteHeader` and `SiteFooter`.
- Public content is server-rendered from `GET /api/public/home`; if the API is unavailable, a local seed snapshot keeps the page recognizable during development.
- Hero controls are client-side because they own the slideshow timer and current slide.
- Admin is a client-side application shell backed by JWT-protected API routes.
