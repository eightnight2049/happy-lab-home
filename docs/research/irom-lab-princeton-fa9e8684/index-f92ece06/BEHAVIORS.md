# Behavior bible

## Header

- Interaction model: sticky + click-driven mobile navigation.
- Reference: `position: sticky`, `top: 0`, `z-index: 100`, translucent background and backdrop blur.
- Product behavior: desktop nav remains inline. Below 980px it collapses into a menu button; the menu opens below the header and closes after a link is selected.

## Hero

- Interaction model: time-driven slideshow plus click-driven controls.
- Reference: a video/photograph playlist with pause, previous, next, and position indicator. Controls are centered along the bottom edge.
- Product behavior: five image layers rotate every 6.5s. Pause freezes the timer; previous/next wrap around and update the live position label.
- Hover state: controls change to accent red and scale to `1.06`.

## News

- Interaction model: static list with click-driven progressive disclosure.
- Product behavior: first four items are shown initially. If more items exist, “Show more news” reveals the rest and changes to “Show less news”.

## Publications

- Interaction model: click-driven filter chips and text search.
- Product behavior: filtering is client-side and groups results by descending year. Each row exposes optional project, PDF, code, and video links.

## Admin

- Interaction model: authenticated tabs and forms.
- Admin: settings, publishing, users, roles, and uploads.
- Editor: settings and all public content; no user management.
- Contributor: own profile plus draft submissions for news/publications; cannot publish.

## Responsive sweep

- Desktop (1440px): horizontal nav, three-column research cards, two-column profile card.
- Tablet (768px): mobile navigation, research and join content stack, admin metrics reduce to two columns.
- Mobile (390px): 16px page gutters, 14px hero radius, hero controls shrink to 36px circles, news rows use a 72px date column, profile and admin forms stack.
