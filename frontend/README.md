# Frontend — Headless BFF

React 19 + Vite 7 + TypeScript SPA. Calls the BFF at `/api/v2/*` for all
upstream Eightfold data; cookie-based auth, no client-held tokens.

For full architecture + auth flow + env setup see the top-level
[README.md](../README.md).

## Prerequisites

- Node 22+
- pnpm 10+

## Quick start

From `frontend/`:

```bash
pnpm install
pnpm run dev   # dev server on :5173 with /api proxy to backend :8000
```

## Commands

```bash
pnpm run build              # tsc + vite build
pnpm run lint               # ESLint, zero-warning policy
pnpm run lint:fix           # ESLint autofix
pnpm run format             # Prettier
pnpm run test               # all tests (unit + e2e)
pnpm run test:unit          # vitest watch
pnpm run test:e2e           # playwright e2e
pnpm vitest run path/file   # single test file
```

## Layout

- `src/main.tsx` -> `App.tsx` -> TanStack Router (`src/routes/`)
- `src/routes/` — file-based routes; default landing at `routes/index.tsx`
- `src/features/auth/` — `useAuthSession()` cookie session hook
- `src/features/identity/` — optional email -> profile id resolver
- `src/features/eightfold-api/` — 40 prebuilt entity hooks (employees,
  profiles, etc.) generated from `api-catalog.json` via `_generator/`
- `src/components/ui/` — shadcn primitives
- `src/components/ef-design-system.ts` — barrel re-export of the kept
  primitives
- `src/components/{layout,shared,forms,charts,theme}/` — composable bits
- `src/store/` — Zustand stores (theme, identity)
- `src/tokens/`, `src/styles/` — design tokens + Tailwind 4 wiring

## Stack

- React 19 / TypeScript 5.9 strict / Vite 7
- TanStack Router (file-based) + TanStack Query
- Zustand
- shadcn/ui + Tailwind CSS 4 + Lucide icons
- react-i18next
- Vitest + RTL (unit), Playwright (e2e)

## Vite proxy

`vite.config.ts` proxies `/api` to `http://localhost:8000` by default.
Override with `VITE_API_PROXY_TARGET=http://localhost:8080 pnpm run dev`
when your backend runs on a different port.

## License

Original boilerplate © RicardoValdovinos under MIT — see [LICENSE](LICENSE).
