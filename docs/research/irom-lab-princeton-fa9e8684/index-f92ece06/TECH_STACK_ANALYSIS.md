# Technical stack analysis

## Reference

- Static HTML/CSS/JavaScript with Open Sans and JetBrains Mono.
- Hero media is a video playlist with an image fallback.
- Content is injected from site configuration files.

## Product implementation

- Next.js 16 App Router + React 19 for the public site and admin shell.
- Tailwind CSS v4 import with namespaced, reference-matched CSS tokens.
- Lucide React for interface icons.
- FastAPI + SQLAlchemy + PostgreSQL for content and identity APIs.
- JWT sessions; scrypt password hashes using Python's standard library.
- Multipart uploads stored in a Docker volume and served by FastAPI at `/media`.
- Caddy reverse proxies `/api`, `/media`, and the public Next.js app on local port `8080`.
