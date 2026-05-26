# TimeForSchool API

TypeScript API for NEIS school data (school info, classes, lunch, schedule) and Comcigan timetables.

Production: https://api.timefor.school

Built with [Elysia](https://elysiajs.com). Interactive reference UI is [Scalar](https://scalar.com) (via [`@elysiajs/openapi`](https://elysiajs.com/plugins/openapi)).

## Monorepo

| Package | Path | Description |
|---------|------|-------------|
| `timeforschool-api` | repo root | HTTP API (`src/`) |
| `@timeforschool/client` | `packages/client/` | NEIS + Comcigan client library |

Use the client standalone:

```ts
import { NeisClient, fetchTimeTable } from "@timeforschool/client";
```

See [packages/client/README.md](packages/client/README.md).

## API documentation

OpenAPI is generated from Elysia route definitions in `src/app.ts` (thin controllers) and Typebox models in `src/schemas/`. Business logic lives in `src/services/`. [`@elysiajs/openapi`](https://elysiajs.com/plugins/openapi) exposes the spec and a browser UI.

The default UI **provider is Scalar** (`provider: 'swagger-ui'` is available if you need the legacy UI).

| Resource | URL |
|----------|-----|
| Scalar API Reference | `/docs` |
| OpenAPI 3 JSON | `/docs/json` |
| Service metadata | `GET /` |

Production docs: https://api.timefor.school/docs

Tags in the sidebar (Meta, School, Classes, …) come from `documentation.tags` and each route’s `detail.tags`. Customize the Scalar shell (theme, layout, `servers`, etc.) with the plugin’s `scalar` option — see [Scalar API Reference configuration](https://scalar.com/products/api-references/configuration).

## Setup

```bash
npm install
```

Copy `.env.example` to `.env.local` for local overrides.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEIS_API_KEY` | No | NEIS API key (falls back to bundled sample key) |
| `PORT` | No | Local dev port (default `8000`) |

## Development

```bash
npm run dev
```

- App: http://localhost:8000  
- Scalar docs: http://localhost:8000/docs  
- OpenAPI JSON: http://localhost:8000/docs/json  

Preview with the Vercel dev server (same zero-config Elysia detection as production):

```bash
npx vercel dev
```

## Error responses

Errors use a consistent JSON shape and HTTP status code:

```json
{
  "ok": false,
  "error": {
    "code": "SCHOOL_NOT_FOUND",
    "message": "No school matched the given identifier.",
    "details": { "schoolname": "..." }
  }
}
```

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Invalid or missing query parameters |
| `CONFLICTING_SCHOOL_PARAMS` | 400 | Both `schoolname` and `schoolcode` sent |
| `MISSING_SCHOOL_IDENTIFIER` | 400 | Neither `schoolname` nor `schoolcode` sent |
| `SCHOOL_NOT_FOUND` | 404 | NEIS has no matching school |
| `NEIS_DATA_NOT_FOUND` | 404 | NEIS returned no rows for the date range |
| `TIMETABLE_INVALID_GRADE_CLASS` | 404 | No Comcigan data for grade/class |
| `TIMETABLE_AMBIGUOUS_SCHOOL` | 409 | Multiple Comcigan matches—use `schoolcode` |
| `NEIS_UPSTREAM_ERROR` | 502 | NEIS API failure |
| `TIMETABLE_UPSTREAM_ERROR` | 502 | Comcigan fetch/parse failure |
| `INTERNAL_ERROR` | 500 | Unexpected error |

## Endpoints

| Route | Description |
|-------|-------------|
| `GET /` | Service metadata and doc links |
| `GET /school` | School info (`schoolname`) |
| `GET /classes` | Class numbers (`grade`, `schoolname` or `schoolcode`) |
| `GET /timetable` | Weekly timetable (`grade`, `classno`, `week`, `schoolname` or `schoolcode`) |
| `GET /lunch` | Meal menus (`startdate`, `enddate`, `schoolname` or `schoolcode`) |
| `GET /schedule` | School calendar (`startdate`, `enddate`, `schoolname` or `schoolcode`) |

**School identifier:** pass exactly one of `schoolname` or `schoolcode` (7-digit NEIS code).

**Dates:** `YYYYMMDD` (e.g. `20250526`).

## Scripts

- `npm run build` — build `@timeforschool/client`, then compile API to `dist/`
- `npm run build:client` — build client package only
- `npm start` — run compiled server (`node dist/server.js`)
- `npm test` — structural smoke tests

## Deploy to Vercel

Follow [Deploy Elysia on Vercel](https://elysiajs.com/integrations/vercel):

1. **Default-export** the Elysia instance from `src/app.ts` (already `export default app`).
2. Import the repo in [Vercel](https://vercel.com/new) and deploy — no `api/` folder or framework block in `vercel.json` is required for detection.
3. Set `NEIS_API_KEY` for Production.

```bash
npx vercel link
npx vercel env add NEIS_API_KEY
npx vercel deploy --prod
```

This project uses **Node** with `"type": "module"` in `package.json`. To deploy on the **Bun** runtime instead, add `"bunVersion": "1.x"` to `vercel.json` per the Elysia guide.

Local entry for `npm run dev` is `src/server.ts`, which calls `app.listen()`. Vercel only needs the default export from `src/app.ts`.
