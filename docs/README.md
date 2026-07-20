# Stock Dashboard — Wiki

Internal documentation for how this project is built, organized, and run. 

For how to *use* the app, see the [main README](../README.md).

## Pages

1. **[Architecture & Infrastructure](./01-architecture.md)** — the stack, hosting, how the pieces talk to each other, environment variables.
2. **[File Map](./02-file-map.md)** — what every source file does and what it depends on.
3. **[Database Schema](./03-database-schema.md)** — every table, column, relationship, RLS policy, and known issues.
4. **[Design System](./04-design-system.md)** — fonts, colors, spacing, and the CSS conventions used throughout.
5. **[Features](./05-features.md)** — how each part of the app works, screen by screen.
6. **[API Reference](./06-api-reference.md)** — every backend endpoint, params, and response shape.
7. **[Build History & Decisions](./07-history.md)** — how the app got here, major refactors, and why things are the way they are.

## Quick facts

| | |
|---|---|
| Frontend | React 19 + Vite, plain CSS (no Tailwind/CSS-in-JS) |
| Backend | FastAPI (Python), stateless, no database driver — reads Yahoo Finance live on every request |
| Database & Auth | Supabase (Postgres + built-in auth) |
| Hosting | Vercel (frontend static build + Python serverless function for `/api/*`) |
| Data source | Yahoo Finance via the `yfinance` Python library |
