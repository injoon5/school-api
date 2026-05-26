# TimeForSchool API

TypeScript API for NEIS school data (school info, classes, lunch, schedule) and Comcigan timetables.

Production: https://api.timefor.school

Built with [Elysia](https://elysiajs.com).

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

## Documentation

| Resource | URL |
|----------|-----|
| Interactive docs (Swagger UI) | `/docs` |
| OpenAPI JSON | `/docs/json` |
| API info | `GET /` |

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

Open http://localhost:8000/docs for the interactive API reference.

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
- `npm start` — run compiled server
- `npm test` — structural smoke tests

## Deploy to Vercel

Vercel detects Elysia when `src/app.ts` default-exports the app.

1. Import the repo in [Vercel](https://vercel.com/new).
2. Set `NEIS_API_KEY` for Production.
3. Deploy.

```bash
npx vercel link
npx vercel env add NEIS_API_KEY
npx vercel deploy --prod
```

Elysia is detected from `src/app.ts` (default export). No `api/` routes required.
